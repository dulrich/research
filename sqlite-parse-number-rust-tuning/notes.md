---
created: 2026-11-10
---

# Notes: can Rust match the fast C `parse_number()`?

## Goal

Follow-up to [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust). That investigation found the optimised C extension (`c-fast`) was ~2× faster than the Rust versions and 20× smaller (14 KB vs ~300 KB). Its notes listed three Rust ideas it didn't take all the way: `#![no_std]`, an inline fast path like `c-fast`'s, and a stack buffer instead of the per-call `Vec`. This investigation tries all three and measures how close Rust gets.

## Environment

Everything builds and runs inside the Docker image defined in `Dockerfile` (`docker compose build`):

- Base image `rust:1.99.1-slim-trixie` (rustc 1.99.1, Debian 13)
- gcc 14.2, `libsqlite3-dev` (SQLite 3.46.1 headers), `python3` 3.13 with its `sqlite3` module (SQLite 3.46.1), `libclang-dev` (needed by sqlite-loadable's bindgen), `binutils`, `git`
- The upstream investigation is fetched at commit `aa4e39e` and its four extensions are rebuilt with upstream's own commands
- Host: AMD Ryzen 9 7900X; the compose service is pinned to one core (`cpuset: "4"`)

## Approach

One new crate, `rust-raw/`, with no dependencies at all. Instead of rusqlite or sqlite-loadable it uses the `sqlite3_api_routines` function table that SQLite passes to an extension's entry point, the same way a C extension's `SQLITE_EXTENSION_INIT2` does. The slot indices were taken with `offsetof()` from `sqlite3ext.h`; SQLite only appends to this table, so they are stable.

Two cargo features give four builds:

- `nostd`: `#![no_std]`, using `core` only, with a panic handler that calls `abort`.
- `fast`: a port of `c-fast`'s single pass. Integers are built directly, and decimals with ≤ 2^53 significand and ≤ 22 fractional digits use one exact division (Clinger's fast path). Without it, the cleaned text is copied to a buffer and parsed with `str::parse`, which is the upstream Rust algorithm.

Every build uses a 128-byte stack buffer, falling back to `sqlite3_malloc` for longer inputs; there is no per-call `Vec`. `core`'s `str::parse::<f64>` is available without `std`, so even the `no_std` build keeps Rust's correctly rounded float parser. That parser is also the slow-path fallback in `fast`, where `c-fast` uses `strtod`, so this fallback doesn't depend on the locale.

The upstream `test.py` / `fuzz.py` / `bench.py` are used unchanged except for `harness.patch`, which adds the four new builds to their extension lists.

## Log

- The first `load_extension` failed with `undefined symbol: sqlite3_std_init`, because SQLite derives the entry-point name from the file name. Each build now goes to `rust-raw/<variant>/libparse_number.so`.
- All 8 extensions pass the 40 hand-written cases.
- Size: the `std` build with raw FFI is still 289 KB, about the same as sqlite-loadable (291 KB) and rusqlite (314 KB). So the wrapper crates are not what makes Rust big; `std` is.
- `no_std`: 23.3 KB (23.6 KB with `fast`). It imports only `abort`, `memcpy` and `memset`, and it has no `NEEDED` libraries, not even libc. Those symbols come from the host process at load time.
- Where the remaining ~23 KB goes: 12.4 KB of `.rodata`, of which 10.4 KB is core's `POWER_OF_FIVE_128` table for Eisel-Lemire, plus 3.3 KB of `f64::from_str` code. The C versions don't carry a float parser; they call glibc's `strtod`.
- `opt-level = "s"` / `"z"` on the `no_std` builds: 22.8–23.0 KB. That's not worth it, because the table sets the floor.
- Fuzz: 4 seeds × 500k × 8 extensions, no mismatches (`results/fuzz.txt`).
- Benchmarks (`results/bench_*.txt`), net ns/row, mixed / int / real:
  - c-fast 9.2 / 7.0 / 9.9
  - raw-std 14.5 / 10.7 / 17.8: just removing the wrapper and the `Vec`
  - raw-fast 9.5 / 7.0 / 11.7: ties c-fast
  - raw-nostd-fast 7.9 / 5.5 / 8.7: beats c-fast on all three
  - rusqlite 23.7 / 18.2 / 28.3; sqlite-loadable 25.7 / 18.5 / 27.6
- A repeat of mixed matched within 0.5 ns, so the 1.5 ns gap between raw-fast and raw-nostd-fast is real. Its cause is unmeasured: the parsing code is identical, and I suspect code layout or inlining differences between the two link configurations.
- Upstream numbers on a 2 vCPU VM were ~2× ours; the plain C / c-fast / Rust ordering held, with rusqlite and sqlite-loadable swapping places.

## Round 2: the three follow-ups

Three follow-ups: `strtod` for the slow path, why `no_std` is faster, and how much `unsafe` is actually needed.

