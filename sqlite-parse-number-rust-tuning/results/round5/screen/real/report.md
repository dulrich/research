# Measurement report

Seed 20261111; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs c-gcc-O2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O2 | 3 | 15 | 35.53 | [34.95, 38.01] | 1 | n/a | baseline |
| c-clang-O2 | 3 | 15 | 32.21 | [31.75, 33.49] | 0.9066 | [0.8376, 0.9467] | no A/A floor |
| c-gcc-O3 | 3 | 15 | 35.74 | [34.27, 35.79] | 1.006 | [0.9044, 1.023] | no A/A floor |
| c-clang-O3 | 3 | 15 | 32.92 | [31.96, 34.04] | 0.9264 | [0.8466, 0.9638] | no A/A floor |
| c-gcc-O3-pgo | 3 | 15 | 30.51 | [29.67, 30.97] | 0.8586 | [0.7851, 0.8781] | no A/A floor |
| c-clang-O3-pgo | 3 | 15 | 35.84 | [31.05, 35.97] | 1.008 | [0.8224, 1.028] | no A/A floor |
| raw-std-gcc-o2 | 3 | 15 | 38.25 | [35.7, 38.31] | 1.076 | [0.9456, 1.095] | no A/A floor |
| raw-std-gcc-o3 | 3 | 15 | 37.99 | [35.69, 38.4] | 1.069 | [0.9451, 1.09] | no A/A floor |
| raw-std-llvm-o2-lto | 3 | 15 | 30.19 | [29.83, 31.11] | 0.8497 | [0.7909, 0.8808] | no A/A floor |
| raw-std-llvm-o3-lto | 3 | 15 | 30.77 | [30.09, 31.19] | 0.8658 | [0.797, 0.8842] | no A/A floor |
| raw-std-llvm-o3-nolto | 3 | 15 | 33.03 | [29.86, 33.87] | 0.9295 | [0.791, 0.9587] | no A/A floor |
| raw-std-llvm-o3-lto-pgo | 3 | 15 | 34.09 | [32.81, 34.75] | 0.9594 | [0.869, 0.9844] | no A/A floor |
| raw-nostd-gcc-o2 | 3 | 15 | 36.75 | [35.41, 38.67] | 1.034 | [0.9375, 1.102] | no A/A floor |
| raw-nostd-gcc-o3 | 3 | 15 | 36.59 | [35.35, 38.62] | 1.03 | [0.933, 1.092] | no A/A floor |
| raw-nostd-llvm-o2-lto | 3 | 15 | 30.44 | [29.85, 31.11] | 0.8567 | [0.7867, 0.8807] | no A/A floor |
| raw-nostd-llvm-o3-lto | 3 | 15 | 30.33 | [29.72, 31.09] | 0.8535 | [0.7934, 0.8802] | no A/A floor |
| raw-nostd-llvm-o3-nolto | 3 | 15 | 32.7 | [30.57, 33.71] | 0.9203 | [0.8117, 0.9552] | no A/A floor |
| raw-nostd-llvm-o3-lto-pgo | 3 | 15 | 33.07 | [32.82, 34.76] | 0.9307 | [0.8668, 0.9858] | no A/A floor |
| safe-std-gcc-o2 | 3 | 15 | 33.03 | [31.86, 35.07] | 0.9295 | [0.8438, 0.9928] | no A/A floor |
| safe-std-gcc-o3 | 3 | 15 | 35.71 | [32.3, 36.25] | 1.005 | [0.8541, 1.031] | no A/A floor |
| safe-std-llvm-o2-lto | 3 | 15 | 30.54 | [30.41, 31.23] | 0.8595 | [0.8014, 0.8796] | no A/A floor |
| safe-std-llvm-o3-lto | 3 | 15 | 31.79 | [30.2, 32.39] | 0.8946 | [0.7991, 0.9188] | no A/A floor |
| safe-std-llvm-o3-nolto | 3 | 15 | 29.76 | [28.76, 30.79] | 0.8376 | [0.7611, 0.8725] | no A/A floor |
| safe-std-llvm-o3-lto-pgo | 3 | 15 | 31.97 | [31.03, 32.6] | 0.8996 | [0.822, 0.9249] | no A/A floor |
| safe-nostd-gcc-o2 | 3 | 15 | 32.85 | [32.38, 34.92] | 0.9246 | [0.8565, 0.9897] | no A/A floor |
| safe-nostd-gcc-o3 | 3 | 15 | 32.18 | [31.7, 35.38] | 0.9055 | [0.8355, 1.002] | no A/A floor |
| safe-nostd-llvm-o2-lto | 3 | 15 | 34.38 | [32.67, 36.04] | 0.9674 | [0.8654, 1.022] | no A/A floor |
| safe-nostd-llvm-o3-lto | 3 | 15 | 34.21 | [32.62, 36.47] | 0.9627 | [0.8604, 1.042] | no A/A floor |
| safe-nostd-llvm-o3-nolto | 3 | 15 | 30.49 | [29.63, 32.58] | 0.8579 | [0.7839, 0.9211] | no A/A floor |
| safe-nostd-llvm-o3-lto-pgo | 3 | 15 | 33.22 | [31.46, 33.79] | 0.9349 | [0.8315, 0.9595] | no A/A floor |
| raw-nostd-stable-llvm-o3-lto | 3 | 15 | 29.91 | [29.53, 30.83] | 0.8416 | [0.7819, 0.8715] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O2 | c-gcc-O2-L0 | 5 | 34.95 | [34.56, 39.7] |
| c-gcc-O2 | c-gcc-O2-L1 | 5 | 38.01 | [36.62, 38.22] |
| c-gcc-O2 | c-gcc-O2-L2 | 5 | 35.49 | [35.25, 35.58] |
| c-clang-O2 | c-clang-O2-L0 | 5 | 31.75 | [31.58, 31.96] |
| c-clang-O2 | c-clang-O2-L1 | 5 | 33.49 | [31.96, 34.04] |
| c-clang-O2 | c-clang-O2-L2 | 5 | 32.56 | [30.7, 33.12] |
| c-gcc-O3 | c-gcc-O3-L0 | 5 | 34.27 | [34.03, 34.38] |
| c-gcc-O3 | c-gcc-O3-L1 | 5 | 35.76 | [35.73, 35.79] |
| c-gcc-O3 | c-gcc-O3-L2 | 5 | 35.79 | [35.38, 35.97] |
| c-clang-O3 | c-clang-O3-L0 | 5 | 31.96 | [31.84, 32.31] |
| c-clang-O3 | c-clang-O3-L1 | 5 | 34.04 | [33.84, 34.59] |
| c-clang-O3 | c-clang-O3-L2 | 5 | 32.92 | [32.64, 33.32] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 5 | 30.51 | [30.15, 30.69] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 5 | 29.67 | [28.87, 29.85] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 5 | 30.97 | [30.88, 31.22] |
| c-clang-O3-pgo | c-clang-O3-pgo-L0 | 5 | 35.97 | [35.86, 36.24] |
| c-clang-O3-pgo | c-clang-O3-pgo-L1 | 5 | 31.05 | [30.48, 31.34] |
| c-clang-O3-pgo | c-clang-O3-pgo-L2 | 5 | 35.84 | [35.27, 35.99] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L0 | 5 | 38.3 | [38.06, 38.41] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L1 | 5 | 35.7 | [35.17, 36.38] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L2 | 5 | 38.3 | [38.13, 38.39] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L0 | 5 | 38.4 | [37.85, 39.05] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L1 | 5 | 35.69 | [35.42, 35.93] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L2 | 5 | 38.37 | [37.78, 38.38] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L0 | 5 | 30.19 | [30.08, 30.31] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L1 | 5 | 29.83 | [29.59, 30.09] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L2 | 5 | 31.11 | [30.76, 31.5] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L0 | 5 | 30.09 | [29.63, 30.79] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L1 | 5 | 31.19 | [29.94, 31.64] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L2 | 5 | 30.77 | [30.68, 31] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L0 | 5 | 33.09 | [33.02, 33.14] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L1 | 5 | 29.86 | [29.72, 29.91] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L2 | 5 | 33.87 | [32.61, 33.95] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L0 | 5 | 34.09 | [33.68, 34.31] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L1 | 5 | 32.81 | [32.4, 33.7] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L2 | 5 | 34.75 | [34.56, 34.92] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 5 | 38.67 | [38.28, 39.91] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 5 | 35.41 | [34.85, 35.54] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 5 | 36.75 | [36.63, 41.09] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 5 | 38.62 | [37.65, 38.83] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 5 | 35.35 | [35.23, 35.47] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 5 | 36.59 | [35.53, 36.85] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 5 | 30.44 | [29.36, 30.65] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 5 | 29.85 | [29.46, 30.32] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 5 | 31.11 | [31, 31.27] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L0 | 5 | 29.72 | [29.19, 30.6] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L1 | 5 | 31.09 | [30.94, 31.43] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L2 | 5 | 30.29 | [30.19, 30.36] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 5 | 33.71 | [33.49, 34.41] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 5 | 30.57 | [30.4, 30.86] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 5 | 32.7 | [32.56, 32.92] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L0 | 5 | 33.07 | [32.92, 33.29] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L1 | 5 | 34.76 | [34.65, 35.22] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L2 | 5 | 32.82 | [31.79, 33.04] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 5 | 31.86 | [31.63, 32.11] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 5 | 35.07 | [34.89, 35.31] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 5 | 33.03 | [32.75, 33.08] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 5 | 36.25 | [36.02, 36.98] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 5 | 32.3 | [32.15, 32.47] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 5 | 35.71 | [35.59, 42] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L0 | 5 | 30.63 | [30.31, 32.78] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L1 | 5 | 30.63 | [30.41, 31.23] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L2 | 5 | 30.47 | [30.35, 40.93] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L0 | 5 | 30.2 | [29.73, 30.38] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L1 | 5 | 32.39 | [32.32, 32.59] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L2 | 5 | 31.79 | [31.44, 32.13] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 5 | 29.76 | [29.56, 29.98] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 5 | 28.76 | [28.48, 28.93] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 5 | 30.79 | [30.66, 30.95] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L0 | 5 | 32.6 | [32.37, 33.09] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L1 | 5 | 31.76 | [31.32, 31.97] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L2 | 5 | 31.03 | [30.99, 36.02] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L0 | 5 | 32.38 | [32.28, 32.56] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L1 | 5 | 34.92 | [34.81, 35.24] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L2 | 5 | 32.85 | [32.57, 33.4] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L0 | 5 | 32.18 | [31.33, 32.4] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L1 | 5 | 35.38 | [35.32, 35.64] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L2 | 5 | 31.7 | [30.65, 31.81] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L0 | 5 | 34.38 | [33.95, 36.15] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L1 | 5 | 36.04 | [35.92, 36.32] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L2 | 5 | 32.67 | [32.38, 33.08] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L0 | 5 | 36.47 | [36.25, 38.96] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L1 | 5 | 32.62 | [32.47, 35.28] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L2 | 5 | 32.78 | [32.37, 40.91] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L0 | 5 | 30.49 | [30.2, 30.67] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L1 | 5 | 32.58 | [31.13, 32.7] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L2 | 5 | 29.63 | [29.46, 29.8] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L0 | 5 | 33.79 | [33.47, 34.32] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L1 | 5 | 33.22 | [32.98, 34.18] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L2 | 5 | 31.46 | [30.94, 31.61] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 5 | 29.72 | [29.45, 29.87] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 5 | 30.83 | [29.91, 31.36] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 5 | 30.08 | [29.1, 30.33] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 1.07 1.10 1.06 1/216 437311 / 1.17 1.10 1.07 1/218 457368
