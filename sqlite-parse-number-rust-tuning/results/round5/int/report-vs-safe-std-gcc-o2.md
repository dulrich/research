# Measurement report

Seed 20261112; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs safe-std-gcc-o2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 156 | [156, 156] | 0.863 | [0.863, 0.863] | faster |
| c-clang-O2 | 6 | 60 | 171.5 | [171.5, 171.5] | 0.9487 | [0.9487, 0.9487] | faster |
| raw-nostd-gcc-o2 | 6 | 60 | 156.5 | [156.5, 156.5] | 0.8656 | [0.8656, 0.8656] | faster |
| raw-nostd-llvm-o2-lto | 6 | 60 | 169 | [169, 169] | 0.9349 | [0.9349, 0.9349] | faster |
| safe-std-gcc-o2 | 6 | 60 | 180.8 | [180.8, 180.8] | 1 | n/a | baseline |
| safe-std-llvm-o3-nolto | 6 | 60 | 166.9 | [166.9, 166.9] | 0.9232 | [0.9232, 0.9232] | faster |
| c-gcc-O3 | 6 | 60 | 165 | [165, 165] | 0.9127 | [0.9127, 0.9127] | faster |
| c-clang-O3 | 6 | 60 | 171.5 | [171.5, 171.5] | 0.9487 | [0.9487, 0.9487] | faster |
| raw-nostd-gcc-o3 | 6 | 60 | 156.5 | [156.5, 156.5] | 0.8656 | [0.8656, 0.8656] | faster |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 176.9 | [176.9, 176.9] | 0.9785 | [0.9785, 0.9785] | faster |
| safe-std-gcc-o3 | 6 | 60 | 180.8 | [180.8, 180.8] | 1 | [1, 1] | no measurable difference |
| c-gcc-O2 | 6 | 60 | 165 | [165, 165] | 0.9127 | [0.9127, 0.9127] | faster |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 169 | [169, 169] | 0.9349 | [0.9349, 0.9349] | faster |
| c-gcc-O3-pgo-copy | 6 | 60 | 156 | [156, 156] | 0.863 | [0.863, 0.863] | faster |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 1, 95% CI [1, 1], half-width 4.807e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 156 | [156, 156] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 171.5 | [171.5, 171.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 169 | [169, 169] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 169 | [169, 169] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 169 | [169, 169] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 169 | [169, 169] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 169 | [169, 169] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 169 | [169, 169] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 166.9 | [166.9, 166.9] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 166.9 | [166.9, 166.9] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 166.9 | [166.9, 166.9] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 166.9 | [166.9, 166.9] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 166.9 | [166.9, 166.9] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 166.9 | [166.9, 166.9] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 165 | [165, 165] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 165 | [165, 165] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 165 | [165, 165] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 165 | [165, 165] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 165 | [165, 165] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 165 | [165, 165] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 171.5 | [171.5, 171.5] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 171.5 | [171.5, 171.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 156.5 | [156.5, 156.5] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 176.9 | [176.9, 176.9] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 176.9 | [176.9, 176.9] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 176.9 | [176.9, 176.9] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 176.9 | [176.9, 176.9] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 176.9 | [176.9, 176.9] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 176.9 | [176.9, 176.9] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 180.8 | [180.8, 180.8] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 180.8 | [180.8, 180.8] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 165 | [165, 165] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 165 | [165, 165] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 165 | [165, 165] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 165 | [165, 165] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 165 | [165, 165] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 165 | [165, 165] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 169 | [169, 169] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 169 | [169, 169] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 169 | [169, 169] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 169 | [169, 169] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 169 | [169, 169] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 169 | [169, 169] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 156 | [156, 156] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 156 | [156, 156] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs safe-std-gcc-o2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 16.66 | [16.07, 17.16] | 0.8743 | [0.7721, 1.049] | no measurable difference |
| c-clang-O2 | 6 | 60 | 18.87 | [18.44, 19.48] | 0.9903 | [0.8842, 1.183] | no measurable difference |
| raw-nostd-gcc-o2 | 6 | 60 | 20.84 | [19.99, 22.45] | 1.094 | [0.964, 1.328] | no measurable difference |
| raw-nostd-llvm-o2-lto | 6 | 60 | 17.78 | [17.06, 18.42] | 0.9334 | [0.8202, 1.119] | no measurable difference |
| safe-std-gcc-o2 | 6 | 60 | 19.05 | [16.03, 21.23] | 1 | n/a | baseline |
| safe-std-llvm-o3-nolto | 6 | 60 | 18.97 | [18.55, 21.19] | 0.9957 | [0.8875, 1.258] | no measurable difference |
| c-gcc-O3 | 6 | 60 | 22.9 | [21.58, 23.29] | 1.202 | [1.035, 1.429] | slower |
| c-clang-O3 | 6 | 60 | 18.98 | [18.61, 19.6] | 0.9963 | [0.8888, 1.193] | no measurable difference |
| raw-nostd-gcc-o3 | 6 | 60 | 20.9 | [20.22, 22.45] | 1.097 | [0.9722, 1.342] | no measurable difference |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 19.92 | [18.77, 21.06] | 1.045 | [0.9138, 1.251] | no measurable difference |
| safe-std-gcc-o3 | 6 | 60 | 20.36 | [18.35, 22.41] | 1.069 | [0.8894, 1.359] | no measurable difference |
| c-gcc-O2 | 6 | 60 | 23.48 | [22.34, 24.66] | 1.232 | [1.078, 1.488] | slower |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 17.93 | [17.21, 19.25] | 0.9409 | [0.8242, 1.157] | no measurable difference |
| c-gcc-O3-pgo-copy | 6 | 60 | 16.7 | [15.88, 17.08] | 0.8767 | [0.7679, 1.048] | no measurable difference |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 0.9973, 95% CI [0.9521, 1.062], half-width 0.05488 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 16.3 | [16.05, 16.4] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 16.97 | [16.82, 19.35] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 17.12 | [16.92, 17.48] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 17.22 | [17.09, 17.38] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 16.2 | [16.15, 16.39] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 15.23 | [15.06, 15.99] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 18.21 | [17.83, 18.4] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 18.67 | [18.45, 18.73] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 18.82 | [18.68, 18.9] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 19.65 | [19.1, 19.72] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 19.05 | [18.88, 19.23] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 19.48 | [19.33, 19.61] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 22.64 | [22.46, 22.77] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 20.87 | [20.53, 20.99] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 22.34 | [22.15, 22.62] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 20.34 | [20.19, 20.51] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 20.78 | [20.66, 20.96] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 19.72 | [19.51, 19.88] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 18.14 | [18.02, 18.23] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 18.19 | [18.09, 18.25] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 19.26 | [19.16, 19.37] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 17.26 | [17.14, 17.32] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 17.56 | [17.44, 17.76] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 16.88 | [16.81, 16.98] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 17.61 | [17.14, 17.81] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 21.94 | [21.86, 22.25] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 15.91 | [15.8, 15.95] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 21.07 | [20.69, 21.23] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 16.11 | [15.98, 16.34] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 20.8 | [20.72, 21.04] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 19.02 | [18.85, 19.76] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 18.7 | [18.26, 18.97] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 21.31 | [21.25, 21.37] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 18.72 | [18.6, 18.96] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 20.82 | [20.69, 21.08] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 18.47 | [18.4, 18.54] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 23.17 | [23.01, 23.52] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 23.01 | [22.89, 23.13] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 21.68 | [21.54, 21.81] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 23.58 | [23.41, 23.69] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 21.33 | [21.24, 21.53] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 22.84 | [22.18, 23.03] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 18 | [17.25, 18.31] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 18.83 | [18.72, 18.98] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 18.73 | [18.64, 18.89] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 19.77 | [19.62, 19.97] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 19.36 | [18.94, 19.43] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 19.3 | [19.09, 19.59] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 22.66 | [22.59, 22.79] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 20.95 | [20.57, 21.18] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 22.27 | [22.12, 22.5] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 20.55 | [20.27, 20.78] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 20.85 | [20.76, 20.9] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 19.57 | [19.33, 19.83] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 22.51 | [22.39, 22.67] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 19.35 | [19.24, 19.6] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 20.16 | [20.05, 20.29] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 17.97 | [17.82, 18.05] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 19.99 | [19.87, 20.42] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 19.42 | [19.24, 20.01] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 22.51 | [22.45, 22.59] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 18.85 | [18.65, 18.98] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 22.4 | [22.2, 22.55] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 18.92 | [18.79, 19.14] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 21.71 | [21.64, 21.87] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 18.15 | [18.06, 18.2] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 23.52 | [23.28, 23.94] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 24.52 | [24.34, 24.75] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 22.77 | [22.58, 23] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 24.86 | [24.71, 24.95] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 21.77 | [20.96, 22] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 23.48 | [23.35, 23.56] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 18.21 | [18.07, 18.29] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 19.28 | [19.11, 19.45] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 17.29 | [17.12, 17.56] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 17.51 | [17.31, 17.69] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 16.97 | [16.87, 17.12] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 19.35 | [19.25, 19.48] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 16.41 | [16.23, 17.88] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 16.92 | [16.78, 17.08] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 17.09 | [16.56, 17.16] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 17.17 | [17.02, 17.3] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 16.48 | [16.26, 16.67] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 15.11 | [14.83, 15.23] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 1.35 1.24 1.06 1/217 504824 / 1.07 1.06 1.01 2/217 546710