- **`strtod` (`rust-raw` feature `strtod`, implies `fast`)**: the slow path NUL-terminates the stack buffer and calls libc's `strtod`. With `nostd`: **6,072 B** (`size`: 3.4 KB), importing only `abort` and `strtod`; `memcpy`/`memset` are gone too. It's smaller than c-fast's 14,224 B, which is mostly gcc's page-aligned layout. Speed is the same as `nostd,fast` because the slow path is rare. Its slow path depends on the locale, just like c-fast's.
- **Why `no_std` is faster**: perf isn't usable here (not installed, and `perf_event_paranoid=3`), so I compared disassembly. Unstripped `fast` vs `nostd,fast`: `parse_number_func` is 245 vs 243 instructions, identical apart from address constants and two `lea`s on the cold panic path. The function starts at offset 48 mod 64 in the `std` build and 32 in the `no_std` one. For an A/B test, I built both with `-C llvm-args=-align-all-functions=6 -C llvm-args=-align-loops=64`, and the gap closed (mixed 8.8 vs 8.9, repeat 8.6 vs 8.7; int 6.2 vs 5.8; real 9.7 vs 9.5). It's code placement, not `std`. The aligned builds are not the fastest, either: unaligned `nostd,fast` happened to land on a better placement (7.6–7.9 mixed). Lesson: differences under about 2 ns here are layout noise. Even `raw-fast` itself measured 9.5, 10.6 and 9.6 on mixed across three image builds.
- **Minimising `unsafe` (`rust-safe/`)**: the same fast algorithm, with the parser in its own module under `#![forbid(unsafe_code)]`. It uses slice patterns for trimming, `slice::Iter` for the loop (`as_slice().first()` for the `£` lookahead), `i64::try_from` for the range check, and `Vec` + `str::parse` on the slow path. `lib.rs` holds every `unsafe`, about 30 lines under `#![deny(unsafe_op_in_unsafe_fn)]`, each with a SAFETY comment: `slot()` (an `unsafe fn`), the `xFunc` body (deref `argv`, `from_raw_parts` for the text), the entry point, and with `nostd` a `GlobalAlloc` over `sqlite3_malloc`/`sqlite3_free` (refusing alignment > 8) plus `abort` in the panic handler. `static mut` became an `AtomicPtr`.
  - Results: safe `std` 8.0 / 5.5 / 9.4 and safe `nostd` 8.0 / 5.5 / 9.3 (repeat mixed 8.4 / 7.9), against c-fast 9.9 / 5.8 / 9.6. Sizes: 289,424 B and 24,912 B.
  - Safe code costs nothing measurable here. `std` vs `nostd` makes no speed difference, only a size difference.
- All 13 extensions: 40/40 tests; fuzz 4 seeds × 500k × 13 with no mismatches. The `strtod` builds match too, because SQLite runs in Python's C numeric locale.
- One mistake on the way: the regenerated `harness.patch` again had `a/a/` paths from `git diff --no-index` run on nested directories, so the image build failed at `git apply` until I fixed them.

## Not done

- Getting the safe crate down to strtod size without giving up locale independence would need a smaller correctly rounded slow path, e.g. a simple big-decimal algorithm instead of core's Eisel-Lemire tables. That's possible, but it's a lot of code for a path money data never takes.
- Confirming the placement explanation with hardware counters (frontend stalls / DSB misses) on a machine where perf is allowed.

## Round 3: can c-fast shrink?

The round-2 claim that Rust `nostd,strtod` (6,072 B) is smaller than `c-fast` (14,224 B) was never checked against flag parity, so I built size-only variants (a new last Dockerfile stage; `results/sizes_round3.txt`).

- gcc's default `-O2 -s` build is 14,224 B but only 3,134 B of `size` content. `-Os` alone changes nothing on disk (still 14,224 B), because the file is padding.
- `-Wl,-z,noseparate-code` alone: 6,032 B. GNU ld's default `separate-code` puts each LOAD segment on its own 4 KB file offset.
- rustc links with its bundled LLD 23.1.1 (`-C link-arg=-Wl,--version` prints it). `readelf -l` shows LLD packs the segments at unaligned file offsets, so the Rust file never paid that padding. `c-fast` linked with the same LLD (`gcc -B<gcc-ld dir> -fuse-ld=lld`): 5,784 B, already smaller than Rust's 6,072 B.
- All size flags (`noseparate-code`, `--build-id=none`, `-z norelro`, `--hash-style=gnu`, no unwind tables, `-ffunction-sections -fdata-sections --gc-sections`, strip `.comment`/`.note.gnu.property`): `c-fast` 4,752 B at `-O2`, 4,560 B at `-Os`, 5,008 B with LLD. The same link flags plus the same strip on Rust `nostd,strtod`: 5,456 B. `-C force-unwind-tables=no` changed nothing (panic=abort already has none), and `opt-level=s` saved another 64 B.
- Conclusion: with the linkers matched, C is ~0.3 KB smaller (5,784 vs 6,072 B), and with every size flag on both, ~0.7–0.9 KB smaller. The headline and findings in the README are corrected. These builds were only measured for size, not speed.
- Also noticed while preparing the next round: on this host, run-to-run spread of `bench.py mixed` for `c-fast` on one pinned core is 8.2–10.7 ns across three runs while other work loads the machine. That is the same scale as the ±1.5 ns placement effect from round 2, so the earlier "differences under ~2 ns are noise" caveat stands.

