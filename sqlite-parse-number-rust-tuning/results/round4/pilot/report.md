# Measurement report

Seed 1; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs c-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 15 | 185.1 | [185.1, 185.1] | 1 | n/a | baseline |
| raw-fast | 3 | 15 | 186.9 | [186, 188.9] | 1.01 | [1.005, 1.021] | slower |
| raw-nostd-fast | 3 | 15 | 186.9 | [186, 188.9] | 1.01 | [1.005, 1.021] | slower |
| raw-nostd-fast-strtod | 3 | 15 | 186.9 | [186, 188.9] | 1.01 | [1.005, 1.021] | slower |
| safe-std | 3 | 15 | 190.6 | [190.6, 192.6] | 1.03 | [1.03, 1.04] | slower |
| safe-nostd | 3 | 15 | 190.6 | [190.6, 192.6] | 1.03 | [1.03, 1.04] | slower |
| c-fast-copy | 3 | 15 | 185.1 | [185.1, 185.1] | 1 | [1, 1] | no measurable difference |

A/A (c-fast / c-fast-copy): ratio 1, 95% CI [1, 1], half-width 0.00000108 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 5 | 185.1 | [185.1, 185.1] |
| c-fast | c-fast-a32 | 5 | 185.1 | [185.1, 185.1] |
| c-fast | c-fast-a64 | 5 | 185.1 | [185.1, 185.1] |
| raw-fast | raw-fast-a16 | 5 | 186 | [186, 186] |
| raw-fast | raw-fast-a32 | 5 | 186.9 | [186.9, 186.9] |
| raw-fast | raw-fast-a64 | 5 | 188.9 | [188.9, 188.9] |
| raw-nostd-fast | raw-nostd-fast-a16 | 5 | 186 | [186, 186] |
| raw-nostd-fast | raw-nostd-fast-a32 | 5 | 186.9 | [186.9, 186.9] |
| raw-nostd-fast | raw-nostd-fast-a64 | 5 | 188.9 | [188.9, 188.9] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 5 | 186 | [186, 186] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 5 | 186.9 | [186.9, 186.9] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 5 | 188.9 | [188.9, 188.9] |
| safe-std | safe-std-a16 | 5 | 190.6 | [190.6, 190.6] |
| safe-std | safe-std-a32 | 5 | 190.6 | [190.6, 190.6] |
| safe-std | safe-std-a64 | 5 | 192.6 | [192.6, 192.6] |
| safe-nostd | safe-nostd-a16 | 5 | 190.6 | [190.6, 190.6] |
| safe-nostd | safe-nostd-a32 | 5 | 190.6 | [190.6, 190.6] |
| safe-nostd | safe-nostd-a64 | 5 | 192.6 | [192.6, 192.6] |
| c-fast-copy | c-fast-copy-a16 | 5 | 185.1 | [185.1, 185.1] |
| c-fast-copy | c-fast-copy-a32 | 5 | 185.1 | [185.1, 185.1] |
| c-fast-copy | c-fast-copy-a64 | 5 | 185.1 | [185.1, 185.1] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs c-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 15 | 29.63 | [28.5, 30.5] | 1 | n/a | baseline |
| raw-fast | 3 | 15 | 26.07 | [25.29, 26.33] | 0.8798 | [0.8356, 0.9228] | faster |
| raw-nostd-fast | 3 | 15 | 23.71 | [23.35, 23.97] | 0.8002 | [0.7714, 0.8395] | faster |
| raw-nostd-fast-strtod | 3 | 15 | 24.04 | [22.61, 26.11] | 0.8112 | [0.747, 0.9105] | faster |
| safe-std | 3 | 15 | 27.26 | [23.86, 29.54] | 0.92 | [0.7961, 1.032] | no measurable difference |
| safe-nostd | 3 | 15 | 26.14 | [25.62, 26.22] | 0.8822 | [0.8455, 0.9195] | faster |
| c-fast-copy | 3 | 15 | 28.77 | [28.54, 30.46] | 0.9709 | [0.9369, 1.065] | no measurable difference |

A/A (c-fast / c-fast-copy): ratio 1.03, 95% CI [0.9394, 1.067], half-width 0.06398 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 5 | 28.5 | [27.41, 28.65] |
| c-fast | c-fast-a32 | 5 | 30.5 | [30.23, 31.58] |
| c-fast | c-fast-a64 | 5 | 29.63 | [27.78, 29.86] |
| raw-fast | raw-fast-a16 | 5 | 25.29 | [24.5, 26.07] |
| raw-fast | raw-fast-a32 | 5 | 25.88 | [25.54, 26.37] |
| raw-fast | raw-fast-a64 | 5 | 26.33 | [26.09, 27.73] |
| raw-nostd-fast | raw-nostd-fast-a16 | 5 | 23.35 | [23.24, 24.44] |
| raw-nostd-fast | raw-nostd-fast-a32 | 5 | 23.6 | [23.4, 23.77] |
| raw-nostd-fast | raw-nostd-fast-a64 | 5 | 23.97 | [23.7, 24.25] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 5 | 22.61 | [22.5, 23.14] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 5 | 24.04 | [22.04, 24.33] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 5 | 26.11 | [25.72, 26.52] |
| safe-std | safe-std-a16 | 5 | 23.86 | [23.66, 26.02] |
| safe-std | safe-std-a32 | 5 | 27.26 | [26.85, 27.56] |
| safe-std | safe-std-a64 | 5 | 29.54 | [29.37, 29.84] |
| safe-nostd | safe-nostd-a16 | 5 | 25.88 | [25.6, 26.72] |
| safe-nostd | safe-nostd-a32 | 5 | 26.21 | [26.01, 26.66] |
| safe-nostd | safe-nostd-a64 | 5 | 25.62 | [25.51, 26.3] |
| c-fast-copy | c-fast-copy-a16 | 5 | 28.54 | [27.87, 28.63] |
| c-fast-copy | c-fast-copy-a32 | 5 | 30.46 | [30.29, 30.57] |
| c-fast-copy | c-fast-copy-a64 | 5 | 28.77 | [28.05, 29.39] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.47 0.66 0.45 1/209 67158 / 0.61 0.56 0.48 1/215 81147
