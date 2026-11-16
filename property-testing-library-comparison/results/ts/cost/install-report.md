# Measurement report

Seed 1; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## first_run_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| install/hegel | 1 | 10 | 51.03 | [49.61, 52.26] | n/a | n/a | no baseline |
| install/fastcheck | 1 | 10 | 28.8 | [25.77, 29.61] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| install/hegel | install/hegel | 10 | 51.03 | [49.61, 52.26] |
| install/fastcheck | install/fastcheck | 10 | 28.8 | [25.77, 29.61] |

## install_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| install/hegel | 1 | 10 | 3.523 | [3.358, 3.725] | n/a | n/a | no baseline |
| install/fastcheck | 1 | 10 | 2.871 | [2.848, 3.028] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| install/hegel | install/hegel | 10 | 3.523 | [3.358, 3.755] |
| install/fastcheck | install/fastcheck | 10 | 2.871 | [2.848, 3.028] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 4.01 3.75 3.65 1/2027 1294450 / 3.92 3.74 3.65 5/2031 1295470
