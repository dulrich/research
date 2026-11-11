# Measurement report

Seed 20261110; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 165 | [165, 165] | 0.9706 | [0.9593, 0.9763] | faster |
| raw-fast | 3 | 90 | 170 | [169, 172] | 1 | [0.9826, 1.018] | no measurable difference |
| raw-nostd-fast | 3 | 90 | 170 | [169, 172] | 1 | n/a | baseline |
| raw-nostd-fast-strtod | 3 | 90 | 170 | [169, 172] | 1 | [0.9826, 1.018] | no measurable difference |
| safe-std | 3 | 90 | 173.9 | [173.9, 175.9] | 1.023 | [1.011, 1.041] | slower |
| safe-nostd | 3 | 90 | 173.9 | [173.9, 175.9] | 1.023 | [1.011, 1.041] | slower |
| c-fast-copy | 3 | 90 | 165 | [165, 165] | 0.9706 | [0.9593, 0.9763] | faster |

A/A (c-fast / c-fast-copy): ratio 1, 95% CI [1, 1], half-width 6.06e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 165 | [165, 165] |
| c-fast | c-fast-a32 | 30 | 165 | [165, 165] |
| c-fast | c-fast-a64 | 30 | 165 | [165, 165] |
| raw-fast | raw-fast-a16 | 30 | 169 | [169, 169] |
| raw-fast | raw-fast-a32 | 30 | 170 | [170, 170] |
| raw-fast | raw-fast-a64 | 30 | 172 | [172, 172] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 169 | [169, 169] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 170 | [170, 170] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 172 | [172, 172] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 169 | [169, 169] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 170 | [170, 170] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 172 | [172, 172] |
| safe-std | safe-std-a16 | 30 | 173.9 | [173.9, 173.9] |
| safe-std | safe-std-a32 | 30 | 173.9 | [173.9, 173.9] |
| safe-std | safe-std-a64 | 30 | 175.9 | [175.9, 175.9] |
| safe-nostd | safe-nostd-a16 | 30 | 173.9 | [173.9, 173.9] |
| safe-nostd | safe-nostd-a32 | 30 | 173.9 | [173.9, 173.9] |
| safe-nostd | safe-nostd-a64 | 30 | 175.9 | [175.9, 175.9] |
| c-fast-copy | c-fast-copy-a16 | 30 | 165 | [165, 165] |
| c-fast-copy | c-fast-copy-a32 | 30 | 165 | [165, 165] |
| c-fast-copy | c-fast-copy-a64 | 30 | 165 | [165, 165] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 24.55 | [23.64, 24.91] | 1.36 | [1.308, 1.501] | slower |
| raw-fast | 3 | 90 | 18.51 | [18.03, 19.26] | 1.026 | [0.9958, 1.158] | no measurable difference |
| raw-nostd-fast | 3 | 90 | 18.05 | [16.5, 18.17] | 1 | n/a | baseline |
| raw-nostd-fast-strtod | 3 | 90 | 17.95 | [17.67, 18.51] | 0.9945 | [0.9764, 1.115] | no measurable difference |
| safe-std | 3 | 90 | 20.85 | [20.48, 21.44] | 1.155 | [1.133, 1.285] | slower |
| safe-nostd | 3 | 90 | 20.18 | [19.55, 20.34] | 1.118 | [1.082, 1.227] | slower |
| c-fast-copy | 3 | 90 | 24.51 | [23.58, 24.89] | 1.358 | [1.305, 1.499] | slower |

A/A (c-fast / c-fast-copy): ratio 1.001, 95% CI [0.9576, 1.049], half-width 0.04563 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 23.63 | [23.49, 23.74] |
| c-fast | c-fast-a32 | 30 | 24.56 | [24.53, 24.66] |
| c-fast | c-fast-a64 | 30 | 24.92 | [24.85, 25] |
| raw-fast | raw-fast-a16 | 30 | 19.28 | [19.2, 19.32] |
| raw-fast | raw-fast-a32 | 30 | 18.02 | [17.95, 18.05] |
| raw-fast | raw-fast-a64 | 30 | 18.55 | [18.46, 18.63] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 18.08 | [18.04, 18.12] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 16.47 | [16.39, 16.55] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 18.17 | [18.12, 18.31] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 17.66 | [17.58, 17.73] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 17.87 | [17.79, 17.98] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 18.52 | [18.47, 18.63] |
| safe-std | safe-std-a16 | 30 | 20.83 | [20.73, 20.9] |
| safe-std | safe-std-a32 | 30 | 21.45 | [21.31, 21.53] |
| safe-std | safe-std-a64 | 30 | 20.48 | [20.27, 20.55] |
| safe-nostd | safe-nostd-a16 | 30 | 20.29 | [20.25, 20.36] |
| safe-nostd | safe-nostd-a32 | 30 | 20.32 | [20.23, 20.4] |
| safe-nostd | safe-nostd-a64 | 30 | 19.53 | [19.43, 19.63] |
| c-fast-copy | c-fast-copy-a16 | 30 | 23.57 | [23.47, 23.68] |
| c-fast-copy | c-fast-copy-a32 | 30 | 24.56 | [24.45, 24.61] |
| c-fast-copy | c-fast-copy-a64 | 30 | 24.89 | [24.83, 24.94] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.94 0.66 0.58 1/208 160240 / 0.69 0.64 0.58 1/213 236793
