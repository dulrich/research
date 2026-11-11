# Measurement report

Seed 20261110; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs safe-nostd | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 185.1 | [185.1, 185.1] | 0.971 | [0.9611, 0.971] | faster |
| raw-fast | 3 | 90 | 186.9 | [186, 188.9] | 0.9807 | [0.9656, 0.991] | faster |
| raw-nostd-fast | 3 | 90 | 186.9 | [186, 188.9] | 0.9807 | [0.9656, 0.991] | faster |
| raw-nostd-fast-strtod | 3 | 90 | 186.9 | [186, 188.9] | 0.9807 | [0.9656, 0.991] | faster |
| safe-std | 3 | 90 | 190.6 | [190.6, 192.6] | 1 | [0.9898, 1.01] | no measurable difference |
| safe-nostd | 3 | 90 | 190.6 | [190.6, 192.6] | 1 | n/a | baseline |
| c-fast-copy | 3 | 90 | 185.1 | [185.1, 185.1] | 0.971 | [0.9611, 0.971] | faster |

A/A (c-fast / c-fast-copy): ratio 1, 95% CI [1, 1], half-width 5.402e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 185.1 | [185.1, 185.1] |
| c-fast | c-fast-a32 | 30 | 185.1 | [185.1, 185.1] |
| c-fast | c-fast-a64 | 30 | 185.1 | [185.1, 185.1] |
| raw-fast | raw-fast-a16 | 30 | 186 | [186, 186] |
| raw-fast | raw-fast-a32 | 30 | 186.9 | [186.9, 186.9] |
| raw-fast | raw-fast-a64 | 30 | 188.9 | [188.9, 188.9] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 186 | [186, 186] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 186.9 | [186.9, 186.9] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 188.9 | [188.9, 188.9] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 186 | [186, 186] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 186.9 | [186.9, 186.9] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 188.9 | [188.9, 188.9] |
| safe-std | safe-std-a16 | 30 | 190.6 | [190.6, 190.6] |
| safe-std | safe-std-a32 | 30 | 190.6 | [190.6, 190.6] |
| safe-std | safe-std-a64 | 30 | 192.6 | [192.6, 192.6] |
| safe-nostd | safe-nostd-a16 | 30 | 190.6 | [190.6, 190.6] |
| safe-nostd | safe-nostd-a32 | 30 | 190.6 | [190.6, 190.6] |
| safe-nostd | safe-nostd-a64 | 30 | 192.6 | [192.6, 192.6] |
| c-fast-copy | c-fast-copy-a16 | 30 | 185.1 | [185.1, 185.1] |
| c-fast-copy | c-fast-copy-a32 | 30 | 185.1 | [185.1, 185.1] |
| c-fast-copy | c-fast-copy-a64 | 30 | 185.1 | [185.1, 185.1] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs safe-nostd | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 29.37 | [28.29, 30.25] | 1.135 | [1.089, 1.171] | slower |
| raw-fast | 3 | 90 | 25.69 | [25.52, 26.13] | 0.9927 | [0.9815, 1.012] | no measurable difference |
| raw-nostd-fast | 3 | 90 | 23.64 | [23.46, 23.96] | 0.9135 | [0.902, 0.9268] | faster |
| raw-nostd-fast-strtod | 3 | 90 | 24 | [22.79, 26.15] | 0.9273 | [0.8778, 1.012] | no measurable difference |
| safe-std | 3 | 90 | 27.16 | [24.24, 29.52] | 1.05 | [0.9359, 1.142] | no measurable difference |
| safe-nostd | 3 | 90 | 25.88 | [25.7, 26.1] | 1 | n/a | baseline |
| c-fast-copy | 3 | 90 | 29.25 | [28.32, 30.23] | 1.13 | [1.09, 1.168] | slower |

A/A (c-fast / c-fast-copy): ratio 1.004, 95% CI [0.9467, 1.06], half-width 0.05662 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 28.29 | [28.17, 28.4] |
| c-fast | c-fast-a32 | 30 | 30.28 | [30.11, 30.43] |
| c-fast | c-fast-a64 | 30 | 29.4 | [29.21, 29.53] |
| raw-fast | raw-fast-a16 | 30 | 25.54 | [25.41, 25.65] |
| raw-fast | raw-fast-a32 | 30 | 25.65 | [25.52, 25.7] |
| raw-fast | raw-fast-a64 | 30 | 26.15 | [26.04, 26.24] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 23.5 | [23.34, 23.61] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 23.54 | [23.45, 23.69] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 23.96 | [23.71, 24.2] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 22.76 | [22.58, 22.89] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 24 | [23.88, 24.11] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 26.16 | [26.04, 26.28] |
| safe-std | safe-std-a16 | 30 | 24.2 | [24.1, 24.38] |
| safe-std | safe-std-a32 | 30 | 27.16 | [27.04, 27.24] |
| safe-std | safe-std-a64 | 30 | 29.52 | [29.42, 29.63] |
| safe-nostd | safe-nostd-a16 | 30 | 25.77 | [25.63, 25.85] |
| safe-nostd | safe-nostd-a32 | 30 | 26.11 | [26.03, 26.33] |
| safe-nostd | safe-nostd-a64 | 30 | 25.81 | [25.59, 25.88] |
| c-fast-copy | c-fast-copy-a16 | 30 | 28.32 | [28.21, 28.42] |
| c-fast-copy | c-fast-copy-a32 | 30 | 30.24 | [30.05, 30.46] |
| c-fast-copy | c-fast-copy-a64 | 30 | 29.27 | [29.24, 29.39] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.03 0.30 0.39 1/206 82640 / 1.02 0.67 0.58 1/208 160192
