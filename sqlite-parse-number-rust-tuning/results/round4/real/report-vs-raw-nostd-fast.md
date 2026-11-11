# Measurement report

Seed 20261110; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## instr_per_row (instr)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 249.5 | [249.5, 249.5] | 0.996 | [0.9881, 1] | faster |
| raw-fast | 3 | 90 | 250.5 | [249.5, 252.5] | 1 | [0.9881, 1.012] | no measurable difference |
| raw-nostd-fast | 3 | 90 | 250.5 | [249.5, 252.5] | 1 | n/a | baseline |
| raw-nostd-fast-strtod | 3 | 90 | 250.5 | [249.5, 252.5] | 1 | [0.9881, 1.012] | no measurable difference |
| safe-std | 3 | 90 | 257.4 | [257.4, 259.4] | 1.027 | [1.019, 1.04] | slower |
| safe-nostd | 3 | 90 | 257.4 | [257.4, 259.4] | 1.027 | [1.019, 1.04] | slower |
| c-fast-copy | 3 | 90 | 249.5 | [249.5, 249.5] | 0.996 | [0.9881, 1] | faster |

A/A (c-fast / c-fast-copy): ratio 1, 95% CI [1, 1], half-width 2.004e-7 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 249.5 | [249.5, 249.5] |
| c-fast | c-fast-a32 | 30 | 249.5 | [249.5, 249.5] |
| c-fast | c-fast-a64 | 30 | 249.5 | [249.5, 249.5] |
| raw-fast | raw-fast-a16 | 30 | 249.5 | [249.5, 249.5] |
| raw-fast | raw-fast-a32 | 30 | 250.5 | [250.5, 250.5] |
| raw-fast | raw-fast-a64 | 30 | 252.5 | [252.5, 252.5] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 249.5 | [249.5, 249.5] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 250.5 | [250.5, 250.5] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 252.5 | [252.5, 252.5] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 249.5 | [249.5, 249.5] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 250.5 | [250.5, 250.5] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 252.5 | [252.5, 252.5] |
| safe-std | safe-std-a16 | 30 | 257.4 | [257.4, 257.4] |
| safe-std | safe-std-a32 | 30 | 257.4 | [257.4, 257.4] |
| safe-std | safe-std-a64 | 30 | 259.4 | [259.4, 259.4] |
| safe-nostd | safe-nostd-a16 | 30 | 257.4 | [257.4, 257.4] |
| safe-nostd | safe-nostd-a32 | 30 | 257.4 | [257.4, 257.4] |
| safe-nostd | safe-nostd-a64 | 30 | 259.4 | [259.4, 259.4] |
| c-fast-copy | c-fast-copy-a16 | 30 | 249.5 | [249.5, 249.5] |
| c-fast-copy | c-fast-copy-a32 | 30 | 249.5 | [249.5, 249.5] |
| c-fast-copy | c-fast-copy-a64 | 30 | 249.5 | [249.5, 249.5] |

## ns_per_row (ns)

| group | builds | n | median | 95% CI | ratio vs raw-nostd-fast | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c-fast | 3 | 90 | 37.48 | [35.25, 38.18] | 1.246 | [1.156, 1.278] | slower |
| raw-fast | 3 | 90 | 31.91 | [31.5, 32.28] | 1.061 | [1.032, 1.077] | no measurable difference |
| raw-nostd-fast | 3 | 90 | 30.08 | [29.78, 30.69] | 1 | n/a | baseline |
| raw-nostd-fast-strtod | 3 | 90 | 30.07 | [29.21, 31.92] | 0.9997 | [0.9578, 1.064] | no measurable difference |
| safe-std | 3 | 90 | 32.24 | [30.97, 33.37] | 1.072 | [1.016, 1.116] | no measurable difference |
| safe-nostd | 3 | 90 | 32.44 | [32.12, 32.6] | 1.078 | [1.052, 1.093] | slower |
| c-fast-copy | 3 | 90 | 37.48 | [35.14, 38.2] | 1.246 | [1.151, 1.277] | slower |

A/A (c-fast / c-fast-copy): ratio 0.9999, 95% CI [0.929, 1.081], half-width 0.07619 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c-fast | c-fast-a16 | 30 | 35.25 | [35.19, 35.35] |
| c-fast | c-fast-a32 | 30 | 38.19 | [38.14, 38.27] |
| c-fast | c-fast-a64 | 30 | 37.52 | [37.39, 37.59] |
| raw-fast | raw-fast-a16 | 30 | 31.48 | [31.35, 31.62] |
| raw-fast | raw-fast-a32 | 30 | 32.3 | [32.04, 32.39] |
| raw-fast | raw-fast-a64 | 30 | 31.96 | [31.87, 32.03] |
| raw-nostd-fast | raw-nostd-fast-a16 | 30 | 29.78 | [29.72, 29.82] |
| raw-nostd-fast | raw-nostd-fast-a32 | 30 | 30.09 | [29.99, 30.18] |
| raw-nostd-fast | raw-nostd-fast-a64 | 30 | 30.69 | [30.65, 30.77] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a16 | 30 | 29.19 | [29.07, 29.29] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a32 | 30 | 30.1 | [30.02, 30.19] |
| raw-nostd-fast-strtod | raw-nostd-fast-strtod-a64 | 30 | 31.92 | [31.7, 32.03] |
| safe-std | safe-std-a16 | 30 | 30.96 | [30.84, 31.09] |
| safe-std | safe-std-a32 | 30 | 33.37 | [33.28, 33.46] |
| safe-std | safe-std-a64 | 30 | 32.23 | [32.12, 32.3] |
| safe-nostd | safe-nostd-a16 | 30 | 32.59 | [32.47, 32.75] |
| safe-nostd | safe-nostd-a32 | 30 | 32.53 | [32.35, 32.63] |
| safe-nostd | safe-nostd-a64 | 30 | 32.12 | [32, 32.23] |
| c-fast-copy | c-fast-copy-a16 | 30 | 35.13 | [34.98, 35.22] |
| c-fast-copy | c-fast-copy-a32 | 30 | 38.21 | [38.09, 38.31] |
| c-fast-copy | c-fast-copy-a64 | 30 | 37.55 | [37.43, 37.66] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: performance / intel_cpufreq
- boost: unavailable (intel no_turbo: 1)
- SMT: control on, active 1
- pinned CPU siblings: 2 (online: 1)
- loadavg before / after: 0.64 0.63 0.58 1/205 236841 / 0.46 0.57 0.56 1/206 315050