## Round 4: re-measuring the speed claims to the measurement standard

Rounds 1-3 timed with upstream's `bench.py`: one build per variant, fastest of 15 alternating runs, one process, no noise floor. Round 2 had already found that code placement moves results by about ±1.5 ns, so round 4 re-measures the sub-3 ns claims under [the repository's timing standard](../methods/timing.md) (R1-R11), on a second, quiet machine instead of the shared workstation.

### Method

- **Machine:** a second, quiet machine (Intel Core i7-5600U laptop, 2 cores / 4 threads, Debian 13, kernel 6.12, Docker 29.9.3, wired network, on AC power). The host-side driver (`scripts/measure.mjs`, build `0813579eb401f83aac842b3e68a1106f93c15f86-dirty`) ran on the workstation and reached the machine only over ssh; every timed invocation and the environment probe ran there. The image was built on that machine (`sha256:bcb5c9f95d78...`). Absolute numbers are not comparable with rounds 1-3 (a Ryzen 9 7900X at boost clocks): this laptop is about 2.5-3× slower per row.
- **Tuning (user-consented, applied through a short-lived privileged container, restored afterwards):** governor `performance` on all CPUs (was `schedutil`); `intel_pstate/no_turbo=1` (was 0); CPU 3 offline, the SMT sibling of benchmark CPU 2 (was online); `kernel.perf_event_paranoid=2` (was 3); stopped `unattended-upgrades`, `smartmontools`, `cron` and `iwd` (all four were active). The ssh path used the wired interface (default route via the Ethernet port, Wi-Fi metric higher), so stopping `iwd` could not cut the session. `ssh`, `systemd-networkd`, `systemd-resolved`, `docker`, `containerd` and `dbus` were never touched, and the machine was not rebooted.
  - Read-back after apply: governors 3× `performance` (CPU 3 offline), `no_turbo=1`, online CPUs 0-2, `perf_event_paranoid=2`, the four services `inactive`, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`.
  - Read-back after restore (after all runs): governors 4× `schedutil`, `no_turbo=0`, CPU 3 online (online 0-3), `perf_event_paranoid=3`, the four services `active` again.
  - The benchmark container is pinned to CPU 2 (`--cpuset-cpus 2`), whose sibling is offline. `intel_pstate` runs in passive mode (`intel_cpufreq` driver); there is no EPP or HWP.
- **Per invocation** (`measure_one.py`, added by `harness.patch`): build a 200,000-row dataset (the same generator as `bench.py`, seeded, so every invocation sees the same rows), load one extension, 5 in-process warm-up runs of both queries, then 15 timed iterations of `select sum(parse_number(v)) from t` interleaved with the baseline `select sum(length(v)) from t` (alternating which goes first). `MEASURE ns_per_row` is the median over the 15 iterations of the net per-row time. Rows are 200,000 instead of upstream's 2,000,000, only to fit the ~5 s per-invocation budget; the per-row time was the same at 200,000 and 500,000 rows in a spot check (about 30 ns for `c-fast` mixed).
- **Instructions** (secondary metric, R10): with `MEASURE_PERF=1` the process starts `perf stat -e instructions:u -p <its own pid> --delay -1 --control fd:...` once for the query and once for the baseline, enables it just before 3 timed runs and disables it just after, and prints `MEASURE instr_per_row` net of the baseline. Setup, warm-up and process start are never counted. Check of that attribution (one build, `int`): the same invocation with the dataset built 3 extra times first printed 165.0258 and 165.0257 instr/row (unchanged), while a whole-process `perf stat` over the same two runs rose from 18.5 to 33.5 billion instructions. The counters needed `--cap-add PERFMON` only (with `perf_event_paranoid=2`); `SYS_ADMIN` was not needed.
- **Layouts (R5):** each compared variant has 3 builds: Rust `-C llvm-args=-align-all-functions={4,5,6} -C llvm-args=-align-loops={16,32,64}`, C `-falign-functions={16,32,64} -falign-loops={16,32,64}` (suffix `-a16`, `-a32`, `-a64` = loop alignment in bytes). The 6 logical variants are `c-fast`, `raw-fast`, `raw-nostd-fast`, `raw-nostd-fast-strtod`, `safe-std`, `safe-nostd`, 18 builds. The report pools the 3 layout builds of each variant and resamples layouts first, invocations second. `test.py` passes 40/40 for all 18 new layout builds along with the original 13 (a fuzz run was skipped: alignment flags change no semantics).
- **A/A (R7):** a second group `c-fast-copy` runs the same three `c-fast` builds under other names, so the A/A ratio has the same layout-pooled structure as the comparisons. (The brief's minimal version was a single duplicated build; pooling avoids understating the floor.)
- **Protocol:** per dataset 3 warm-up rounds discarded, then 30 measured invocations of every build (90 per variant; 21 builds × 33 rounds = 693 invocations per dataset), each round in a fresh seeded random order (seed 20261110), `MEASURE_PAD` 0-4096 bytes per invocation, ASLR on.
- **Pilot and final counts:** the count was fixed in the committed config before the main run. The pilot (`results/round4/pilot/`, mixed only, seed 1, 1 warm-up + 5 measured invocations per build) only checked the pipeline end to end (no failures, instruction counts deterministic, ~5.4 s per invocation of which ~3 s is the ssh session setup on this machine) and is excluded from all inference. The final run uses 30 per build, the standard's minimum (R1); the pilot did not change it. No dataset was re-run. Reference pacing for this machine: ~5.4 s per invocation (~2.2 s in the container, ~3 s ssh session setup), 693 invocations and ~61 min per dataset, ~3.1 h for pilot plus three datasets.
- Each dataset has its own config (`measure-mixed.json`, `measure-int.json`, `measure-real.json`; the dataset is an argv element) and its own output directory under `results/round4/`. Besides `report.md` (every group against `c-fast`), `report-vs-raw-nostd-fast.md` and `report-vs-safe-nostd.md` are the same data re-reported against those two baselines, for the Rust-vs-Rust comparisons.

### Results

Net ns per row, median over invocations with the layout-pooled 95% CI (full tables in `results/round4/<dataset>/report.md`). A/A ratio and CI: mixed 1.004 [0.947, 1.060]; int 1.001 [0.958, 1.049]; real 1.000 [0.929, 1.081].

| Variant | Mixed | Integers | Decimals |
|---|---|---|---|
| c-fast | 29.37 [28.29, 30.25] | 24.55 [23.64, 24.91] | 37.48 [35.25, 38.18] |
| raw `fast` | 25.69 [25.52, 26.13] | 18.51 [18.03, 19.26] | 31.91 [31.50, 32.28] |
| raw `nostd,fast` | 23.64 [23.46, 23.96] | 18.05 [16.50, 18.17] | 30.08 [29.78, 30.69] |
| raw `nostd,strtod` | 24.00 [22.79, 26.15] | 17.95 [17.67, 18.51] | 30.07 [29.21, 31.92] |
| safe `std` | 27.16 [24.24, 29.52] | 20.85 [20.48, 21.44] | 32.24 [30.97, 33.37] |
| safe `nostd` | 25.88 [25.70, 26.10] | 20.18 [19.55, 20.34] | 32.44 [32.12, 32.60] |

Ratio to `c-fast` (95% CI; every row but one passes the claim rule: CI excludes 1 and the effect exceeds the A/A half-width, which is 0.057 / 0.046 / 0.076):

| Variant | Mixed | Integers | Decimals |
|---|---|---|---|
| raw `fast` | 0.875 [0.848, 0.917] | 0.754 [0.727, 0.808] | 0.852 [0.830, 0.908] |
| raw `nostd,fast` | 0.805 [0.780, 0.838] | 0.735 [0.666, 0.764] | 0.803 [0.783, 0.865] |
| raw `nostd,strtod` | 0.817 [0.761, 0.917] | 0.731 [0.713, 0.778] | 0.802 [0.769, 0.896] |
| safe `std` | 0.925 [0.812, 1.033] (no measurable difference) | 0.849 [0.827, 0.896] | 0.860 [0.817, 0.941] |
| safe `nostd` | 0.881 [0.854, 0.918] | 0.822 [0.791, 0.856] | 0.866 [0.846, 0.921] |

Rust-vs-Rust comparisons (ratio of the first to the second):

| Comparison | Mixed | Integers | Decimals |
|---|---|---|---|
| raw `fast` / raw `nostd,fast` | 1.087 [1.072, 1.108] slower | 1.026 [0.996, 1.158] none | 1.061 [1.032, 1.077] none (effect below the 0.076 floor) |
| raw `nostd,strtod` / raw `nostd,fast` | 1.015 [0.961, 1.108] none | 0.995 [0.976, 1.115] none | 1.000 [0.958, 1.064] none |
| safe `std` / safe `nostd` | 1.050 [0.936, 1.142] none | 1.033 [1.011, 1.083] none (effect below the 0.046 floor) | 0.994 [0.955, 1.033] none |
| safe `nostd` / raw `nostd,fast` | 1.095 [1.079, 1.109] slower | 1.118 [1.082, 1.227] slower | 1.078 [1.052, 1.093] slower (effect barely above the 0.076 floor) |

Instructions retired per row (net of baseline; they vary only with layout, so their CIs are narrow and the A/A floor is about 1e-6): `c-fast` 185.1 / 165.0 / 249.5 (mixed / int / real), raw 186.9 / 170.0 / 250.5, safe 190.6 / 173.9 / 257.4. So `c-fast` retires the fewest instructions and is still the slowest build: the speed ordering is not an instruction-count ordering (this round did not investigate why). The alignment padding shows up as retired no-ops: the same code at `-a16`, `-a32` and `-a64` differs by up to 2.7 instr/row.

Placement band (mixed, per-build medians, ns/row): `c-fast` 28.3-30.3; raw `fast` 25.5-26.2; raw `nostd,fast` 23.5-24.0; raw `nostd,strtod` 22.8-26.2; safe `std` 24.2-29.5; safe `nostd` 25.8-26.1. The same safe `std` code spans 5.3 ns across its three alignments, which is the same kind of effect round 2 found, larger on this machine (it is slower in absolute terms).

### What changed relative to the old README

- "Rust fast path matches `c-fast`'s speed" became "faster than `c-fast` on this machine": 12-27% less time per row for every Rust variant in every dataset, except `safe std` on mixed (no measurable difference). In round 1 the rust builds were 1-2 ns *ahead* of `c-fast` on the Ryzen too, but that gap was inside the placement band; here it survives the claim rule.
- "`no_std` doesn't make the code faster; placement does" is no longer supported for mixed: raw `fast` is 8.7% [7.2%, 10.8%] slower than raw `nostd,fast` with layouts pooled, and the gap is there at every one of the three alignments (a16 25.5 vs 23.5, a32 25.7 vs 23.5, a64 26.2 vs 24.0 ns). Forcing alignment did not erase it. On integers and decimals there is no measurable difference. `safe std` vs `safe nostd` shows no measurable difference in any dataset, as before.
- "`unsafe` in `rust-raw`'s parser bought nothing measurable" is no longer supported: safe `nostd` is 8-12% slower than raw `nostd,fast` in all three datasets (the decimals effect only just clears the floor). The safe crates are still faster than `c-fast`.
- "`strtod` leaves speed unchanged" holds: no measurable difference in any dataset.
- Not re-measured (still upstream-harness numbers, labelled so in the README): plain C, rusqlite, sqlite-loadable, raw `std`, raw `nostd`, and the two 64-byte-aligned raw builds.

### Replication and deviations

- No replication run was made; no result was re-run (R9). Diagnostics only, no pass condition: the A/A CI contains 1 in all three datasets; the Rust builds' lead over `c-fast` in round 4 is larger than in round 1 (e.g. mixed raw `nostd,fast` / `c-fast` 0.80 here versus 7.6 / 9.9 = 0.77 there, within the CI of each given their different machines).
- Deviations from the standard and the brief: 200,000-row datasets (not 2M); invocation timing includes ~3 s of ssh session setup per run that no metric contains; A/A uses a 3-layout copy of `c-fast` rather than one build; one config per dataset (`measure-<dataset>.json`) instead of a single `measure.json`; `env.json` holds no Docker image id (recorded above), and its `hostname` fields were replaced by `{host}`; `smt_active` in `env.json` reads `1` because the machine has SMT on in general, the pinned CPU's `thread_siblings_list` is `2` alone (sibling offline).
- Instruction counts exist per build but the report's claim rule on them is degenerate (an A/A floor near zero makes every 0.5% difference "slower"); instructions are reported as secondary, never as a speed claim.

## Round 5: like-vs-like C/Rust on GCC and LLVM, both at their ceiling

### Toolchain image and builds (log)

Goal of round 5: C and Rust each on both compiler backends (GCC, LLVM), each pushed to its ceiling (`-O2`, `-O3`, PGO, LTO where it exists), generic `x86-64` target throughout. This section records the toolchain and build work; screening and the claim run follow.

- **Toolchains** (`results/round5/toolchains.txt`): the existing image gains clang-23 / llvm-23 / `libclang-rt-23-dev` (23.1.6, from the LLVM project's apt repository for Debian trixie; the same LLVM major as rustc 1.99.1's 23.1.1) and the rustup nightly `nightly-2026-11-10` (rustc 1.102.0-nightly, LLVM 23.1.5) with components `rustc-codegen-gcc-preview`, `gcc-x86_64-unknown-linux-gnu` and `llvm-tools-preview`. The GCC backend is selected per build with `RUSTFLAGS=-Zcodegen-backend=gcc`. C on GCC is Debian gcc 14.2; the libgccjit the Rust GCC backend uses reports itself as GCC 17.0.0 (`gcc_jit_version_major`), three majors apart, so Rust-on-GCC against C-on-GCC is not the same compiler release (the plan's caveat threshold is more than one major).
- **Matrix** (`results/round5/variants.txt`, 186 builds = 31 variants x 6 layouts): C (the `c-fast` source) with gcc and clang-23 at `-O2`, `-O3`, `-O3`+PGO (LTO excluded: one translation unit, nothing to merge); Rust raw `fast` and safe, each as `std` and `nostd`: GCC backend at opt-level 2, 3 (no LTO), LLVM backend at 2+LTO, 3+LTO, 3 without LTO (the backend-axis control) and 3+LTO+PGO; plus the round-4 anchor re-built with the stable toolchain (`raw-nostd-stable-llvm-o3-lto`, 1.99.1, opt-level 3 + LTO). Names: `<cell>-<backend>-<O|o><level>[-lto|-nolto][-pgo]-L<k>`, e.g. `c-clang-O3-pgo-L2`, `raw-nostd-llvm-o3-lto-L0`. The round-4 builds and `layouts/` are untouched; round-5 builds sit under `/work/r5/<variant>-L<k>/parse_number.so`, the unstripped link beside it.
- **Exclusions** (recorded, not dropped): the four Rust GCC-backend PGO variants (`raw`/`safe` x `std`/`nostd`, opt-level 3). Measured: `rustc_codegen_gcc` accepts `-Cprofile-generate` and links the LLVM profiler runtime (68 `llvm_profile` symbols in the `.so`), but the generated code carries no counters, so running the instrumented build writes no profile. For safe `nostd` the instrumented library does not even load (`_Unwind_Resume` undefined; the runtime pulls it in). The GCC backend has no PGO path here; C-on-GCC PGO uses GCC's own `-fprofile-generate`/`-fprofile-use`.
- **LTO.** `CARGO_PROFILE_RELEASE_LTO=false` for every non-LTO build (thin LTO crashes rustc on the GCC backend; the LLVM no-LTO control uses the same setting). The release profiles hard-code `opt-level = 3` / `lto = true`, so each build overrides `CARGO_PROFILE_RELEASE_OPT_LEVEL` / `_LTO`.
- **`eh-stub` feature** (new, in both crates, default off): `nostd` without LTO leaves `rust_eh_personality` undefined on both backends (the precompiled `core` references it). The feature adds a no-op `rust_eh_personality`; the crates abort on panic, so it is never called. It is enabled only for `nostd` non-LTO builds; LTO builds and all round-4 builds compile the same code as before.
- **Layout method (one for all four cells, no compiler alignment flag).** A pad object of `16*k` zero bytes (k = 0..5) is linked ahead of the code in section `.text.unlikely` (flags `axR`: executable and `SHF_GNU_RETAIN`, otherwise lld's `--gc-sections` drops it). `.text.unlikely` is the first text input section in GNU ld's default order, so the pad precedes the hot function even when PGO moves that into `.text.hot`; in my first attempt with a plain `.text` pad, gcc PGO builds did not move at all. For Rust the pad must be first on the link line (lld orders by command-line position): `-Zpre-link-arg=<pad.o>` (a plain `-C link-arg` lands after the crate's own object; the stable anchor is built with `RUSTC_BOOTSTRAP=1` to allow that flag, nothing else changes). Verification (`results/round5/layouts.txt`): the address of `parse_number_func` (from the unstripped link's symbol table) modulo 64 takes 4 distinct values (the maximum, since functions are 16-byte aligned and the pad moves in 16-byte steps) in every variant's 6 layouts; the stripped `.so` has the same loaded segments as the unstripped one (checked per build). The two extra layouts (k = 4, 5) repeat the mod-64 values of k = 0, 1 at a different absolute address. Deviation: none; every cell uses the uniform method.
- **PGO.** `pgo_train.py` loads the instrumented build and runs `sum(parse_number(v))` over mixed, int and real datasets (100,000 rows each, 5 runs each, own seed 20261111, distinct from `measure_one.py`'s seed 1; same value shapes). Per layout build: instrumented build at the final path, train, rebuild with the profile (gcc: `-fprofile-generate=DIR`/`-fprofile-use=DIR`, `-Werror=missing-profile`; the gcda name is mangled from the output path, so both builds use the same path; clang: `-fprofile-instr-generate`, `llvm-profdata-23 merge`, `-fprofile-instr-use`; rustc/LLVM: `-Cprofile-generate`, the nightly's `llvm-profdata`, `-Cprofile-use`). The Rust instrumented builds add `-C link-arg=-lc` (a `no_std` cdylib links no libc, and `atexit`, which the profiler runtime needs, lives in `libc_nonshared.a`); the shipped profile-use builds do not. Linker: C uses GNU ld 2.44, Rust uses rustc's default lld.
- **Correctness** (`results/round5/test-summary.txt`, `equivalence.txt`): `test.py` (extended through `harness.patch` to read `R5_VARIANTS`, a variants file) passes 40/40 for all 186 builds. `equivalence.py` compares every build with `c-fast` over 250,000 rows (92 edge strings: empty, whitespace, signs, hex, huge exponents, NaN/inf text, overlong digit runs, non-ASCII, int64 limits; the rest random junk, 1-25 digit decimals and near-halfway doubles), bitwise on value and SQL type: 0 mismatches for all 186 builds.
- **Dataset cache (optional item, done):** `measure_one.py` (in `harness.patch`) gains `MEASURE_DATA_CACHE`, a directory. The first invocation writes its generated dataset there (atomically), later ones load the identical rows instead of regenerating them; setup stays outside the timed region and unset behaves as in round 4. Checked at 20,000 rows: cached and freshly generated rows have the same count, length sum, minimum and maximum, and an invocation dropped from 0.10 s to 0.05 s. This has not been used for any round-4 number.
- Rebuild: `docker compose build` in this folder (the build stage runs `python3 build_r5.py --jobs 3`, about 4 minutes on the 4-thread machine), then in the image from `/work`: `R5_VARIANTS=r5/variants.txt python3 test.py` and `python3 equivalence.py r5/variants.txt`.

### Round 5 — screening

- **Tuning** (user-consented, as round 4; short-lived privileged container, restored afterwards). The default route used the wired interface (lower metric than Wi-Fi) and the ssh session came in over it, so stopping `iwd` could not cut the session. All four services (`unattended-upgrades`, `smartmontools`, `cron`, `iwd`) were active before. Apply: governor `performance`, `no_turbo=1`, CPU 3 offline, `perf_event_paranoid=2`, the four services stopped.
  - Read-back after apply: governors 3× `performance` (CPU 3 offline, its governor file unreadable), `no_turbo=1`, online CPUs 0-2, `perf_event_paranoid=2`, the four services `inactive`, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`.
  - Read-back after restore (after all three screening runs): governors 4× `schedutil`, `no_turbo=0`, online CPUs 0-3, `perf_event_paranoid=3`, the four services `active` again, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`.
- **Container and channel:** one long-lived container `r5bench` (`--cpuset-cpus 2 --cap-add PERFMON`, `MEASURE_ROWS=200000`, `MEASURE_DATA_CACHE=/tmp/r5cache`) created after the tuning was applied and removed after the runs; the dataset cache was warmed untimed (one invocation per dataset) first. The driver ran with `channel` `ssh {host} sh -s` and `probe` `{cpu: 2, container: r5bench}`; every invocation is `docker exec -e MEASURE_PAD={pad} r5bench python3 measure_one.py r5/<variant>-L<k>/parse_number.so <dataset>`.
- **Per-invocation wall** (`raw.jsonl` `wallMs`, all 1,674 invocations including warm-up): mean 1,056 ms, median 1,074 ms (1.1 s, against ~5.4 s in round 4 with a fresh ssh session and container per invocation).
- **Screening** (indicative rigor, excluded from inference): per dataset (mixed, int, real) all 31 variants (anchor included) × layouts L0, L1, L2 = 93 builds, 1 warm-up + 5 measured rounds = 558 invocations per dataset, seed 20261111, `padMax` 4096, no A/A, no instruction counting. 0 failed or missing-metric invocations; no run was repeated. About 10 min per dataset.
- **Ceilings** (rule fixed by the plan: lowest mean over datasets of the pooled median ns/row; within 2% is a tie, resolved to no PGO, then no LTO, then the lower -O, then `std`; full table in `results/round5/screen/ceilings.md`): C×GCC `c-gcc-O3-pgo`; C×LLVM `c-clang-O2`; raw×GCC `raw-nostd-gcc-o2` (tied with `raw-nostd-gcc-o3`, the lowest); raw×LLVM `raw-nostd-llvm-o2-lto` (tied with `raw-nostd-llvm-o3-lto`, the lowest, and `raw-std-llvm-o3-lto`); safe×GCC `safe-std-gcc-o2` (tied with `safe-nostd-gcc-o2` and `safe-nostd-gcc-o3`, the lowest); safe×LLVM `safe-std-llvm-o3-nolto`. Screening differences are of the order of the layout noise, so several picks are tie-break decisions, not measured wins.
- **Repetition allocation (R1 pilot evidence).** Per dataset, variance of the 3 per-layout medians vs variance of the 5 invocations within a layout, both pooled over variants (the layout-effect estimate subtracts the sampling variance of a median of 5, about 1.57 × the within-layout invocation variance / 5, the normal-approximation factor π/2):

  | dataset | between-layout variance of medians | within-layout invocation variance | ratio | est. layout-effect variance | sd(layout)/sd(invocation) |
  | --- | --- | --- | --- | --- | --- |
  | mixed | 1.822 | 0.416 | 4.38 | 1.692 | 2.02 |
  | int | 1.646 | 0.259 | 6.36 | 1.565 | 2.46 |
  | real | 2.003 | 0.770 | 2.60 | 1.761 | 1.51 |

  The layout level dominates the invocation level in every dataset (layout sd 1.5-2.5× invocation sd), so the cost of a claim is governed by the number of layouts; 6 layouts × 10 invocations supports the plan's allocation (more layouts would help more than more invocations, but the 6 pad sizes are the built layouts, and 10 invocations per build already keep the within-layout term small). The counts are unchanged in this WP.
- **Frozen claim configs** (`measure-r5-mixed.json`, `measure-r5-int.json`, `measure-r5-real.json`): same container/channel/probe/argv shape plus `-e MEASURE_PERF=1`; layouts L0..L5 of every group, 10 invocations, 3 warm-up rounds, `padMax` 4096, seed 20261112, baseline `c-gcc-O2`, `aa: [c-gcc-O3-pgo, c-gcc-O3-pgo-copy]`. 14 groups (the 6 ceilings; backend controls `c-gcc-O3`, `c-clang-O3`, `raw-nostd-gcc-o3`, `raw-nostd-llvm-o3-nolto`, `safe-std-gcc-o3`; anchors `c-gcc-O2`, `raw-nostd-stable-llvm-o3-lto`; and the A/A copy of the C×GCC ceiling), 84 builds, 13 rounds each = 1,092 invocations per dataset (~19 min at 1.06 s).
- **Reference pacing:** ~1.06 s per invocation with the persistent channel, so a claim run is ~1,092 invocations ≈ 19 min per dataset.

### Round 5 — claim run

- **Tuning** (user-consented, as in round 4 and the screening; short-lived privileged container, restored afterwards). Before: the default route was the wired interface (metric 100; Wi-Fi 600), so `iwd` could be stopped without cutting the session; all four services (`unattended-upgrades`, `smartmontools`, `cron`, `iwd`) were `active`, governors 4× `schedutil`, `no_turbo=0`, CPUs 0-3 online, `perf_event_paranoid=3`. Apply: governor `performance`, `no_turbo=1`, CPU 3 offline, `perf_event_paranoid=2`, the four services stopped. The driving script restored the tuning from an `EXIT` trap.
  - Read-back after apply: governors 3× `performance` (CPU 3 offline, its governor file reads "Device or resource busy"), `no_turbo=1`, online `0-2`, `perf_event_paranoid=2`, the four services `inactive`, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`.
  - Read-back after restore: governors 4× `schedutil`, `no_turbo=0`, online `0-3`, `perf_event_paranoid=3`, the four services `active` again, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`. The container `r5bench` was removed (`docker rm -f`); the image stays.
- **Container and channel:** as in the screening (one long-lived container `r5bench`, `--cpuset-cpus 2 --cap-add PERFMON`, `MEASURE_ROWS=200000`, `MEASURE_DATA_CACHE=/tmp/r5cache`, created after the tuning was applied; cache warmed untimed with one invocation per dataset; `MEASURE_PERF=1` confirmed once to print `instr_per_row` (165.0247 for `c-gcc-O2-L0`, `int`) before the claim runs). The image id matched `results/round5/toolchains.txt`.
- **Claim runs** (the frozen `measure-r5-{mixed,int,real}.json`, unchanged): order mixed, int, real. 1,092 invocations per dataset (14 groups × 6 layouts × (3 warm-up + 10) rounds), **0 failed or missing-metric invocations** in all three datasets (`env.json` has no `failed`; `raw.jsonl` has 1,092 lines; every line has `exit` 0 and both `ns_per_row` and `instr_per_row`), **no re-run**. Each `env.json` `configHash` equals `git show c278bca:<config> | sha256sum` (mixed `a4d09884…`, int `984f38ac…`, real `015e2d69…`). The host name was replaced by `{host}` in each `env.json` (`hostname`, `probeHost`, `command`) after the run; `configHash` hashes the config file and does not change.
- **Per-invocation wall** (`raw.jsonl` `wallMs`, all 1,092 invocations incl. warm-up, instruction counting on): mean 1,313 ms (mixed), 1,206 ms (int), 1,296 ms (real); medians 1,313 / 1,205 / 1,295 ms. This is ~0.2 s above the screening's 1.06 s (which had no `MEASURE_PERF`). Wall per dataset: mixed 24 min, int 22 min, real 24 min.
- **A/A floor** (`c-gcc-O3-pgo` against its same-artifact copy `c-gcc-O3-pgo-copy`, ratio, 95% CI, half-width): mixed 0.9961 [0.9591, 1.052], 0.04644; int 0.9973 [0.9521, 1.062], 0.05488; real 1.003 [0.976, 1.028], 0.02608. The floors are of the order of the round-4 floors (0.057, 0.046, 0.076); the A/A CI contains 1 in all three.
- **Final counts and results:** see the README tables (copied from `results/round5/<dataset>/report*.md`). Instruction counts (`instr_per_row`) are deterministic per build in this run (the per-group CI is a point), so the report's claim rule on them is degenerate; they are secondary and never the basis of a verdict.
- **Reports and replication.** Per dataset: `report.md` (baseline `c-gcc-O2`, as frozen in the config) and eight `report-vs-<baseline>.md`, for `c-gcc-O3-pgo`, `c-clang-O2`, `raw-nostd-gcc-o2`, `raw-nostd-llvm-o2-lto`, `safe-std-gcc-o2`, `c-gcc-O3`, `raw-nostd-gcc-o3` and `safe-std-gcc-o3`. Each extra report is the same data re-reported with a different baseline: the dataset directory is copied to a scratch directory, `config.baseline` is set to the baseline in the copy's `env.json` (nothing else changes), `bun scripts/measure.mjs report <copy>` runs on the copy and its `report.md` is kept as `report-vs-<baseline>.md` (as in round 4). Commands: `bun scripts/measure.mjs run --config sqlite-parse-number-rust-tuning/measure-r5-<ds>.json --out sqlite-parse-number-rust-tuning/results/round5/<ds> --host HOST`, then `bun scripts/measure.mjs report sqlite-parse-number-rust-tuning/results/round5/<ds>`. No replication run was made and no result was re-run (R9). No matched-`-O3` clang baseline report exists for the language axis on LLVM (the controls were framed per the plan with C against gcc), so the LLVM language axis is reported at the ceilings only.
- **Ceiling-pick note.** The screening log (`results/round5/screen/ceilings.md`) shows the tie-break was applied for three cells (raw×GCC, raw×LLVM, safe×GCC); C×GCC, C×LLVM and safe×LLVM were the lowest screening score. The README says three of six.
- **Reference pacing:** ~1.2-1.3 s per invocation with the channel and instruction counting, ~22-24 min per dataset, ~70 min for the three claim runs.
