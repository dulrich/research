# Measurement report

Seed 20261112; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs c-gcc-O2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 241.5 | [241.5, 241.5] | 0.9679 | [0.9679, 0.9679] | faster |
| c-clang-O2 | 6 | 60 | 255 | [255, 255] | 1.022 | [1.022, 1.022] | slower |
| raw-nostd-gcc-o2 | 6 | 60 | 240.4 | [240.4, 240.4] | 0.9635 | [0.9635, 0.9635] | faster |
| raw-nostd-llvm-o2-lto | 6 | 60 | 249.5 | [249.5, 249.5] | 1 | [1, 1] | slower |
| safe-std-gcc-o2 | 6 | 60 | 282.3 | [282.3, 282.3] | 1.131 | [1.131, 1.131] | slower |
| safe-std-llvm-o3-nolto | 6 | 60 | 250.4 | [250.4, 250.4] | 1.004 | [1.004, 1.004] | slower |
| c-gcc-O3 | 6 | 60 | 249.5 | [249.5, 249.5] | 1 | [1, 1] | no measurable difference |
| c-clang-O3 | 6 | 60 | 255 | [255, 255] | 1.022 | [1.022, 1.022] | slower |
| raw-nostd-gcc-o3 | 6 | 60 | 240.4 | [240.4, 240.4] | 0.9635 | [0.9635, 0.9635] | faster |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 260.4 | [260.4, 260.4] | 1.044 | [1.044, 1.044] | slower |
| safe-std-gcc-o3 | 6 | 60 | 282.3 | [282.3, 282.3] | 1.131 | [1.131, 1.131] | slower |
| c-gcc-O2 | 6 | 60 | 249.5 | [249.5, 249.5] | 1 | n/a | baseline |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 249.5 | [249.5, 249.5] | 1 | [1, 1] | slower |
| c-gcc-O3-pgo-copy | 6 | 60 | 241.5 | [241.5, 241.5] | 0.9679 | [0.9679, 0.9679] | faster |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 1, 95% CI [1, 1], half-width 4.14e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 241.5 | [241.5, 241.5] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 255 | [255, 255] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 255 | [255, 255] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 255 | [255, 255] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 255 | [255, 255] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 255 | [255, 255] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 255 | [255, 255] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 249.5 | [249.5, 249.5] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 250.4 | [250.4, 250.4] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 250.4 | [250.4, 250.4] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 250.4 | [250.4, 250.4] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 250.4 | [250.4, 250.4] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 250.4 | [250.4, 250.4] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 250.4 | [250.4, 250.4] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 249.5 | [249.5, 249.5] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 255 | [255, 255] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 255 | [255, 255] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 255 | [255, 255] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 255 | [255, 255] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 255 | [255, 255] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 255 | [255, 255] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 240.4 | [240.4, 240.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 260.4 | [260.4, 260.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 260.4 | [260.4, 260.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 260.4 | [260.4, 260.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 260.4 | [260.4, 260.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 260.4 | [260.4, 260.4] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 260.4 | [260.4, 260.4] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 282.3 | [282.3, 282.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 282.3 | [282.3, 282.3] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 249.5 | [249.5, 249.5] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 249.5 | [249.5, 249.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 241.5 | [241.5, 241.5] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 241.5 | [241.5, 241.5] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs c-gcc-O2 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | 6 | 60 | 29.97 | [29.37, 30.57] | 0.8188 | [0.7806, 0.8685] | faster |
| c-clang-O2 | 6 | 60 | 33.31 | [32.16, 34.36] | 0.9102 | [0.8567, 0.97] | faster |
| raw-nostd-gcc-o2 | 6 | 60 | 36.49 | [34.97, 38.7] | 0.997 | [0.933, 1.074] | no measurable difference |
| raw-nostd-llvm-o2-lto | 6 | 60 | 30.25 | [29.87, 30.73] | 0.8264 | [0.7919, 0.8749] | faster |
| safe-std-gcc-o2 | 6 | 60 | 34.05 | [32.21, 35.23] | 0.9304 | [0.8606, 0.996] | faster |
| safe-std-llvm-o3-nolto | 6 | 60 | 29.96 | [29.25, 31.53] | 0.8187 | [0.7782, 0.8856] | faster |
| c-gcc-O3 | 6 | 60 | 35.35 | [34.1, 35.76] | 0.9657 | [0.9074, 1.021] | no measurable difference |
| c-clang-O3 | 6 | 60 | 33.21 | [32.71, 33.96] | 0.9074 | [0.866, 0.9641] | faster |
| raw-nostd-gcc-o3 | 6 | 60 | 35.77 | [34.98, 38.13] | 0.9773 | [0.9311, 1.073] | no measurable difference |
| raw-nostd-llvm-o3-nolto | 6 | 60 | 32.16 | [30.3, 33.75] | 0.8786 | [0.8125, 0.9511] | faster |
| safe-std-gcc-o3 | 6 | 60 | 34.33 | [32.37, 36.33] | 0.9378 | [0.8623, 1.025] | no measurable difference |
| c-gcc-O2 | 6 | 60 | 36.6 | [34.52, 38.09] | 1 | n/a | baseline |
| raw-nostd-stable-llvm-o3-lto | 6 | 60 | 30.54 | [29.84, 31.53] | 0.8344 | [0.7936, 0.8917] | faster |
| c-gcc-O3-pgo-copy | 6 | 60 | 29.87 | [29.51, 30.51] | 0.8162 | [0.7804, 0.8663] | faster |

A/A (c-gcc-O3-pgo / c-gcc-O3-pgo-copy): ratio 1.003, 95% CI [0.976, 1.028], half-width 0.02608 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L0 | 10 | 30.34 | [30.24, 30.46] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L1 | 10 | 29.52 | [29.36, 29.83] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L2 | 10 | 30.88 | [30.67, 31.45] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L3 | 10 | 30.08 | [29.93, 30.38] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L4 | 10 | 29.65 | [29.61, 29.92] |
| c-gcc-O3-pgo | c-gcc-O3-pgo-L5 | 10 | 28.99 | [28.72, 29.22] |
| c-clang-O2 | c-clang-O2-L0 | 10 | 31.79 | [31.61, 32.11] |
| c-clang-O2 | c-clang-O2-L1 | 10 | 33.95 | [33.47, 34.51] |
| c-clang-O2 | c-clang-O2-L2 | 10 | 32.63 | [32.49, 32.72] |
| c-clang-O2 | c-clang-O2-L3 | 10 | 34.49 | [34.38, 34.73] |
| c-clang-O2 | c-clang-O2-L4 | 10 | 32.21 | [32.05, 32.76] |
| c-clang-O2 | c-clang-O2-L5 | 10 | 33.9 | [33.7, 34.07] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L0 | 10 | 38.87 | [38.78, 39.4] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L1 | 10 | 35.5 | [35.29, 35.65] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L2 | 10 | 36.87 | [36.65, 37] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L3 | 10 | 35.39 | [34.98, 35.53] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L4 | 10 | 37.5 | [37.3, 38.36] |
| raw-nostd-gcc-o2 | raw-nostd-gcc-o2-L5 | 10 | 34.3 | [34.15, 34.35] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L0 | 10 | 30.34 | [30.31, 30.51] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L1 | 10 | 29.47 | [29.16, 29.76] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L2 | 10 | 30.83 | [29.97, 31.17] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L3 | 10 | 30.19 | [30.08, 30.31] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L4 | 10 | 30.9 | [30.65, 32.14] |
| raw-nostd-llvm-o2-lto | raw-nostd-llvm-o2-lto-L5 | 10 | 30.08 | [29.92, 30.14] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L0 | 10 | 31.61 | [31.48, 31.91] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L1 | 10 | 35.44 | [35.17, 35.54] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L2 | 10 | 32.89 | [32.8, 33.04] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L3 | 10 | 35.22 | [35.01, 36.51] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L4 | 10 | 32.45 | [32.26, 32.71] |
| safe-std-gcc-o2 | safe-std-gcc-o2-L5 | 10 | 34.58 | [34.49, 34.85] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L0 | 10 | 29.61 | [29.58, 29.72] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L1 | 10 | 28.7 | [28.55, 28.94] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L2 | 10 | 30.62 | [30.38, 30.72] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L3 | 10 | 29.41 | [29.21, 29.48] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L4 | 10 | 32.36 | [32.23, 32.44] |
| safe-std-llvm-o3-nolto | safe-std-llvm-o3-nolto-L5 | 10 | 30.63 | [30.6, 30.83] |
| c-gcc-O3 | c-gcc-O3-L0 | 10 | 34.57 | [34.2, 35.15] |
| c-gcc-O3 | c-gcc-O3-L1 | 10 | 35.77 | [35.63, 35.91] |
| c-gcc-O3 | c-gcc-O3-L2 | 10 | 35.87 | [35.73, 35.96] |
| c-gcc-O3 | c-gcc-O3-L3 | 10 | 34.24 | [34.07, 34.55] |
| c-gcc-O3 | c-gcc-O3-L4 | 10 | 33.91 | [33.88, 34] |
| c-gcc-O3 | c-gcc-O3-L5 | 10 | 35.51 | [35.42, 35.78] |
| c-clang-O3 | c-clang-O3-L0 | 10 | 31.91 | [31.5, 32.17] |
| c-clang-O3 | c-clang-O3-L1 | 10 | 33.9 | [33.7, 33.99] |
| c-clang-O3 | c-clang-O3-L2 | 10 | 32.87 | [32.23, 33.02] |
| c-clang-O3 | c-clang-O3-L3 | 10 | 34.22 | [34.14, 34.57] |
| c-clang-O3 | c-clang-O3-L4 | 10 | 32.81 | [32.74, 32.99] |
| c-clang-O3 | c-clang-O3-L5 | 10 | 33.34 | [33.25, 33.67] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L0 | 10 | 38.84 | [38.7, 39.34] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L1 | 10 | 35.47 | [35.33, 35.6] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L2 | 10 | 37.12 | [36.94, 37.51] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L3 | 10 | 35.13 | [34.73, 35.49] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L4 | 10 | 37.43 | [37.25, 37.49] |
| raw-nostd-gcc-o3 | raw-nostd-gcc-o3-L5 | 10 | 34.2 | [34.13, 34.42] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L0 | 10 | 33.74 | [33.21, 34.13] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L1 | 10 | 30.7 | [30.61, 30.88] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L2 | 10 | 32.64 | [32.51, 32.78] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L3 | 10 | 30.09 | [30.02, 30.18] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L4 | 10 | 34 | [33.71, 34.17] |
| raw-nostd-llvm-o3-nolto | raw-nostd-llvm-o3-nolto-L5 | 10 | 31.08 | [30.89, 31.3] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L0 | 10 | 36.07 | [35.88, 36.25] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L1 | 10 | 32.26 | [31.9, 32.46] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L2 | 10 | 35.65 | [35.57, 35.87] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L3 | 10 | 32.31 | [32.15, 32.42] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L4 | 10 | 37.53 | [37.4, 38.2] |
| safe-std-gcc-o3 | safe-std-gcc-o3-L5 | 10 | 33.31 | [33.21, 33.41] |
| c-gcc-O2 | c-gcc-O2-L0 | 10 | 35.22 | [34.93, 35.43] |
| c-gcc-O2 | c-gcc-O2-L1 | 10 | 38.24 | [38.12, 38.45] |
| c-gcc-O2 | c-gcc-O2-L2 | 10 | 35.53 | [35.39, 35.71] |
| c-gcc-O2 | c-gcc-O2-L3 | 10 | 37.5 | [37.29, 37.58] |
| c-gcc-O2 | c-gcc-O2-L4 | 10 | 33.69 | [33.44, 33.93] |
| c-gcc-O2 | c-gcc-O2-L5 | 10 | 38.05 | [37.9, 38.29] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L0 | 10 | 29.63 | [29.55, 29.77] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L1 | 10 | 31.01 | [30.78, 31.31] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L2 | 10 | 30.35 | [30.22, 30.47] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L3 | 10 | 30.97 | [30.79, 31.22] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L4 | 10 | 29.9 | [29.72, 30.06] |
| raw-nostd-stable-llvm-o3-lto | raw-nostd-stable-llvm-o3-lto-L5 | 10 | 31.8 | [31.66, 31.91] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L0 | 10 | 30.26 | [30.1, 30.43] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L1 | 10 | 29.56 | [29.33, 29.72] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L2 | 10 | 30.75 | [30.6, 30.97] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L3 | 10 | 30.21 | [30.05, 30.3] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L4 | 10 | 29.65 | [29.59, 29.76] |
| c-gcc-O3-pgo-copy | c-gcc-O3-pgo-copy-L5 | 10 | 29.03 | [28.74, 29.43] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.98 1.05 1.01 1/217 546795 / 1.02 1.04 1.00 1/217 589875
