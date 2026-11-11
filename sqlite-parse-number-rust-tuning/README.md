# Can Rust match fast C for a SQLite `parse_number()` extension?

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). Rust with no dependencies and the same inline fast path, even with the parser written in 100% safe Rust, can match fast C, but which one wins depends on the compiler backend. Round 5 measures C and Rust each on both backends (GCC and LLVM), each pushed to its ceiling, on a second, quiet machine with the repository's [timing standard](../methods/timing.md) (6 code layouts per build, 10 invocations each, bootstrap CIs, an A/A noise floor): with GCC, C (gcc `-O3` with PGO) is the fastest (raw `unsafe` Rust takes 1.19-1.25× as long; safe Rust 1.09-1.14×, not measurable for integers); with LLVM, raw Rust takes 0.91-0.94× the time of C (clang `-O2`) in every dataset and safe Rust is faster or indistinguishable. Rust is 7-17% faster on LLVM than on GCC (where measurable), while C's best build is the GCC one, which uses PGO, something the Rust GCC backend cannot do. Round 4's "every Rust variant is 12-27% faster" compared Rust on LLVM against upstream's `gcc -O2` C build and mixed the language with the backend; it was not wrong as a measurement but it was not like-vs-like. Dropping `std` takes the `.so` to 24 KB, and handing the rare slow path to `strtod` takes it to 6 KB. That first looked smaller than the C file, but the gap was linker defaults: with the same linker and size flags, C is a little smaller (4.6–5.0 KB vs 5.5 KB).

> Every line of text and code here was written by an LLM (Claude Code).

Short version: [`BLUF.md`](BLUF.md) (bottom line, headline numbers, what matters ranked, and the comparison with the reference investigation).

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

### Round 5 (like-vs-like: C and Rust on GCC and LLVM, each at its ceiling)

