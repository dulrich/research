# BLUF: Rust vs C for a SQLite `parse_number()` extension

**Bottom line.** With the same algorithm and no wrapper overhead, Rust and C sit in a narrow speed band; at matched GCC `-O3` the language difference is too small for this setup to measure. The toolchain decides the winner: C wins on GCC only because it can use profile-guided optimisation (PGO) and Rust's GCC backend cannot; on LLVM, raw Rust beats C by 6-9%. PGO, the Rust backend, LTO and code layout each move speed by more than the language does. On size, C is smaller: 14 KB against 23 KB for `no_std` Rust and ~290-334 KB with `std`.

Full report, method and caveats: [`README.md`](README.md). Rigor labels: **standard** = the repository's [timing standard](../methods/timing.md) (6 layout builds × 10 invocations, bootstrap 95% CIs, an A/A noise floor of ±2.6-5.5%); **indicative** = screening or the upstream harness; **exact** = byte counts.

## Round 5 headline numbers

One quiet machine (Intel Core i7-5600U laptop, Debian 13), tuned for the run. Each language at its best configuration ("ceiling") on each backend. ns per row, lower is better, with 95% CIs (standard).

| Ceiling | Build | Mixed | Integers | Decimals |
|---|---|---|---|---|
| C × GCC | gcc 14.2 `-O3` + PGO | 23.73 [23.13, 24.88] | 16.66 [16.07, 17.16] | 29.97 [29.37, 30.57] |
| C × LLVM | clang 23 `-O2` | 26 [24.52, 27.19] | 18.87 [18.44, 19.48] | 33.31 [32.16, 34.36] |
| raw Rust × GCC | `no_std`, `-O2` | 28.14 [27.1, 30.83] | 20.84 [19.99, 22.45] | 36.49 [34.97, 38.7] |
| raw Rust × LLVM | `no_std`, `-O2` + LTO | 23.73 [23.15, 24.84] | 17.78 [17.06, 18.42] | 30.25 [29.87, 30.73] |
| safe Rust × GCC | `std`, `-O2` | 25.81 [25.13, 27.48] | 19.05 [16.03, 21.23] | 34.05 [32.21, 35.23] |
| safe Rust × LLVM | `std`, `-O3`, no LTO | 23.99 [23.08, 25.19] | 18.97 [18.55, 21.19] | 29.96 [29.25, 31.53] |

Headline ratios (standard; "faster"/"slower" only when the CI excludes 1 and clears the A/A floor):

- **GCC, at the ceilings:** raw Rust takes 1.19-1.25× as long as C (slower in all three datasets); safe Rust 1.09-1.14× (slower on mixed and decimals, no measurable difference on integers).
- **GCC, both at `-O3` (no PGO):** raw/C 0.91-1.02 and safe/C 0.89-0.97: **no measurable difference** in any dataset. C's lead on GCC is PGO.
- **LLVM, at the ceilings:** raw Rust takes 0.91-0.94× the time of C (faster in all three); safe Rust 0.90-1.01× (faster on decimals only).
- **Rust, LLVM vs GCC:** raw Rust on LLVM takes 0.83-0.85× its GCC time.
- **Size (exact):** C 14,224-14,312 B (3.1-3.4 KB of content, the rest GNU ld segment padding); raw Rust × LLVM 23,464 B; both safe-Rust ceilings ~334 KB (`std`).

## What matters, ranked

| Factor | Effect on speed | Evidence |
|---|---|---|
| PGO (available to C on GCC only) | ~20% | C gcc `-O3` 28.8 vs `-O3` + PGO 24.0 ns/row (indicative); it alone gives C × GCC its 1.19-1.25× lead over raw Rust (standard) |
| Backend, for Rust | 15-17% | raw Rust LLVM/GCC 0.83-0.85 at the ceilings (standard) |
| LTO, for Rust | ~10% | raw `no_std` LLVM `-O3`: 23.9 with LTO vs 26.4 ns/row without (indicative) |
| Code layout | up to ~7% between layouts of one build | one build at three link layouts: 28.24 / 30.17 / 28.08 ns/row (indicative); layout spread is 1.5-2.5× the run-to-run spread, which is why claims need several layout builds |
| Language, LLVM ceilings | 6-9%, Rust faster | raw Rust/C 0.91-0.94 (standard); the configurations differ (Rust `-O2` with LTO across its core library, C `-O2` as one translation unit) |
| Language, matched GCC `-O3` | not measurable | all ratios inside the noise floor (standard) |
| `std` vs `no_std` | ~0-5% speed; **~12× size** | 23.95 vs 23.92 ns/row on LLVM (indicative); 23 KB vs ~290 KB (exact) |

Not tested: CPU target flags (`-march`), and how much the host tuning (governor, turbo off, SMT sibling offline) shifts the ratios. It would shift absolute ns/row (turbo alone is up to ~20% on this CPU); because variants are interleaved in every round, it should mostly change the noise rather than the ratios, but that is unmeasured.

## Against the reference investigation

[Simon Willison's sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust) found hand-optimised C (`c-fast`) ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB).

| Reference finding | What this investigation found |
|---|---|
| C is ~2× faster than Rust | **Wrapper and algorithm, not language.** Round 1, upstream harness (indicative): rusqlite 24.0 ns/row on mixed data vs `c-fast` 9.9; calling SQLite's C API directly brought Rust to 15.1, and porting `c-fast`'s fast path brought it to 7.6-10.6, `c-fast`'s level. With the same algorithm, round 5 (standard) puts the two within ~0.9-1.25× of each other depending on backend, and at matched GCC `-O3` within the noise. |
| C is 20× smaller (14 KB vs ~300 KB) | **The ~300 KB is Rust's `std`, not rusqlite or the language.** `no_std` Rust is 23-25 KB (exact); most of that is core's float-parser tables. With `strtod` for the slow path it is 6,072 B, and once linkers and size flags match (round 3, exact) C is 4,560-4,752 B and Rust 5,456 B: Rust is a few hundred bytes (15-20%) larger, not 20×. The 14 KB C file is mostly GNU ld segment padding (3.1-3.4 KB of content). |
| Ranking of the upstream builds | Reproduced: the upstream extensions rank the same way on the round-1 machine (indicative), except that rusqlite and sqlite-loadable trade places within 1 ns. |

## Caveats

- One small hot loop, one machine, three datasets; "narrow band" means within roughly ±10-25% at comparable settings, not a general Rust-vs-C statement.
- GCC parity: Rust on GCC uses libgccjit 17.0.0 (`rustc_codegen_gcc`, a nightly preview), C uses gcc 14.2, so C × GCC vs Rust × GCC is not version-matched. The LLVM side is (clang 23.1.6, rustc on LLVM 23.1.1/23.1.5).
- Three of the six ceilings were chosen by a tie-break among configurations within 2% in screening, not by a measured win.
