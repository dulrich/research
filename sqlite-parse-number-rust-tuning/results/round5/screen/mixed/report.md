# Measurement report

Seed 20261111; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs c-gcc-O2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O2 | 3 | 15 | 28.49 | [28.08, 30.17] | 1 | n/a | baseline |
| c-clang-O2 | 3 | 15 | 24.52 | [24.3, 26.4] | 0.8609 | [0.8067, 0.9384] | no A/A floor |
| c-gcc-O3 | 3 | 15 | 27.73 | [27.55, 27.85] | 0.9733 | [0.9155, 0.9898] | no A/A floor |
| c-clang-O3 | 3 | 15 | 25.31 | [24.93, 26.67] | 0.8886 | [0.8312, 0.9455] | no A/A floor |
| c-gcc-O3-pgo | 3 | 15 | 24.54 | [23.57, 25.32] | 0.8615 | [0.7839, 0.8991] | no A/A floor |
| c-clang-O3-pgo | 3 | 15 | 27.33 | [24.28, 27.6] | 0.9593 | [0.8079, 0.9807] | no A/A floor |
| raw-std-gcc-o2 | 3 | 15 | 29.61 | [27.29, 30.92] | 1.04 | [0.91, 1.098] | no A/A floor |
| raw-std-gcc-o3 | 3 | 15 | 29.86 | [27.69, 30.97] | 1.048 | [0.9255, 1.102] | no A/A floor |
| raw-std-llvm-o2-lto | 3 | 15 | 25.02 | [24.49, 25.68] | 0.8784 | [0.8132, 0.9141] | no A/A floor |
| raw-std-llvm-o3-lto | 3 | 15 | 23.71 | [23.43, 24.46] | 0.8323 | [0.7788, 0.8699] | no A/A floor |
| raw-std-llvm-o3-nolto | 3 | 15 | 26.63 | [25.47, 27.57] | 0.935 | [0.8483, 0.9764] | no A/A floor |
| raw-std-llvm-o3-lto-pgo | 3 | 15 | 26.38 | [26.26, 27.04] | 0.926 | [0.8719, 0.9624] | no A/A floor |
| raw-nostd-gcc-o2 | 3 | 15 | 28.15 | [27.07, 32.74] | 0.9884 | [0.8985, 1.16] | no A/A floor |
| raw-nostd-gcc-o3 | 3 | 15 | 28.04 | [27.09, 32.71] | 0.9842 | [0.9051, 1.161] | no A/A floor |
| raw-nostd-llvm-o2-lto | 3 | 15 | 24 | [23.24, 24.96] | 0.8424 | [0.7721, 0.8877] | no A/A floor |
| raw-nostd-llvm-o3-lto | 3 | 15 | 23.32 | [22.92, 24.82] | 0.8187 | [0.7665, 0.8817] | no A/A floor |
| raw-nostd-llvm-o3-nolto | 3 | 15 | 26.32 | [25.39, 26.99] | 0.924 | [0.8483, 0.96] | no A/A floor |
| raw-nostd-llvm-o3-lto-pgo | 3 | 15 | 26.24 | [25.34, 26.47] | 0.9211 | [0.8467, 0.9416] | no A/A floor |
| safe-std-gcc-o2 | 3 | 15 | 25.36 | [24.85, 27.72] | 0.8903 | [0.8333, 0.9838] | no A/A floor |
| safe-std-gcc-o3 | 3 | 15 | 27.95 | [26.41, 29.74] | 0.981 | [0.8773, 1.056] | no A/A floor |
| safe-std-llvm-o2-lto | 3 | 15 | 24.46 | [24.15, 24.88] | 0.8588 | [0.8036, 0.8855] | no A/A floor |
| safe-std-llvm-o3-lto | 3 | 15 | 24.78 | [23.28, 25.74] | 0.87 | [0.7741, 0.9149] | no A/A floor |
| safe-std-llvm-o3-nolto | 3 | 15 | 23.83 | [23.26, 25.04] | 0.8365 | [0.7807, 0.8878] | no A/A floor |
| safe-std-llvm-o3-lto-pgo | 3 | 15 | 24.08 | [23.79, 24.78] | 0.8452 | [0.7939, 0.8774] | no A/A floor |
| safe-nostd-gcc-o2 | 3 | 15 | 25.01 | [24.55, 27.84] | 0.878 | [0.818, 0.9888] | no A/A floor |
| safe-nostd-gcc-o3 | 3 | 15 | 25.53 | [24.4, 27.23] | 0.8964 | [0.8101, 0.9648] | no A/A floor |
| safe-nostd-llvm-o2-lto | 3 | 15 | 27.92 | [25.79, 28.35] | 0.9802 | [0.8607, 1.005] | no A/A floor |
| safe-nostd-llvm-o3-lto | 3 | 15 | 26.05 | [25.66, 28.41] | 0.9145 | [0.8523, 1.009] | no A/A floor |
| safe-nostd-llvm-o3-nolto | 3 | 15 | 24.69 | [23.47, 25.89] | 0.8668 | [0.7825, 0.9201] | no A/A floor |
| safe-nostd-llvm-o3-lto-pgo | 3 | 15 | 25.19 | [24.68, 25.88] | 0.8842 | [0.8281, 0.9195] | no A/A floor |
| raw-nostd-stable-llvm-o3-lto | 3 | 15 | 23.7 | [22.96, 24.88] | 0.8321 | [0.7644, 0.8811] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O2 | c-gcc-O2-L0 | 5 | 28.24 | [28.11, 29.09] |
| c-gcc-O2 | c-gcc-O2-L1 | 5 | 30.17 | [30.02, 30.65] |
| c-gcc-O2 | c-gcc-O2-L2 | 5 | 28.08 | [27.88, 29.07] |
| c-clang-O2 | c-clang-O2-L0 | 5 | 24.31 | [22.59, 24.95] |
| c-clang-O2 | c-clang-O2-L1 | 5 | 26.4 | [26.23, 26.78] |
| c-clang-O2 | c-clang-O2-L2 | 5 | 24.52 | [24.2, 24.79] |
| c-gcc-O3 | c-gcc-O3-L0 | 5 | 27.62 | [27.52, 28.18] |
| c-gcc-O3 | c-gcc-O3-L1 | 5 | 27.76 | [27.63, 27.85] |
| c-gcc-O3 | c-gcc-O3-L2 | 5 | 27.62 | [27.52, 27.94] |
| c-clang-O3 | c-clang-O3-L0 | 5 | 25.31 | [25.27, 25.51] |
| c-clang-O3 | c-clang-O3-L1 | 5 | 26.67 | [26.13, 26.8] |
| c-clang-O3 | c-clang-O3-L2 | 5 | 24.93 | [24.77, 25.1] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 5 | 23.57 | [22.82, 24.01] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 5 | 24.54 | [22.53, 24.55] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 5 | 25.32 | [25.18, 25.58] |
| c-clang-O3-pgo | c-clang-O3-pgo-L0 | 5 | 27.37 | [27.27, 28.18] |
| c-clang-O3-pgo | c-clang-O3-pgo-L1 | 5 | 24.28 | [21.16, 25.05] |
| c-clang-O3-pgo | c-clang-O3-pgo-L2 | 5 | 27.5 | [27.08, 28.04] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L0 | 5 | 30.92 | [30.5, 31.12] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L1 | 5 | 27.29 | [26.11, 27.71] |
| raw-std-gcc-o2 | raw-std-gcc-o2-L2 | 5 | 29.61 | [28.44, 30.16] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L0 | 5 | 30.97 | [30.9, 31.18] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L1 | 5 | 27.69 | [27.4, 32.12] |
| raw-std-gcc-o3 | raw-std-gcc-o3-L2 | 5 | 29.83 | [29.34, 30.03] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L0 | 5 | 25.68 | [25.38, 25.93] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L1 | 5 | 24.49 | [24.08, 24.57] |
| raw-std-llvm-o2-lto | raw-std-llvm-o2-lto-L2 | 5 | 25.02 | [24.86, 26.39] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L0 | 5 | 23.59 | [23.25, 25.06] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L1 | 5 | 24.46 | [24.29, 24.89] |
| raw-std-llvm-o3-lto | raw-std-llvm-o3-lto-L2 | 5 | 23.47 | [22.95, 24.05] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L0 | 5 | 26.93 | [26.26, 27.3] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L1 | 5 | 25.47 | [25.33, 25.64] |
| raw-std-llvm-o3-nolto | raw-std-llvm-o3-nolto-L2 | 5 | 27.57 | [26.15, 28.54] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L0 | 5 | 26.3 | [26.12, 27.08] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L1 | 5 | 26.32 | [24.37, 26.86] |
| raw-std-llvm-o3-lto-pgo | raw-std-llvm-o3-lto-pgo-L2 | 5 | 27.04 | [26.89, 27.44] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 5 | 32.74 | [32.5, 33.08] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 5 | 27.07 | [26.6, 27.21] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 5 | 28.15 | [26.26, 28.67] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 5 | 32.71 | [32.55, 33.8] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 5 | 27.09 | [26.85, 27.98] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 5 | 28.04 | [27.89, 28.76] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 5 | 24.78 | [23.12, 26.07] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 5 | 23.27 | [23.12, 23.47] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 5 | 24.73 | [22.97, 25.29] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L0 | 5 | 23.32 | [23.28, 24.77] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L1 | 5 | 24.82 | [24.68, 27.35] |
| raw-nostd-llvm-o3-lto | raw-nostd-llvm-o3-lto-L2 | 5 | 22.92 | [22.84, 23.14] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 5 | 26.99 | [26.8, 27.06] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 5 | 25.39 | [25.32, 26.17] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 5 | 26.32 | [26.13, 27.55] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L0 | 5 | 26.29 | [26.04, 27.71] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L1 | 5 | 26.4 | [26.01, 26.65] |
| raw-nostd-llvm-o3-lto-pgo | raw-nostd-llvm-o3-lto-pgo-L2 | 5 | 25.34 | [23.6, 26.24] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 5 | 24.85 | [24.74, 25.36] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 5 | 27.72 | [25.65, 28.35] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 5 | 25.28 | [25.14, 25.45] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 5 | 29.74 | [29.65, 30.46] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 5 | 26.41 | [26.11, 26.6] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 5 | 27.95 | [27.62, 28.26] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L0 | 5 | 24.88 | [24.73, 25.13] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L1 | 5 | 24.15 | [20.97, 24.34] |
| safe-std-llvm-o2-lto | safe-std-llvm-o2-lto-L2 | 5 | 24.46 | [22.95, 25.3] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L0 | 5 | 23.28 | [22.88, 23.46] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L1 | 5 | 25.74 | [25.52, 26.28] |
| safe-std-llvm-o3-lto | safe-std-llvm-o3-lto-L2 | 5 | 24.78 | [24.7, 25.3] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 5 | 23.77 | [23.56, 24.43] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 5 | 23.26 | [22.75, 24.02] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 5 | 25.04 | [23.43, 25.85] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L0 | 5 | 24.78 | [23.79, 25.23] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L1 | 5 | 24.03 | [23.6, 24.59] |
| safe-std-llvm-o3-lto-pgo | safe-std-llvm-o3-lto-pgo-L2 | 5 | 24.01 | [23, 24.46] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L0 | 5 | 25.01 | [23.57, 25.38] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L1 | 5 | 27.84 | [27.74, 28.81] |
| safe-nostd-gcc-o2 | safe-nostd-gcc-o2-L2 | 5 | 24.55 | [24.42, 24.83] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L0 | 5 | 25.53 | [24.73, 26.1] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L1 | 5 | 27.23 | [25.98, 27.35] |
| safe-nostd-gcc-o3 | safe-nostd-gcc-o3-L2 | 5 | 24.4 | [23.62, 24.44] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L0 | 5 | 28.14 | [27.36, 28.35] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L1 | 5 | 28.15 | [27.92, 29.18] |
| safe-nostd-llvm-o2-lto | safe-nostd-llvm-o2-lto-L2 | 5 | 25.79 | [25.52, 26.22] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L0 | 5 | 28.3 | [27.87, 29.38] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L1 | 5 | 25.71 | [23.99, 26.05] |
| safe-nostd-llvm-o3-lto | safe-nostd-llvm-o3-lto-L2 | 5 | 25.71 | [25.55, 29.07] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L0 | 5 | 24.69 | [24.17, 25.4] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L1 | 5 | 25.89 | [25.19, 26.08] |
| safe-nostd-llvm-o3-nolto | safe-nostd-llvm-o3-nolto-L2 | 5 | 23.47 | [21.41, 24.1] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L0 | 5 | 25.88 | [25.73, 26.04] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L1 | 5 | 25.16 | [24.96, 25.37] |
| safe-nostd-llvm-o3-lto-pgo | safe-nostd-llvm-o3-lto-pgo-L2 | 5 | 24.68 | [24.29, 28.18] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 5 | 23.7 | [22.55, 24.57] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 5 | 24.88 | [24.47, 25.76] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 5 | 22.96 | [22.77, 23.4] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.52 0.67 0.96 1/219 397194 / 1.32 1.15 1.07 1/216 417247
