# Can Rust match fast C for a SQLite `parse_number()` extension?

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). Rust with no dependencies and the same inline fast path is at least as fast as `c-fast`, even with the parser written in 100% safe Rust. Re-measured in round 4 on a second, quiet machine with the repository's [timing standard](../methods/timing.md) (3 code layouts per build, 30 invocations each, bootstrap CIs, an A/A noise floor), every Rust variant ran 12-27% less time per row than `c-fast` in every dataset, except safe `std` on mixed data (no measurable difference). Dropping `std` takes the `.so` to 24 KB, and handing the rare slow path to `strtod` takes it to 6 KB. That first looked smaller than the C file, but the gap was linker defaults: with the same linker and size flags, C is a little smaller (4.6–5.0 KB vs 5.5 KB).

> Every line of text and code here was written by an LLM (Claude Code).

## What was built

Two crates, both with **zero dependencies**. Each calls SQLite through the `sqlite3_api_routines` function table that SQLite hands to every loadable extension, which is what a C extension's `SQLITE_EXTENSION_INIT2` does.

[`rust-raw/`](rust-raw/lib.rs) is written like the C: raw pointers, a 128-byte stack buffer with unchecked writes (falling back to `sqlite3_malloc`), and every parsing function an `unsafe fn`. Cargo features select:

- **`nostd`**: `#![no_std]`, using `core` only. `str::parse::<f64>` lives in `core`, so Rust's correctly rounded float parser stays.
- **`fast`**: a port of `c-fast`'s single pass. Integers are built while scanning, and decimals with ≤ 2^53 significand and ≤ 22 fractional digits use one exact division (Clinger's fast path). Anything else falls back to `str::parse::<f64>`, which, unlike `c-fast`'s `strtod`, doesn't depend on the locale.
- **`strtod`** (implies `fast`): the slow path calls the C library's `strtod` instead, as `c-fast` does.

[`rust-safe/`](rust-safe/) is the same `fast` algorithm with `unsafe` kept to the FFI boundary:

- **Parser:** [`parse.rs`](rust-safe/parse.rs) is `#![forbid(unsafe_code)]`. It uses slices, iterators and checked indexing, and the rare slow path allocates a `Vec`.
- **FFI glue:** [`lib.rs`](rust-safe/lib.rs) holds every `unsafe`, about 30 lines. That covers reading API slots, turning `argv` and the text pointer into a slice, the entry point, and, in the `nostd` build, a global allocator over `sqlite3_malloc` plus the panic handler's `abort`.

| | `unsafe` blocks | `unsafe fn` definitions | parsing code in unsafe context |
|---|---|---|---|
| `rust-raw` | 2 | 11 | all of it (~170 lines) |
| `rust-safe` | 6 + 1 `unsafe impl` (allocator) | 5 (FFI only) | none (`forbid(unsafe_code)`) |

The four upstream extensions were rebuilt from upstream's source at commit `aa4e39e` and measured on the same machine.

## Results

### Round 4: measured to the timing standard

**Caveat (round 5 supersedes this):** the "Rust 12-27% faster" finding below compares Rust (`opt-level = 3` with LTO, on LLVM) against upstream's `gcc -O2` C build. `-O3`, clang and profile-guided optimisation were not measured for either language, so the comparison mixes the language with the compiler backend and does not push C to its ceiling. Round 5 measures both languages on both backends at their ceilings.

