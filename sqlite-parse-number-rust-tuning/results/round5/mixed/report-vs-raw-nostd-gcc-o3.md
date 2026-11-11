# Measurement report

Seed 20261112; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-gcc-o3 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 177 | [177, 177] | 0.9944 | [0.9944, 0.9944] | faster |
| c-clang-O2 | 6 | 60 | 187.6 | [187.6, 187.6] | 1.054 | [1.054, 1.054] | slower |
| raw-nostd-gcc-o2 | 6 | 60 | 178 | [178, 178] | 1 | [1, 1] | no measurable difference |
| raw-nostd-llvm-o2-lto | 6 | 60 | 186 | [186, 186] | 1.045 | [1.045, 1.045] | slower |
| safe-std-gcc-o2 | 6 | 60 | 207.1 | [207.1, 207.1] | 1.164 | [1.164, 1.164] | slower |
| safe-std-llvm-o3-nolto | 6 | 60 | 183.8 | [183.8, 183.8] | 1.032 | [1.032, 1.032] | slower |
| c-gcc-O3 | 6 | 60 | 185.2 | [185.2, 185.2] | 1.04 | [1.04, 1.04] | slower |
| c-clang-O3 | 6 | 60 | 187.6 | [187.6, 187.6] | 1.054 | [1.054, 1.054] | slower |
| raw-nostd-gcc-o3 | 6 | 60 | 178 | [178, 178] | 1 | n/a | baseline |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 193.3 | [193.3, 193.3] | 1.086 | [1.086, 1.086] | slower |
| safe-std-gcc-o3 | 6 | 60 | 207.1 | [207.1, 207.1] | 1.164 | [1.164, 1.164] | slower |
| c-gcc-O2 | 6 | 60 | 185.1 | [185.1, 185.1] | 1.04 | [1.04, 1.04] | slower |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 186 | [186, 186] | 1.045 | [1.045, 1.045] | slower |
| c-gcc-O3-pgo-copy | 6 | 60 | 177 | [177, 177] | 0.9944 | [0.9944, 0.9944] | faster |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 1, 95% CI [1, 1], half-width 7.062e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 177 | [177, 177] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 187.6 | [187.6, 187.6] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 178 | [178, 178] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 186 | [186, 186] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 186 | [186, 186] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 186 | [186, 186] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 186 | [186, 186] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 186 | [186, 186] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 186 | [186, 186] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 183.8 | [183.8, 183.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 183.8 | [183.8, 183.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 183.8 | [183.8, 183.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 183.8 | [183.8, 183.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 183.8 | [183.8, 183.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 183.8 | [183.8, 183.8] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 185.2 | [185.2, 185.2] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 185.2 | [185.2, 185.2] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 185.2 | [185.2, 185.2] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 185.2 | [185.2, 185.2] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 185.2 | [185.2, 185.2] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 185.2 | [185.2, 185.2] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 187.6 | [187.6, 187.6] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 187.6 | [187.6, 187.6] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 178 | [178, 178] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 178 | [178, 178] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 193.3 | [193.3, 193.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 193.3 | [193.3, 193.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 193.3 | [193.3, 193.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 193.3 | [193.3, 193.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 193.3 | [193.3, 193.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 193.3 | [193.3, 193.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 207.1 | [207.1, 207.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 207.1 | [207.1, 207.1] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 185.1 | [185.1, 185.1] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 185.1 | [185.1, 185.1] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 185.1 | [185.1, 185.1] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 185.1 | [185.1, 185.1] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 185.1 | [185.1, 185.1] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 185.1 | [185.1, 185.1] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 186 | [186, 186] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 186 | [186, 186] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 186 | [186, 186] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 186 | [186, 186] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 186 | [186, 186] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 186 | [186, 186] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 177 | [177, 177] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 177 | [177, 177] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-gcc-o3 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 23.73 | [23.13, 24.88] | 0.8402 | [0.7768, 0.8947] | faster |
| c-clang-O2 | 6 | 60 | 26 | [24.52, 27.19] | 0.9207 | [0.8401, 0.9882] | faster |
| raw-nostd-gcc-o2 | 6 | 60 | 28.14 | [27.1, 30.83] | 0.9965 | [0.9124, 1.1] | no measurable difference |
| raw-nostd-llvm-o2-lto | 6 | 60 | 23.73 | [23.15, 24.84] | 0.8401 | [0.7759, 0.903] | faster |
| safe-std-gcc-o2 | 6 | 60 | 25.81 | [25.13, 27.48] | 0.9139 | [0.8438, 0.9988] | faster |
| safe-std-llvm-o3-nolto | 6 | 60 | 23.99 | [23.08, 25.19] | 0.8495 | [0.782, 0.9127] | faster |
| c-gcc-O3 | 6 | 60 | 27.73 | [26.51, 28.25] | 0.9819 | [0.903, 1.031] | no measurable difference |
| c-clang-O3 | 6 | 60 | 26.45 | [25.08, 27.04] | 0.9363 | [0.8532, 0.9828] | faster |
| raw-nostd-gcc-o3 | 6 | 60 | 28.24 | [27.12, 31.1] | 1 | n/a | baseline |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 26.69 | [24.3, 27.66] | 0.9452 | [0.8521, 0.9984] | faster |
| safe-std-gcc-o3 | 6 | 60 | 26.9 | [26.08, 29.12] | 0.9525 | [0.8851, 1.05] | no measurable difference |
| c-gcc-O2 | 6 | 60 | 29.08 | [27.52, 29.79] | 1.029 | [0.9395, 1.084] | no measurable difference |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 23.93 | [23.36, 25.24] | 0.8472 | [0.7826, 0.9088] | faster |
| c-gcc-O3-pgo-copy | 6 | 60 | 23.82 | [23.16, 24.48] | 0.8435 | [0.7749, 0.8882] | faster |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 0.9961, 95% CI [0.9591, 1.052], half-width 0.04644 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 23.56 | [23.42, 23.94] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 24.45 | [24.25, 24.58] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 25.53 | [25.37, 25.71] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 23.76 | [23.64, 23.91] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 23.24 | [22.79, 23.4] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 22.9 | [22.13, 23.04] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 24.29 | [24.1, 24.42] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 26.72 | [26.59, 27.38] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 24.71 | [23.84, 24.9] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 27.48 | [26.42, 28.1] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 25.48 | [25.26, 26.4] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 27.12 | [26.89, 27.25] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 32.84 | [32.7, 32.99] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 27.19 | [26.98, 27.29] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 28.21 | [27.85, 28.49] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 28.22 | [27.89, 28.48] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 28.52 | [28.39, 28.68] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 26.8 | [26.41, 27.21] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 25.12 | [24.61, 25.58] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 23.39 | [23.32, 23.73] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 24.85 | [24.81, 25.01] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 22.9 | [22.77, 23.15] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 24.09 | [23.08, 24.7] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 23.41 | [23.07, 23.57] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 24.79 | [23.84, 25.1] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 27.79 | [27.31, 28.05] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 25.42 | [25.34, 25.65] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 27.52 | [27.44, 27.7] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 25.27 | [25.02, 25.58] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 26.67 | [25.68, 27] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 23.78 | [23.57, 24.19] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 22.93 | [22.87, 23.81] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 25.39 | [25.06, 26.3] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 23.2 | [22.9, 23.34] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 25.23 | [25.05, 25.76] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 24.13 | [22.88, 24.32] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 28.04 | [27.54, 28.35] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 27.95 | [27.71, 28.58] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 27.39 | [27.2, 27.62] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 28.61 | [28.25, 28.9] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 26.07 | [25.87, 26.3] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 27.71 | [26.96, 28.23] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 25.07 | [24.88, 25.31] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 26.73 | [26.59, 26.86] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 24.88 | [24.11, 25.3] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 27.71 | [27.54, 28.09] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 25.92 | [25.51, 26.49] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 26.79 | [26.38, 27.04] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 32.65 | [32.32, 32.87] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 27.3 | [27.17, 27.6] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 28.36 | [28.01, 28.68] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 28.39 | [28.13, 28.63] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 28.57 | [27.7, 28.66] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 26.71 | [26.21, 26.96] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 26.83 | [26.8, 27.27] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 25.56 | [25.45, 26.19] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 26.26 | [26.11, 26.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 23.8 | [23.57, 23.92] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 27.06 | [26.89, 27.3] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 28.72 | [28.58, 29.02] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 30 | [29.72, 30.1] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 26.55 | [26.32, 26.77] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 28.11 | [27.82, 28.21] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 26.17 | [26.02, 26.41] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 28.87 | [28.68, 29.67] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 25.59 | [25.45, 25.95] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 28.36 | [28.02, 28.79] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 30.16 | [30.08, 30.44] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 28.2 | [28.01, 28.29] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 29.41 | [29.13, 29.61] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 26.55 | [26.43, 27.01] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 29.65 | [29.41, 29.79] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 23.49 | [23.33, 23.62] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 24.84 | [24.76, 25.2] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 23.19 | [22.96, 23.97] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 24.27 | [23.11, 24.62] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 23.29 | [23.11, 23.61] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 25.88 | [25.37, 26.21] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 23.73 | [23.33, 23.99] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 24.42 | [24.21, 24.52] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 25.32 | [25.2, 25.73] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 23.79 | [23.5, 23.89] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 23.12 | [22.98, 23.72] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 22.96 | [22.55, 23.46] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.08 0.09 0.44 1/221 461625 / 1.47 1.26 1.07 1/217 504730
