# Measurement report

Seed 20261111; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs c-gcc-O2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O2 | 3 | 15 | 23.47 | [22.73, 24.47] | 1 | n/a | baseline |
| c-clang-O2 | 3 | 15 | 18.66 | [18.18, 18.84] | 0.7951 | [0.7596, 0.8265] | no A/A floor |
| c-gcc-O3 | 3 | 15 | 22.9 | [21.43, 23.2] | 0.9755 | [0.9008, 1.015] | no A/A floor |
| c-clang-O3 | 3 | 15 | 18.75 | [18.28, 19.06] | 0.7988 | [0.7634, 0.8362] | no A/A floor |
| c-gcc-O3-pgo | 3 | 15 | 16.85 | [16.26, 17.24] | 0.7178 | [0.6852, 0.7567] | no A/A floor |
| c-clang-O3-pgo | 3 | 15 | 19.11 | [16.34, 19.21] | 0.8141 | [0.6892, 0.8432] | no A/A floor |
| raw-std-gcc-o2 | 3 | 15 | 23.2 | [21.93, 24.73] | 0.9884 | [0.9248, 1.086] | no A/A floor |
| raw-std-gcc-o3 | 3 | 15 | 23.3 | [21.93, 24.95] | 0.9926 | [0.9217, 1.095] | no A/A floor |
| raw-std-llvm-o2-lto | 3 | 15 | 19 | [18.24, 19.45] | 0.8096 | [0.7618, 0.8542] | no A/A floor |
| raw-std-llvm-o3-lto | 3 | 15 | 17.37 | [16.92, 17.85] | 0.7401 | [0.7048, 0.7833] | no A/A floor |
| raw-std-llvm-o3-nolto | 3 | 15 | 20.15 | [19.92, 21.42] | 0.8584 | [0.8228, 0.9377] | no A/A floor |
| raw-std-llvm-o3-lto-pgo | 3 | 15 | 20.41 | [19.71, 20.75] | 0.8697 | [0.8258, 0.9088] | no A/A floor |
| raw-nostd-gcc-o2 | 3 | 15 | 22.15 | [20.79, 22.71] | 0.9437 | [0.8725, 0.9945] | no A/A floor |
| raw-nostd-gcc-o3 | 3 | 15 | 22 | [20.93, 22.64] | 0.9371 | [0.8771, 0.9913] | no A/A floor |
| raw-nostd-llvm-o2-lto | 3 | 15 | 18.21 | [18.12, 19.15] | 0.7758 | [0.7415, 0.8421] | no A/A floor |
| raw-nostd-llvm-o3-lto | 3 | 15 | 18.11 | [17.15, 19.25] | 0.7716 | [0.7256, 0.8371] | no A/A floor |
| raw-nostd-llvm-o3-nolto | 3 | 15 | 20.23 | [19.45, 22.34] | 0.8617 | [0.8202, 0.9786] | no A/A floor |
| raw-nostd-llvm-o3-lto-pgo | 3 | 15 | 19.39 | [18.35, 20.95] | 0.8259 | [0.7763, 0.9175] | no A/A floor |
| safe-std-gcc-o2 | 3 | 15 | 17.96 | [15.71, 21.91] | 0.7652 | [0.6563, 0.9615] | no A/A floor |
| safe-std-gcc-o3 | 3 | 15 | 22.33 | [18.85, 22.46] | 0.9511 | [0.7962, 0.9868] | no A/A floor |
| safe-std-llvm-o2-lto | 3 | 15 | 19.35 | [19.26, 20.34] | 0.8243 | [0.789, 0.893] | no A/A floor |
| safe-std-llvm-o3-lto | 3 | 15 | 20.05 | [19.81, 21.43] | 0.8542 | [0.8192, 0.9405] | no A/A floor |
| safe-std-llvm-o3-nolto | 3 | 15 | 18.98 | [18.66, 21.34] | 0.8086 | [0.7751, 0.9338] | no A/A floor |
| safe-std-llvm-o3-lto-pgo | 3 | 15 | 19.91 | [19.1, 20.18] | 0.8484 | [0.8016, 0.8869] | no A/A floor |
| safe-nostd-gcc-o2 | 3 | 15 | 17.9 | [16.55, 21.78] | 0.7626 | [0.6979, 0.945] | no A/A floor |
| safe-nostd-gcc-o3 | 3 | 15 | 17.96 | [17.3, 21.14] | 0.765 | [0.7212, 0.9274] | no A/A floor |
| safe-nostd-llvm-o2-lto | 3 | 15 | 21.56 | [20.37, 22.06] | 0.9183 | [0.8565, 0.9697] | no A/A floor |
| safe-nostd-llvm-o3-lto | 3 | 15 | 20.35 | [20.17, 22.06] | 0.867 | [0.8309, 0.9692] | no A/A floor |
| safe-nostd-llvm-o3-nolto | 3 | 15 | 20.14 | [18.98, 20.39] | 0.858 | [0.7963, 0.8948] | no A/A floor |
| safe-nostd-llvm-o3-lto-pgo | 3 | 15 | 19.35 | [18.84, 20.27] | 0.8244 | [0.7869, 0.8841] | no A/A floor |
| raw-nostd-stable-llvm-o3-lto | 3 | 15 | 18.16 | [17.26, 19.27] | 0.7734 | [0.7254, 0.845] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O2 | c-gcc-O2-L0 | 5 | 23.64 | [22.65, 24.01] |
| c-gcc-O2 | c-gcc-O2-L1 | 5 | 24.47 | [23.31, 24.74] |
| c-gcc-O2 | c-gcc-O2-L2 | 5 | 22.73 | [22.7, 22.8] |
| c-clang-O2 | c-clang-O2-L0 | 5 | 18.18 | [16.56, 18.25] |
| c-clang-O2 | c-clang-O2-L1 | 5 | 18.77 | [18.66, 19.19] |
| c-clang-O2 | c-clang-O2-L2 | 5 | 18.84 | [18.38, 18.94] |
| c-gcc-O3 | c-gcc-O3-L0 | 5 | 23.11 | [22.77, 23.2] |
| c-gcc-O3 | c-gcc-O3-L1 | 5 | 23.02 | [21.59, 23.2] |
| c-gcc-O3 | c-gcc-O3-L2 | 5 | 21.43 | [19.81, 23.96] |
| c-clang-O3 | c-clang-O3-L0 | 5 | 18.28 | [17.91, 18.69] |
| c-clang-O3 | c-clang-O3-L1 | 5 | 19.06 | [18.65, 19.15] |
| c-clang-O3 | c-clang-O3-L2 | 5 | 18.84 | [18.61, 19.13] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 5 | 16.26 | [16.03, 16.55] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 5 | 16.85 | [16.77, 17.46] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 5 | 17.24 | [17.07, 17.74] |
| c-clang-O3-pgo | c-clang-O3-pgo-L0 | 5 | 19.21 | [19.03, 19.32] |
| c-clang-O3-pgo | c-clang-O3-pgo-L1 | 5 | 16.34 | [16.24, 16.57] |
| c-clang-O3-pgo | c-clang-O3-pgo-L2 | 5 | 19.15 | [18.96, 19.45] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L0 | 5 | 24.73 | [24.44, 24.82] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L1 | 5 | 21.93 | [21.83, 22.95] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L2 | 5 | 23.2 | [23.13, 23.58] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L0 | 5 | 24.95 | [24.66, 25.07] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L1 | 5 | 21.93 | [21.58, 22.33] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L2 | 5 | 23.3 | [23.05, 23.43] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L0 | 5 | 19.45 | [19.38, 19.63] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L1 | 5 | 18.99 | [18.01, 19.11] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L2 | 5 | 18.29 | [18.12, 23.25] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L0 | 5 | 16.92 | [16.38, 17.85] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L1 | 5 | 17.85 | [17.24, 18.13] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L2 | 5 | 17.37 | [17.03, 17.58] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L0 | 5 | 19.92 | [19.65, 20.14] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L1 | 5 | 20.15 | [19.82, 20.26] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L2 | 5 | 21.42 | [21.26, 21.52] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L0 | 5 | 20.41 | [19.97, 20.61] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L1 | 5 | 19.71 | [19.59, 20.21] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L2 | 5 | 20.75 | [20.64, 21.62] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 5 | 22.71 | [22.17, 25.67] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 5 | 20.79 | [20.55, 20.88] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 5 | 22.15 | [22, 22.29] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 5 | 22.64 | [22.5, 23.12] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 5 | 20.93 | [20.67, 21.54] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 5 | 22 | [21.09, 22.57] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 5 | 18.21 | [18.12, 18.8] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 5 | 18.12 | [17.93, 18.14] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 5 | 19.15 | [19.14, 19.28] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L0 | 5 | 18.1 | [18, 18.36] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L1 | 5 | 19.25 | [18.94, 19.53] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L2 | 5 | 17.15 | [17.11, 18.52] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 5 | 22.34 | [21.44, 22.59] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 5 | 19.45 | [19.2, 19.49] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 5 | 20.23 | [20.11, 21.51] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L0 | 5 | 19.39 | [19.34, 19.54] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L1 | 5 | 20.95 | [20.74, 21] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L2 | 5 | 18.35 | [17.04, 19.33] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 5 | 17.96 | [17.55, 18.15] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 5 | 21.91 | [21.85, 22.08] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 5 | 15.71 | [14.39, 15.76] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 5 | 22.44 | [22.33, 22.95] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 5 | 18.85 | [18.75, 19.56] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 5 | 22.43 | [22, 22.53] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L0 | 5 | 20.34 | [19.27, 21.22] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L1 | 5 | 19.31 | [17.96, 23.59] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L2 | 5 | 19.26 | [19.09, 19.7] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L0 | 5 | 19.81 | [19.71, 20.35] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L1 | 5 | 21.43 | [20.67, 21.58] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L2 | 5 | 20.04 | [19.85, 20.07] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 5 | 18.98 | [17.42, 19.31] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 5 | 18.66 | [17.55, 19.15] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 5 | 21.34 | [21.09, 21.43] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L0 | 5 | 20.18 | [19.85, 20.29] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L1 | 5 | 19.1 | [18.99, 19.26] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L2 | 5 | 19.96 | [19.9, 20.19] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L0 | 5 | 17.9 | [17.88, 18.08] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L1 | 5 | 21.78 | [21.3, 22.29] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L2 | 5 | 16.55 | [16.41, 16.77] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L0 | 5 | 17.96 | [16.8, 18.28] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L1 | 5 | 21.14 | [20.99, 21.21] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L2 | 5 | 17.3 | [17.03, 17.32] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L0 | 5 | 21.64 | [21.43, 22.25] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L1 | 5 | 22.06 | [21.19, 22.75] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L2 | 5 | 20.37 | [20.12, 20.6] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L0 | 5 | 22.06 | [22.03, 22.44] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L1 | 5 | 20.35 | [19.1, 20.9] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L2 | 5 | 20.17 | [19.93, 20.33] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L0 | 5 | 20.14 | [19.83, 20.27] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L1 | 5 | 20.39 | [20.34, 20.69] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L2 | 5 | 18.98 | [18.82, 19.15] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L0 | 5 | 19.35 | [19.22, 20.06] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L1 | 5 | 20.27 | [20.07, 20.54] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L2 | 5 | 18.84 | [18.39, 19.07] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 5 | 18.16 | [17.75, 18.47] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 5 | 19.27 | [19.09, 19.73] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 5 | 17.26 | [17.15, 17.36] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 1.22 1.13 1.06 2/216 417321 / 1.07 1.10 1.06 1/216 437219