Method line: rigor level **standard** (the full protocol, `scripts/measure.mjs` driver); numbers below are copied from `results/round5/<dataset>/report*.md`. Machine: a second, quiet machine (Intel Core i7-5600U laptop, Debian 13), tuned for the run and restored afterwards (governor `performance`, turbo off, the benchmark CPU's SMT sibling offline, `perf_event_paranoid=2`, background services stopped; details in [`notes.md`](notes.md)). One long-lived container pinned to CPU 2, one persistent ssh channel, ASLR on. Counts: 14 groups, 6 layout builds each (84 builds), 3 warm-up rounds discarded, then 10 invocations per build (60 per group) per dataset, fresh seeded random order every round (seed 20261112), `MEASURE_PAD` 0-4096 bytes, 200,000 rows, 5 warm-up runs then 15 timed iterations in each invocation; 1,092 invocations per dataset, 0 failed. The counts and groups were frozen in a committed config before any claim data existed. Both languages use the generic `x86-64` target; every build in a cell is the best of its screened candidates (gcc/clang/rustc `-O2`, `-O3`, PGO, LTO where the toolchain supports it, screened at indicative rigor on 3 layouts x 5 invocations; [`notes.md`](notes.md) has the screening table). Net nanoseconds per row, median over invocations with the 95% CI of that median (layouts pooled, hierarchical bootstrap, 10,000 resamples). Lower is better.

**Required caveats.**

- **GCC parity.** Rust on GCC runs on libgccjit 17.0.0 (through `rustc_codegen_gcc`, a nightly preview) while C on GCC is Debian's gcc 14.2, three major versions apart. The C-on-GCC against Rust-on-GCC comparison is therefore not like-vs-like in compiler version; the LLVM side is (clang 23.1.6, rustc 1.99.1 on LLVM 23.1.1, nightly on LLVM 23.1.5).
- **Exclusions** (measured or reasoned, not dropped silently; the matrix is `results/round5/variants.txt`): Rust-on-GCC PGO (`rustc_codegen_gcc` accepts `-Cprofile-generate` and links the profiler runtime but emits no counters, so no profile is written; safe `nostd` does not even load because `_Unwind_Resume` is undefined) and C LTO (one translation unit, nothing to optimise across). So the C×GCC ceiling uses PGO and no Rust×GCC build can.
- **Ceiling picks.** Three of the six ceilings (raw×GCC, raw×LLVM, safe×GCC) were picked by the 2% tie-break (simplest config among the candidates within 2% of the lowest screening score), not by a measured win; C×GCC, C×LLVM and safe×LLVM were the lowest screening score. Screening differences are of the order of the layout noise.
- **Layout method.** A pad object of 16·k zero bytes (k = 0..5) sits in `.text.unlikely` and is linked first, which moves the hot function without touching the compiler's own alignment choices; this gives 4 distinct address-mod-64 offsets per variant and 6 layout builds per variant, for all four toolchain cells alike (verified per variant in `results/round5/layouts.txt`).
- **Repetition allocation and pilot evidence** (the timing standard's checklist). From the screening data (indicative, 3 layouts x 5 invocations per variant, all variants pooled), the between-layout sd of medians is 2.02× (mixed), 2.46× (integers) and 1.51× (decimals) the within-layout invocation sd, after subtracting the sampling variance of a 5-invocation median. Layouts dominate invocations in every dataset, so the allocation is 6 layouts x 10 invocations per build (the pad sizes limit useful layouts to what is built; 10 invocations already keep the within-layout term small). The table is in [`notes.md`](notes.md).

#### Ceilings: ns per row

| Ceiling build | Mixed | Integers | Decimals |
|---|---|---|---|
| C, GCC (`c-gcc-O3-pgo`) | 23.73 [23.13, 24.88] | 16.66 [16.07, 17.16] | 29.97 [29.37, 30.57] |
| C, LLVM (`c-clang-O2`) | 26 [24.52, 27.19] | 18.87 [18.44, 19.48] | 33.31 [32.16, 34.36] |
| raw Rust, GCC (`raw-nostd-gcc-o2`) | 28.14 [27.1, 30.83] | 20.84 [19.99, 22.45] | 36.49 [34.97, 38.7] |
| raw Rust, LLVM (`raw-nostd-llvm-o2-lto`) | 23.73 [23.15, 24.84] | 17.78 [17.06, 18.42] | 30.25 [29.87, 30.73] |
| safe Rust, GCC (`safe-std-gcc-o2`) | 25.81 [25.13, 27.48] | 19.05 [16.03, 21.23] | 34.05 [32.21, 35.23] |
| safe Rust, LLVM (`safe-std-llvm-o3-nolto`) | 23.99 [23.08, 25.19] | 18.97 [18.55, 21.19] | 29.96 [29.25, 31.53] |

A/A noise floor (the C×GCC ceiling's 6 build artifacts run a second time under another group name; ratio, 95% CI, half-width): mixed 0.9961 [0.9591, 1.052], half-width 0.04644; integers 0.9973 [0.9521, 1.062], half-width 0.05488; decimals 1.003 [0.976, 1.028], half-width 0.02608. A difference is a claim only when its ratio CI excludes 1 and the effect exceeds that half-width (R8).

#### Backend axis (same language, LLVM against GCC)

Ratio of the LLVM build's time to the GCC build's (below 1: LLVM is faster). Ceilings differ in LTO/PGO by cell; the matched controls fix opt-level 3 and no LTO on both backends (for Rust, the same nightly and features).

| LLVM build / GCC build | Mixed | Integers | Decimals |
|---|---|---|---|
| C: clang `-O2` / gcc `-O3`+PGO (ceilings) | 1.096 [1.016, 1.159] slower | 1.133 [1.092, 1.19] slower | 1.112 [1.067, 1.153] slower |
| raw: LLVM `-O2`+LTO / GCC `-O2` (ceilings) | 0.843 [0.7618, 0.9022] faster | 0.8533 [0.7817, 0.9017] faster | 0.829 [0.7833, 0.8677] faster |
| safe: LLVM `-O3` / GCC `-O2` (ceilings) | 0.9296 [0.8543, 0.9895] faster | 0.9957 [0.8875, 1.258] no measurable difference | 0.8799 [0.8421, 0.9522] faster |
| C: clang `-O3` / gcc `-O3` (matched control) | 0.9536 [0.8979, 0.997] no measurable difference | 0.8289 [0.8077, 0.8924] faster | 0.9396 [0.9181, 0.9847] faster |
| raw: LLVM `-O3` no LTO / GCC `-O3` (matched control) | 0.9452 [0.8521, 0.9984] faster | 0.9528 [0.8692, 1.014] no measurable difference | 0.899 [0.8166, 0.9514] faster |
| safe: LLVM `-O3` no LTO / GCC `-O3` (matched control) | 0.8919 [0.8111, 0.9506] faster | 0.9317 [0.8379, 1.103] no measurable difference | 0.873 [0.8165, 0.9458] faster |

#### Language axis (same backend, language against language)

Ratio of the first build's time to the second's.

| Comparison (first / second) | Mixed | Integers | Decimals |
|---|---|---|---|
| GCC: raw / C (ceilings) | 1.186 [1.115, 1.306] slower | 1.251 [1.188, 1.366] slower | 1.218 [1.16, 1.286] slower |
| GCC: safe / C (ceilings) | 1.088 [1.028, 1.171] slower | 1.144 [0.9537, 1.295] no measurable difference | 1.136 [1.069, 1.184] slower |
| GCC: safe / raw (ceilings) | 0.9171 [0.8272, 0.9974] faster | 0.9141 [0.7532, 1.037] no measurable difference | 0.9332 [0.8655, 0.99] faster |
| LLVM: raw / C (ceilings) | 0.9124 [0.8614, 0.9947] faster | 0.9426 [0.8944, 0.9823] faster | 0.908 [0.8791, 0.943] faster |
| LLVM: safe / C (ceilings) | 0.9227 [0.8625, 1.005] no measurable difference | 1.005 [0.9679, 1.121] no measurable difference | 0.8995 [0.8646, 0.9571] faster |
| LLVM: safe / raw (ceilings) | 1.011 [0.9428, 1.074] no measurable difference | 1.067 [1.023, 1.2] slower | 0.9906 [0.9631, 1.043] no measurable difference |
| GCC `-O3`: raw / C (matched control) | 1.018 [0.9701, 1.107] no measurable difference | 0.9127 [0.8794, 1.007] no measurable difference | 1.012 [0.9857, 1.095] no measurable difference |
| GCC `-O3`: safe / C (matched control) | 0.97 [0.9323, 1.064] no measurable difference | 0.8892 [0.8031, 1.023] no measurable difference | 0.9711 [0.9116, 1.051] no measurable difference |

#### Against round 4's baseline

Ratio to upstream's `gcc -O2` C build (`c-gcc-O2`, the baseline of `report.md`); the second row is round 4's best Rust build re-built with the stable toolchain.

| Ratio to upstream gcc -O2 C (report.md baseline) | Mixed | Integers | Decimals |
|---|---|---|---|
| C ceiling (gcc `-O3`+PGO) | 0.8161 [0.7854, 0.876] faster | 0.7096 [0.664, 0.7533] faster | 0.8188 [0.7806, 0.8685] faster |
| round-4 Rust build re-built with stable rustc (raw `nostd`, LLVM `-O3`+LTO) | 0.8229 [0.7922, 0.8926] faster | 0.7636 [0.7109, 0.832] faster | 0.8344 [0.7936, 0.8917] faster |

Reading across the three datasets: on **GCC**, C at its ceiling (with PGO) beats raw Rust in every dataset and safe Rust in mixed and decimal data; the matched `-O3` controls show no measurable difference between the languages on GCC (so most of the C lead on GCC is PGO, which Rust cannot use there). On **LLVM**, raw Rust beats C at its ceiling in every dataset (0.91-0.94), safe Rust beats it only on decimals; no matched-`-O3` language comparison on LLVM was run (the controls' baseline for C is gcc), so on LLVM the language axis is read at the ceilings only. Across backends, Rust is faster on LLVM at the ceilings (raw in all three, safe in two); C is slower on clang at its ceiling than on GCC with PGO, but at the matched `-O3` clang is faster in two datasets and not measurably different in the third. Hardware instruction counts (secondary, never the basis of a verdict) retired per row at the ceilings, mixed / integers / decimals: C×GCC 177 / 156 / 241.5, C×LLVM 187.6 / 171.5 / 255, raw×GCC 178 / 156.5 / 240.4, raw×LLVM 186 / 169 / 249.5, safe×GCC 207.1 / 180.8 / 282.3, safe×LLVM 183.8 / 166.9 / 250.4 (`instr_per_row` tables in the reports). The full reports, raw records and environment records are in [`results/round5/`](results/round5/): `report.md` (every group against `c-gcc-O2`) plus the same data re-reported against eight other baselines (`report-vs-<baseline>.md`).

#### Size

Stripped `.so` bytes of each round-5 build at layout L0 (no pad object); exact byte counts, one build each. "Content" is `text + data` from GNU `size` (Berkeley), i.e. what the loader maps, without the segment padding and section headers. Both C compilers link with their default, GNU ld 2.44, whose `-z separate-code` pads each segment to a 4 KB file offset; every Rust build links with LLD, which does not (round 3). Ceilings in bold. All 31 builds, with `.text`/`.rodata` and the shared libraries each needs, are in [`results/round5/sizes.txt`](results/round5/sizes.txt).

| Build | GCC: stripped `.so` | GCC: content | LLVM: stripped `.so` | LLVM: content | Shared libs needed |
|---|---|---|---|---|---|
| C `-O2` | 14,224 B | 3,118 B | **14,312 B** | **3,073 B** | libc |
| C `-O3` | 14,224 B | 3,134 B | 14,312 B | 3,092 B | libc |
| C `-O3`+PGO | **14,224 B** | **3,359 B** | 14,312 B | 3,303 B | libc |
| raw `nostd`, `-O2` (LLVM: +LTO) | **30,256 B** | **27,317 B** | **23,464 B** | **20,799 B** | none |
| raw `nostd`, `-O3` (LLVM: +LTO) | 30,256 B | 27,317 B | 23,624 B | 20,966 B | none |
| raw `nostd`, `-O3` no LTO | — | — | 29,904 B | 27,065 B | none |
| safe `nostd`, `-O2` (LLVM: +LTO) | 33,840 B | 30,881 B | 24,744 B | 22,087 B | none |
| safe `nostd`, `-O3` (LLVM: +LTO) | 33,640 B | 30,689 B | 24,920 B | 22,254 B | none |
| safe `nostd`, `-O3` no LTO | — | — | 33,320 B | 30,489 B | none |
| safe `std`, `-O2` (LLVM: +LTO) | **333,992 B** | **330,692 B** | 287,920 B | 284,811 B | libc, libgcc_s, ld-linux |
| safe `std`, `-O3` no LTO | — | — | **333,328 B** | **330,140 B** | libc, libgcc_s, ld-linux |
| raw `std`, `-O3` (LLVM: +LTO) | 333,672 B | 330,380 B | 289,472 B | 286,367 B | libc, libgcc_s, ld-linux |

Rust in the GCC columns is built through `rustc_codegen_gcc` at `-O2`/`-O3` without LTO (the GCC cells have no LTO or PGO builds). PGO changes the Rust LLVM builds by under 1% (23,720 B raw `nostd`, 24,696 B safe `nostd`). The four layouts beyond L0 add 16 B per step to the Rust files and nothing to the C files (the pad fits in GNU ld's segment padding).

### Round 4 (C at upstream gcc -O2): measured to the timing standard

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

- **Which language is faster depends on the backend (round 5, standard rigor).** With each language at its ceiling, C on GCC (`-O3` with PGO) is the fastest build: raw Rust on GCC takes 1.186 [1.115, 1.306], 1.251 [1.188, 1.366] and 1.218 [1.16, 1.286] times as long (mixed / integers / decimals), safe Rust 1.088 [1.028, 1.171], 1.144 [0.9537, 1.295] (no measurable difference) and 1.136 [1.069, 1.184]. With LLVM the order flips: raw Rust takes 0.9124 [0.8614, 0.9947], 0.9426 [0.8944, 0.9823] and 0.908 [0.8791, 0.943] times as long as clang `-O2` C. Rust gains a lot from LLVM over GCC (raw: 0.843, 0.8533, 0.829) while C's ceiling is the GCC build, which uses PGO, so round 4's "Rust beats C" was mostly a backend and PGO effect against an untuned `gcc -O2` baseline: C at its ceiling is 0.8161, 0.7096 and 0.8188 of that baseline's time. The GCC comparison carries the compiler-version caveat above (gcc 14.2 against libgccjit 17.0.0). One machine, one CPU (an Intel Broadwell laptop).
- **Rust's speed gap was wrapper overhead plus algorithm, not the language (upstream-harness numbers, round 1; not re-measured).** Calling the C API directly with a stack buffer (raw `std`) took mixed data from ~24 to ~15 ns. Porting `c-fast`'s fast path took it to `c-fast`'s level or below.
- **Rust with the fast path is faster than upstream's `gcc -O2` `c-fast` here (round 4; round 5 shows this is a baseline and backend effect, see the first bullet).** On the quiet machine every Rust variant measured 12-27% less time per row than `c-fast`: for example raw `nostd,fast` / `c-fast` is 0.805 [0.780, 0.838] on mixed data, 0.735 [0.666, 0.764] on integers and 0.803 [0.783, 0.865] on decimals, against an A/A half-width of at most 0.076. The one exception is safe `std` on mixed data (0.925 [0.812, 1.033], no measurable difference). `c-fast` also retires the fewest instructions, so the Rust lead is not fewer instructions; I did not find out why. The lead does not depend on one code layout: on mixed data every `c-fast` alignment build (28.3-30.3 ns) is slower than every raw `nostd,fast` one (23.5-24.0 ns). It was measured on one machine (an Intel Broadwell laptop); round 1 on a Ryzen with the upstream harness showed rough parity, so whether the lead carries to other CPUs is untested.
- **Safe Rust is still faster than `c-fast`, but not as fast as the `unsafe` parser (round 4).** The safe crates run at 0.82-0.88 of `c-fast`'s time (safe `nostd`: 0.881 [0.854, 0.918] mixed, 0.822 [0.791, 0.856] integers, 0.866 [0.846, 0.921] decimals), and safe `nostd` takes 1.095 [1.079, 1.109], 1.118 [1.082, 1.227] and 1.078 [1.052, 1.093] times as long as raw `nostd,fast` (the decimals effect only just clears the 0.076 floor). The earlier "`unsafe` bought nothing measurable" does not survive; the safe hot loop's one array index is guarded by `frac <= 22` (I didn't confirm in the disassembly that the compiler drops that check). The only `unsafe` that's needed is the FFI boundary, which no SQLite extension in any language can avoid. Safe `std` and safe `nostd` show no measurable difference in any dataset.
- **`no_std` makes the mixed-data build faster, and alignment does not explain it (round 4); `strtod` does not change speed.** raw `fast` takes 1.087 [1.072, 1.108] times as long as raw `nostd,fast` on mixed data, with the gap at each of the three alignments (a16 25.5 vs 23.5, a32 25.7 vs 23.5, a64 26.2 vs 24.0 ns), so forcing alignment does not erase it, which contradicts the round-2 explanation; on integers and decimals there is no measurable difference (their effects fall inside the noise floor). Code placement still matters a lot: the same safe `std` code spans 24.2-29.5 ns across three alignments. In round 2 the hot function compiled to the same instructions in both builds (245 vs 243) and differed in address constants and the cold panic path, so the cause remains unidentified. `nostd,strtod` against `nostd,fast`: 1.015 [0.961, 1.108], 0.995 [0.976, 1.115], 1.000 [0.958, 1.064], no measurable difference in any dataset.
- **The 289 KB is `std`, not rusqlite.** Every `std` build is ~289 KB with no dependencies at all. Without `std` it's 23–25 KB, and the file links no shared libraries: it resolves `abort`, `memcpy` and `memset` (or `strtod`) from the host process when it's loaded.
- **Most of the remaining size is Rust's float parser.** 10.4 KB of the `no_std` file is core's Eisel-Lemire power-of-five table, plus 3.3 KB of `f64::from_str`. Calling `strtod` for the slow path drops all of it: **6,072 B, 3.4 KB of actual content**. The price is the same as `c-fast`'s: the rare slow path reads the decimal point from the host's locale. Since the slow path is rare, speed is unchanged (round 4 measured: no measurable difference). `opt-level = "s"`/`"z"` only reaches 22.8 KB, because the float table sets the floor.
- **Size across both backends (round 5, exact byte counts).** C is 14.2-14.3 KB on either compiler, but only 3.1-3.4 KB of that is content; the rest is GNU ld segment padding (PGO adds 211-225 B over `-O3`). Rust `nostd` is 23.5-24.9 KB with LLVM and LTO and 29.9-33.8 KB without LTO, which includes every GCC-backend build (raw `nostd`: 30,256 B on GCC against 29,904 B on LLVM without LTO, so the difference is LTO, not the backend). Its content is ~21-31 KB, about 12.5-13.8 KB of it read-only data (the float parser's tables, as in round 3), so in this round's builds Rust's extra size is real content as well as linker padding. `std` builds are 288-292 KB with LTO and 333-334 KB without. Both safe-Rust speed ceilings (safe×GCC, safe×LLVM) are `std` builds without LTO at ~334 KB, about 23× the C file; the fastest raw-Rust build (raw×LLVM) is 23,464 B. Full table: [`results/round5/sizes.txt`](results/round5/sizes.txt).
- **Rust is not smaller than C once the linkers match (round 3).** The 14 KB vs 6 KB gap was the linkers, not the languages. gcc links with GNU ld, whose default `-z separate-code` pads each segment to a 4 KB file offset; rustc links with LLD, which does not. Linking `c-fast` with the same LLD gives 5,784 B against Rust's 6,072 B. With the same size flags on both (`-z noseparate-code`, no build-id, no RELRO, no unwind tables, `--gc-sections`, `.comment` stripped), `c-fast` is 4,752 B (`-O2`) or 4,560 B (`-Os`), and Rust `nostd,strtod` is 5,456 B ([`results/sizes_round3.txt`](results/sizes_round3.txt)). The Rust file has about 0.6 KB more content (3,378 vs 2,782 B `size`). These are size-only builds and were not benchmarked.

| Want | Build |
|---|---|
| Fastest overall (round 5) | `c-fast` source built with gcc `-O3` + PGO (needs a training run; 0.71-0.82 of the upstream `gcc -O2` build's time) |
| Fastest without PGO, on LLVM | `rust-raw` `nostd,fast` with LTO (0.91-0.94 of clang `-O2` C's time; accepts an `unsafe` parser) |
| Fast with least `unsafe`, on LLVM | `rust-safe` (`std` is fine; faster than clang `-O2` C on decimals, no measurable difference on mixed and integer data) |
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

Round 5 adds to the same image (versions from [`results/round5/toolchains.txt`](results/round5/toolchains.txt)):

- clang / llvm 23.1.6 (`clang-23`, `llvm-23`, `llvm-23-linker-tools`, `llvm-23-runtime`, `libclang-rt-23-dev`) from the LLVM project's apt repository for Debian trixie (an extra apt source and key; the same LLVM major as rustc 1.99.1's LLVM 23.1.1). `llvm-profdata-23` does the C PGO merge
- rustup nightly `nightly-2026-11-10` (rustc 1.102.0-nightly, LLVM 23.1.5) with the components `rustc-codegen-gcc-preview`, `gcc-x86_64-unknown-linux-gnu` (this ships libgccjit, which reports itself as GCC 17.0.0) and `llvm-tools-preview` (its `llvm-profdata` merges the Rust PGO profiles). The GCC backend is selected per build with `RUSTFLAGS=-Zcodegen-backend=gcc`
- Debian gcc 14.2.0-19 (unchanged), GNU ld 2.44 (C links), rustc's default LLD (Rust links), Python 3.13.5
- [`build_r5.py`](build_r5.py) builds the 186 round-5 builds (31 variants x 6 layouts) under `/work/r5/<variant>-L<k>/parse_number.so`; [`pgo_train.py`](pgo_train.py) is the PGO training step (it loads the instrumented build and runs `sum(parse_number(v))` over mixed, integer and decimal datasets of 100,000 rows each, 5 runs each, with its own seed, distinct from the measurement datasets); [`equivalence.py`](equivalence.py) checks every build bitwise against `c-fast` over 250,000 generated rows

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

### Reproduce round 5

The toolchain image is built on the machine that will run the benchmark (this also runs the PGO training and all 186 builds, about 4 minutes on a 4-thread machine, and `test.py` and the equivalence check can then run in the image):

```bash
docker compose build        # tag sqlite-parse-number-rust-tuning
docker compose run --rm exp sh -c 'R5_VARIANTS=r5/variants.txt python3 test.py && python3 equivalence.py r5/variants.txt'
```

Driver machine (any machine with bun, this repository's `scripts/` and passwordless `ssh` to the benchmark machine; `HOST` is its ssh name; the configs use the placeholder `{host}`) and benchmark machine (Docker only). A persistent channel keeps one ssh session open for a whole run (`channel` in the config: `ssh {host} sh -s`), and every invocation is a `docker exec` into one long-lived, pinned container, which cuts per-invocation overhead from about 5.4 s (round 4: a fresh ssh session and container each) to about 1.2-1.3 s here (`wallMs` per invocation, measured).

1. **Tune the benchmark machine** (user consent; a few commands as root, undone afterwards; a privileged one-off container does it: `docker run --rm --privileged --pid=host -v /sys:/sys debian:trixie-slim sh -c '...'`, using `nsenter -t 1 -m -u -i -n -p` for `systemctl`/`sysctl`). Apply: governor `performance` on all CPUs, `intel_pstate/no_turbo=1`, CPU 3 (the sibling of the pinned CPU 2) offline, `kernel.perf_event_paranoid=2`, `unattended-upgrades`, `smartmontools`, `cron` and `iwd` stopped (not `iwd` when the default route is wireless). Restore: governor `schedutil`, `no_turbo=0`, CPU 3 online, `perf_event_paranoid=3`, restart exactly the services stopped. Never touch `ssh`, networking or Docker.
2. **Start the long-lived container after tuning** and warm the dataset cache once per dataset (untimed):

   ```bash
   docker run -d --name r5bench --cpuset-cpus 2 --cap-add PERFMON -e MEASURE_ROWS=200000 -e MEASURE_DATA_CACHE=/tmp/r5cache sqlite-parse-number-rust-tuning sleep infinity
   for ds in mixed int real; do docker exec r5bench python3 measure_one.py r5/c-gcc-O2-L0/parse_number.so $ds; done
   docker exec -e MEASURE_PERF=1 r5bench python3 measure_one.py r5/c-gcc-O2-L0/parse_number.so int   # must print an instr_per_row line
   ```
3. **Run and report, per dataset** (`mixed`, `int`, `real`; each config is run unchanged, and its hash is recorded as `configHash` in `env.json`):

   ```bash
   bun scripts/measure.mjs run --config sqlite-parse-number-rust-tuning/measure-r5-mixed.json --out sqlite-parse-number-rust-tuning/results/round5/mixed --host HOST
   bun scripts/measure.mjs report sqlite-parse-number-rust-tuning/results/round5/mixed
   ```
4. **Extra baselines** (the same data re-reported; `report` reads the baseline from `env.json`): for each baseline B in `c-gcc-O3-pgo`, `c-clang-O2`, `raw-nostd-gcc-o2`, `raw-nostd-llvm-o2-lto`, `safe-std-gcc-o2`, `c-gcc-O3`, `raw-nostd-gcc-o3`, `safe-std-gcc-o3`, copy the dataset directory to a scratch directory, set `config.baseline` to B in the copy's `env.json` and nothing else, run `bun scripts/measure.mjs report <copy>` and keep its `report.md` as `report-vs-B.md`.
5. **Restore the tuning and remove the container** (`docker rm -f r5bench`).

A run takes 1,092 invocations per dataset (3 warm-up rounds plus 10 measured rounds over 84 builds; about 22-24 minutes per dataset with instruction counting on, indicative). Reference pacing is in [`notes.md`](notes.md).

Building one crate alone needs only a Rust toolchain:

```bash
cd rust-safe && cargo build --release --features nostd
```

```sql
.load ./target/release/libparse_number
select parse_number('-$1,234.56');  -- -1234.56
```

See [`notes.md`](notes.md) for the working log.