Method line: rigor level **standard** (the full protocol; see the standard's scope section); this follows [the timing standard](../methods/timing.md) (R1-R11), driver `scripts/measure.mjs` build `0813579eb401f83aac842b3e68a1106f93c15f86-dirty`. Machine: a second, quiet machine (Intel Core i7-5600U laptop, 2 cores / 4 threads, Debian 13, kernel 6.12, Docker 29.9.3), tuned for the run and restored afterwards: governor `performance`, turbo off (`no_turbo=1`), CPU 3 (the SMT sibling of the benchmark CPU 2) offline, `perf_event_paranoid=2`, `unattended-upgrades`, `smartmontools`, `cron` and `iwd` stopped; the container is pinned to CPU 2; ASLR on. Counts: 6 variants × 3 layout builds (+ an A/A copy of `c-fast`, same 3 builds), 3 warm-up rounds discarded then 30 invocations per build (90 per variant) per dataset, fresh seeded random order every round (seed 20261110), `MEASURE_PAD` 0-4096 bytes; in each invocation 200,000 rows, 5 warm-up runs then 15 timed iterations interleaved with the `sum(length(v))` baseline. The fixed counts were chosen before the main run; a short pilot only checked the pipeline and is excluded. Deviations from the standard (200,000-row datasets, A/A as a 3-layout copy, ssh session setup time in each invocation) are listed in [`notes.md`](notes.md) round 4.

Net nanoseconds per row, median over invocations with the 95% CI of that median (layouts pooled, hierarchical bootstrap, 10,000 resamples). Lower is better. This machine is ~3× slower per row than the Ryzen of the old table, so only compare within a column.

| Variant | Mixed | Integers | Decimals |
|---|---|---|---|
| `c-fast` | 29.37 [28.29, 30.25] | 24.55 [23.64, 24.91] | 37.48 [35.25, 38.18] |
| raw `fast` | 25.69 [25.52, 26.13] | 18.51 [18.03, 19.26] | 31.91 [31.50, 32.28] |
| raw `nostd,fast` | 23.64 [23.46, 23.96] | 18.05 [16.50, 18.17] | 30.08 [29.78, 30.69] |
| raw `nostd,strtod` | 24.00 [22.79, 26.15] | 17.95 [17.67, 18.51] | 30.07 [29.21, 31.92] |
| safe `std` | 27.16 [24.24, 29.52] | 20.85 [20.48, 21.44] | 32.24 [30.97, 33.37] |
| safe `nostd` | 25.88 [25.70, 26.10] | 20.18 [19.55, 20.34] | 32.44 [32.12, 32.60] |

A/A noise floor (`c-fast` against a copy of itself): ratio 1.004 [0.947, 1.060] mixed, 1.001 [0.958, 1.049] integers, 1.000 [0.929, 1.081] decimals; half-widths 0.057, 0.046 and 0.076. A difference is a claim only when its ratio CI excludes 1 and the effect exceeds that half-width (R8).

Ratio of each variant to `c-fast` (95% CI):

| Variant | Mixed | Integers | Decimals |
|---|---|---|---|
| raw `fast` | 0.875 [0.848, 0.917] faster | 0.754 [0.727, 0.808] faster | 0.852 [0.830, 0.908] faster |
| raw `nostd,fast` | 0.805 [0.780, 0.838] faster | 0.735 [0.666, 0.764] faster | 0.803 [0.783, 0.865] faster |
| raw `nostd,strtod` | 0.817 [0.761, 0.917] faster | 0.731 [0.713, 0.778] faster | 0.802 [0.769, 0.896] faster |
| safe `std` | 0.925 [0.812, 1.033] no measurable difference | 0.849 [0.827, 0.896] faster | 0.860 [0.817, 0.941] faster |
| safe `nostd` | 0.881 [0.854, 0.918] faster | 0.822 [0.791, 0.856] faster | 0.866 [0.846, 0.921] faster |

Rust against Rust (ratio of the first to the second):

| Comparison | Mixed | Integers | Decimals |
|---|---|---|---|
| raw `fast` / raw `nostd,fast` | 1.087 [1.072, 1.108] slower | 1.026 [0.996, 1.158] no measurable difference | 1.061 [1.032, 1.077] no measurable difference |
| raw `nostd,strtod` / raw `nostd,fast` | 1.015 [0.961, 1.108] no measurable difference | 0.995 [0.976, 1.115] no measurable difference | 1.000 [0.958, 1.064] no measurable difference |
| safe `std` / safe `nostd` | 1.050 [0.936, 1.142] no measurable difference | 1.033 [1.011, 1.083] no measurable difference | 0.994 [0.955, 1.033] no measurable difference |
| safe `nostd` / raw `nostd,fast` | 1.095 [1.079, 1.109] slower | 1.118 [1.082, 1.227] slower | 1.078 [1.052, 1.093] slower |

Hardware counters (secondary, `perf stat` over the timed region only): instructions retired per row, mixed / integers / decimals: `c-fast` 185.1 / 165.0 / 249.5, raw 186.9 / 170.0 / 250.5, safe 190.6 / 173.9 / 257.4. `c-fast` retires the fewest instructions and is the slowest, so the speed ordering is not an instruction-count ordering. Full reports, raw records and environment records: [`results/round4/`](results/round4/).

### Rounds 1-3: upstream harness (rows not re-measured in round 4 keep these numbers)

Net nanoseconds per row (fastest of 15 alternating runs over 2M rows, minus a `sum(length(v))` baseline; method and harness unchanged from upstream; single build per row, no confidence intervals). Rigor level: **indicative** in the standard's terms, so differences of a few ns here are not claims. Lower is better. A second mixed run is in [`results/`](results/). Rows re-measured in round 4 (`c-fast`, raw `fast`, raw `nostd,fast`, raw `nostd,strtod`, safe `std`, safe `nostd`) are superseded by the tables above for speed; their stripped sizes stay valid.


| Build | Mixed | Integers | Decimals | Stripped `.so` | Shared libs needed |
|---|---|---|---|---|---|
| plain C | 31.1 | 7.7 | 52.5 | 14,224 B | libc |
| **fast C (`c-fast`)** | **9.9** | **5.8** | **9.6** | **14,224 B** | libc |
| rusqlite | 24.0 | 16.9 | 26.9 | 314,288 B | libc, libgcc_s, ld-linux |
| sqlite-loadable | 24.6 | 16.7 | 27.8 | 291,184 B | libc, libgcc_s, ld-linux |
| raw `std` | 15.1 | 9.9 | 18.2 | 288,800 B | libc, libgcc_s, ld-linux |
| raw `nostd` | 14.3 | 10.1 | 18.0 | 23,280 B | none |
| raw `fast` | 10.6 | 6.4 | 12.1 | 289,232 B | libc, libgcc_s, ld-linux |
| raw `nostd,fast` | 7.6 | 5.9 | 8.6 | 23,616 B | none |
| raw `nostd,strtod` | 7.9 | 4.7 | 8.6 | 6,072 B | none |
| raw `fast` + 64-byte align | 8.8 | 6.2 | 9.7 | 309,520 B | libc, libgcc_s, ld-linux |
| raw `nostd,fast` + 64-byte align | 8.9 | 5.8 | 9.5 | 24,640 B | none |
| **safe `std`** | **8.0** | **5.5** | **9.4** | 289,424 B | libc, libgcc_s, ld-linux |
| **safe `nostd`** | **8.0** | **5.5** | **9.3** | 24,912 B | none |

Machine: AMD Ryzen 9 7900X, container pinned to one core. Absolute numbers are about half of upstream's (a 2 vCPU VM), and the upstream versions rank the same way, except that rusqlite and sqlite-loadable trade places within 1 ns.

## Findings

- **Rust's speed gap was wrapper overhead plus algorithm, not the language (upstream-harness numbers, round 1; not re-measured).** Calling the C API directly with a stack buffer (raw `std`) took mixed data from ~24 to ~15 ns. Porting `c-fast`'s fast path took it to `c-fast`'s level or below.
- **Rust with the fast path is faster than `c-fast` here (round 4).** On the quiet machine every Rust variant measured 12-27% less time per row than `c-fast`: for example raw `nostd,fast` / `c-fast` is 0.805 [0.780, 0.838] on mixed data, 0.735 [0.666, 0.764] on integers and 0.803 [0.783, 0.865] on decimals, against an A/A half-width of at most 0.076. The one exception is safe `std` on mixed data (0.925 [0.812, 1.033], no measurable difference). `c-fast` also retires the fewest instructions, so the Rust lead is not fewer instructions; I did not find out why. The lead does not depend on one code layout: on mixed data every `c-fast` alignment build (28.3-30.3 ns) is slower than every raw `nostd,fast` one (23.5-24.0 ns). It was measured on one machine (an Intel Broadwell laptop); round 1 on a Ryzen with the upstream harness showed rough parity, so whether the lead carries to other CPUs is untested.
- **Safe Rust is still faster than `c-fast`, but not as fast as the `unsafe` parser (round 4).** The safe crates run at 0.82-0.88 of `c-fast`'s time (safe `nostd`: 0.881 [0.854, 0.918] mixed, 0.822 [0.791, 0.856] integers, 0.866 [0.846, 0.921] decimals), and safe `nostd` takes 1.095 [1.079, 1.109], 1.118 [1.082, 1.227] and 1.078 [1.052, 1.093] times as long as raw `nostd,fast` (the decimals effect only just clears the 0.076 floor). The earlier "`unsafe` bought nothing measurable" does not survive; the safe hot loop's one array index is guarded by `frac <= 22` (I didn't confirm in the disassembly that the compiler drops that check). The only `unsafe` that's needed is the FFI boundary, which no SQLite extension in any language can avoid. Safe `std` and safe `nostd` show no measurable difference in any dataset.
- **`no_std` makes the mixed-data build faster, and alignment does not explain it (round 4); `strtod` does not change speed.** raw `fast` takes 1.087 [1.072, 1.108] times as long as raw `nostd,fast` on mixed data, with the gap at each of the three alignments (a16 25.5 vs 23.5, a32 25.7 vs 23.5, a64 26.2 vs 24.0 ns), so forcing alignment does not erase it, which contradicts the round-2 explanation; on integers and decimals there is no measurable difference (their effects fall inside the noise floor). Code placement still matters a lot: the same safe `std` code spans 24.2-29.5 ns across three alignments. In round 2 the hot function compiled to the same instructions in both builds (245 vs 243) and differed in address constants and the cold panic path, so the cause remains unidentified. `nostd,strtod` against `nostd,fast`: 1.015 [0.961, 1.108], 0.995 [0.976, 1.115], 1.000 [0.958, 1.064], no measurable difference in any dataset.
- **The 289 KB is `std`, not rusqlite.** Every `std` build is ~289 KB with no dependencies at all. Without `std` it's 23–25 KB, and the file links no shared libraries: it resolves `abort`, `memcpy` and `memset` (or `strtod`) from the host process when it's loaded.
- **Most of the remaining size is Rust's float parser.** 10.4 KB of the `no_std` file is core's Eisel-Lemire power-of-five table, plus 3.3 KB of `f64::from_str`. Calling `strtod` for the slow path drops all of it: **6,072 B, 3.4 KB of actual content**. The price is the same as `c-fast`'s: the rare slow path reads the decimal point from the host's locale. Since the slow path is rare, speed is unchanged (round 4 measured: no measurable difference). `opt-level = "s"`/`"z"` only reaches 22.8 KB, because the float table sets the floor.
- **Rust is not smaller than C once the linkers match (round 3).** The 14 KB vs 6 KB gap was the linkers, not the languages. gcc links with GNU ld, whose default `-z separate-code` pads each segment to a 4 KB file offset; rustc links with LLD, which does not. Linking `c-fast` with the same LLD gives 5,784 B against Rust's 6,072 B. With the same size flags on both (`-z noseparate-code`, no build-id, no RELRO, no unwind tables, `--gc-sections`, `.comment` stripped), `c-fast` is 4,752 B (`-O2`) or 4,560 B (`-Os`), and Rust `nostd,strtod` is 5,456 B ([`results/sizes_round3.txt`](results/sizes_round3.txt)). The Rust file has about 0.6 KB more content (3,378 vs 2,782 B `size`). These are size-only builds and were not benchmarked.

| Want | Build |
|---|---|
| Fastest (accepts an `unsafe` parser) | `rust-raw` `nostd,fast` (round 4: ~20% faster than `c-fast`, ~9% faster than `rust-safe` `nostd`) |
| Fast with least `unsafe` | `rust-safe` (`std` is fine; still ~12-18% faster than `c-fast`) |
| Small file, still safe and locale-independent | `rust-safe` `nostd` (25 KB) |
| Smallest Rust file | `rust-raw` `nostd,strtod` (6 KB, 5.5 KB with size link flags; locale-dependent slow path, like `c-fast`) |
| Smallest file overall | `c-fast` with size flags (4.6 KB) |

## Correctness

- Upstream `test.py`: all 13 extensions pass all 40 cases.
- Upstream `fuzz.py`, 4 seeds × 500k inputs × 13 extensions = 26M bit-exact comparisons against a correctly rounded Python reference: **no mismatches** ([`results/fuzz.txt`](results/fuzz.txt)). In the C locale the image runs in, the `strtod` builds also match exactly.

## Setup and reproduce

Everything runs in Docker; nothing is needed on the host except Docker with Compose. The image ([`Dockerfile`](Dockerfile)) contains:

- `rust:1.99.1-slim-trixie` base: rustc/cargo 1.99.1, Debian 13
- `gcc` 14.2 + `libc6-dev`: the C extensions
- `libsqlite3-dev`: `sqlite3ext.h` (SQLite 3.46.1)
- `python3` 3.13 with its `sqlite3` module (SQLite 3.46.1, extension loading enabled): test, fuzz and benchmark host
- `libclang-dev`: bindgen for sqlite-loadable
- `binutils`: `size`/`readelf` for the size table
- `git` + `ca-certificates`: fetch upstream at commit `aa4e39e`
- `linux-perf` (`perf` 6.12): instruction counts in round 4

Round 4 also needs, on the host that runs the driver: [bun](https://bun.sh) (the driver, `scripts/measure.mjs`, has no dependencies and no network use) and, for a remote measured machine, passwordless `ssh` to it. The measured machine needs only Docker; the driver's environment probe uses POSIX `sh` and coreutils there.

The build fetches upstream, applies [`harness.patch`](harness.patch) (it adds the nine new builds to the extension lists in `test.py`, `fuzz.py` and `bench.py`, the 18 layout builds to `test.py`, and the single-invocation timing entry `measure_one.py`), and builds all 13 extensions. The 64-byte-aligned builds use `RUSTFLAGS="-C llvm-args=-align-all-functions=6 -C llvm-args=-align-loops=64"`. A stage after the main builds makes the round-4 layout builds under `/work/layouts/` (Rust `-C llvm-args=-align-all-functions={4,5,6} -C llvm-args=-align-loops={16,32,64}`; C `-falign-functions={16,32,64} -falign-loops={16,32,64}`; suffix `-a16`/`-a32`/`-a64`). A last stage builds the round-3 size-only variants into `/work/sizes/`: `c-fast` with GNU ld and with the LLD that rustc ships (reached with `gcc -B<rustc gcc-ld dir> -fuse-ld=lld`), and Rust `nostd,strtod` with the same size link flags. List them with `docker compose run --rm exp sh -c 'cd sizes && ls -l'`.

```bash
docker compose build
docker compose run --rm exp python3 test.py
docker compose run --rm exp python3 fuzz.py 1        # seed
docker compose run --rm exp python3 bench.py mixed   # or: int, real
```

`compose.yaml` pins the container to CPU 2 for stable timings (round 4 ran on a 4-thread laptop with CPU 2's SMT sibling, CPU 3, offline); change `cpuset` to suit your machine.

### Reproduce round 4

Build the image on the machine that will run the benchmark, then drive it from any machine with bun, the repository's `scripts/` and ssh access (`HOST` is the ssh name of the benchmark machine; the configs use the placeholder `{host}`):

```bash
docker compose build && docker compose run --rm exp python3 test.py   # on the benchmark machine; 40/40 for all 31 builds
bun scripts/measure.mjs run --config sqlite-parse-number-rust-tuning/measure-mixed.json --out results-mixed --host HOST
bun scripts/measure.mjs report results-mixed                          # also: measure-int.json, measure-real.json
```

One invocation by hand: `docker run --rm --cpuset-cpus 2 --cap-add PERFMON -e MEASURE_PERF=1 -e MEASURE_ROWS=200000 sqlite-parse-number-rust-tuning python3 measure_one.py layouts/c-fast-a32/parse_number.so mixed`.

- **Capability note:** the instruction counter needs `--cap-add PERFMON` once the host's `perf_event_paranoid` is 2 (this run). With Debian's default of 3, `PERFMON` alone is refused and `--cap-add SYS_ADMIN` is also needed; that is a broad capability, acceptable only for a local throwaway bench container running code you built. Drop `MEASURE_PERF=1` to skip counters.
- **Host tuning used in round 4** (a few commands run as root on the benchmark machine, undone afterwards; the standard does not require it, see [its tuning section](../methods/timing.md)): governor `performance` on all CPUs, `intel_pstate/no_turbo=1`, CPU 3 (sibling of the pinned CPU 2) offline, `kernel.perf_event_paranoid=2`, background services `unattended-upgrades`, `smartmontools`, `cron` and `iwd` stopped. Restore: governor `schedutil`, `no_turbo=0`, CPU 3 online, `perf_event_paranoid=3`, restart those services. The run's actual state is in each `env.json`. An untuned machine still gives valid data under the standard, with wider CIs.

Building one crate alone needs only a Rust toolchain:

```bash
cd rust-safe && cargo build --release --features nostd
```

```sql
.load ./target/release/libparse_number
select parse_number('-$1,234.56');  -- -1234.56
```

See [`notes.md`](notes.md) for the working log.
