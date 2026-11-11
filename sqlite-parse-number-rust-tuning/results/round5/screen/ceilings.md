# Round 5 screening: ceiling pick

Score = mean over mixed, int, real of the variant's pooled median ns/row (screening, indicative rigor: 3 layouts x 5 invocations). Within 2% of the cell's lowest score counts as tied; ties go to the simpler config (no PGO, then no LTO, then lower -O, then `std` over `nostd`). The stable anchor competes in no cell.

## C-GCC

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 24.54 | 16.85 | 30.51 | 23.967 | 0.0% |
| c-gcc-O3 | 27.73 | 22.9 | 35.74 | 28.790 | 20.1% |
| c-gcc-O2 | 28.49 | 23.47 | 35.53 | 29.163 | 21.7% |

Lowest: c-gcc-O3-pgo (23.967). Tied within 2%: c-gcc-O3-pgo. **Picked: c-gcc-O3-pgo** (lowest, no tie-break needed).

## C-LLVM

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| c-clang-O2 | 24.52 | 18.66 | 32.21 | 25.130 | 0.0% |
| c-clang-O3 | 25.31 | 18.75 | 32.92 | 25.660 | 2.1% |
| c-clang-O3-pgo | 27.33 | 19.11 | 35.84 | 27.427 | 9.1% |

Lowest: c-clang-O2 (25.130). Tied within 2%: c-clang-O2. **Picked: c-clang-O2** (lowest, no tie-break needed).

## raw-GCC

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| raw-nostd-gcc-o3 | 28.04 | 22 | 36.59 | 28.877 | 0.0% |
| raw-nostd-gcc-o2 | 28.15 | 22.15 | 36.75 | 29.017 | 0.5% |
| raw-std-gcc-o2 | 29.61 | 23.2 | 38.25 | 30.353 | 5.1% |
| raw-std-gcc-o3 | 29.86 | 23.3 | 37.99 | 30.383 | 5.2% |

Lowest: raw-nostd-gcc-o3 (28.877). Tied within 2%: raw-nostd-gcc-o2, raw-nostd-gcc-o3. **Picked: raw-nostd-gcc-o2** (tie-break applied).

## raw-LLVM

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| raw-nostd-llvm-o3-lto | 23.32 | 18.11 | 30.33 | 23.920 | 0.0% |
| raw-std-llvm-o3-lto | 23.71 | 17.37 | 30.77 | 23.950 | 0.1% |
| raw-nostd-llvm-o2-lto | 24 | 18.21 | 30.44 | 24.217 | 1.2% |
| raw-std-llvm-o2-lto | 25.02 | 19 | 30.19 | 24.737 | 3.4% |
| raw-nostd-llvm-o3-lto-pgo | 26.24 | 19.39 | 33.07 | 26.233 | 9.7% |
| raw-nostd-llvm-o3-nolto | 26.32 | 20.23 | 32.7 | 26.417 | 10.4% |
| raw-std-llvm-o3-nolto | 26.63 | 20.15 | 33.03 | 26.603 | 11.2% |
| raw-std-llvm-o3-lto-pgo | 26.38 | 20.41 | 34.09 | 26.960 | 12.7% |

Lowest: raw-nostd-llvm-o3-lto (23.920). Tied within 2%: raw-nostd-llvm-o2-lto, raw-std-llvm-o3-lto, raw-nostd-llvm-o3-lto. **Picked: raw-nostd-llvm-o2-lto** (tie-break applied).

## safe-GCC

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| safe-nostd-gcc-o3 | 25.53 | 17.96 | 32.18 | 25.223 | 0.0% |
| safe-nostd-gcc-o2 | 25.01 | 17.9 | 32.85 | 25.253 | 0.1% |
| safe-std-gcc-o2 | 25.36 | 17.96 | 33.03 | 25.450 | 0.9% |
| safe-std-gcc-o3 | 27.95 | 22.33 | 35.71 | 28.663 | 13.6% |

Lowest: safe-nostd-gcc-o3 (25.223). Tied within 2%: safe-std-gcc-o2, safe-nostd-gcc-o2, safe-nostd-gcc-o3. **Picked: safe-std-gcc-o2** (tie-break applied).

## safe-LLVM

| variant | mixed | int | real | score | % vs cell best |
| --- | --- | --- | --- | --- | --- |
| safe-std-llvm-o3-nolto | 23.83 | 18.98 | 29.76 | 24.190 | 0.0% |
| safe-std-llvm-o2-lto | 24.46 | 19.35 | 30.54 | 24.783 | 2.5% |
| safe-nostd-llvm-o3-nolto | 24.69 | 20.14 | 30.49 | 25.107 | 3.8% |
| safe-std-llvm-o3-lto-pgo | 24.08 | 19.91 | 31.97 | 25.320 | 4.7% |
| safe-std-llvm-o3-lto | 24.78 | 20.05 | 31.79 | 25.540 | 5.6% |
| safe-nostd-llvm-o3-lto-pgo | 25.19 | 19.35 | 33.22 | 25.920 | 7.2% |
| safe-nostd-llvm-o3-lto | 26.05 | 20.35 | 34.21 | 26.870 | 11.1% |
| safe-nostd-llvm-o2-lto | 27.92 | 21.56 | 34.38 | 27.953 | 15.6% |

Lowest: safe-std-llvm-o3-nolto (24.190). Tied within 2%: safe-std-llvm-o3-nolto. **Picked: safe-std-llvm-o3-nolto** (lowest, no tie-break needed).

## Picks

| cell | ceiling |
| --- | --- |
| C-GCC | c-gcc-O3-pgo |
| C-LLVM | c-clang-O2 |
| raw-GCC | raw-nostd-gcc-o2 |
| raw-LLVM | raw-nostd-llvm-o2-lto |
| safe-GCC | safe-std-gcc-o2 |
| safe-LLVM | safe-std-llvm-o3-nolto |
