# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 16.3 | [16.3, 16.31] | 0.2535 | [0.2535, 0.2537] | lower (better) |
| a64 | 1 | 6 | 64.3 | [64.3, 64.31] | 1 | n/a | baseline |
| a256 | 1 | 6 | 256.3 | [256.3, 256.3] | 3.986 | [3.986, 3.986] | higher (worse) |
| a64-copy | 1 | 6 | 64.3 | [64.3, 64.31] | 1 | [0.9999, 1] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.00007776 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 16.3 | [16.3, 16.31] |
| a64 | a64 | 6 | 64.3 | [64.3, 64.31] |
| a256 | a256 | 6 | 256.3 | [256.3, 256.3] |
| a64-copy | a64-copy | 6 | 64.3 | [64.3, 64.31] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 16.31 | [16.3, 16.4] | 0.2536 | [0.2532, 0.2551] | lower (better) |
| a64 | 1 | 6 | 64.31 | [64.3, 64.4] | 1 | n/a | baseline |
| a256 | 1 | 6 | 256.3 | [256.3, 256.4] | 3.986 | [3.98, 3.988] | higher (worse) |
| a64-copy | 1 | 6 | 64.31 | [64.3, 64.4] | 1 | [0.9984, 1.002] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [0.9984, 1.002], half-width 0.001554 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 16.31 | [16.3, 16.4] |
| a64 | a64 | 6 | 64.31 | [64.3, 64.4] |
| a256 | a256 | 6 | 256.3 | [256.3, 256.4] |
| a64-copy | a64-copy | 6 | 64.31 | [64.3, 64.4] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| a64 | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| a256 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| a64-copy | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (a64 / a64-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 0 | [0, 0] |
| a64 | a64 | 6 | 0 | [0, 0] |
| a256 | a256 | 6 | 0 | [0, 0] |
| a64-copy | a64-copy | 6 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 25.86 | [25.27, 27.19] | 0.3516 | [0.3432, 0.3697] | lower (better) |
| a64 | 1 | 6 | 73.55 | [73.22, 74.21] | 1 | n/a | baseline |
| a256 | 1 | 6 | 265.6 | [265.3, 266.5] | 3.611 | [3.579, 3.629] | higher (worse) |
| a64-copy | 1 | 6 | 74.31 | [73.54, 75.37] | 1.01 | [0.998, 1.026] | no measurable difference |

A/A (a64 / a64-copy): ratio 0.9897, 95% CI [0.975, 1.002], half-width 0.01354 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 25.86 | [25.27, 27.19] |
| a64 | a64 | 6 | 73.55 | [73.22, 74.21] |
| a256 | a256 | 6 | 265.6 | [265.3, 266.5] |
| a64-copy | a64-copy | 6 | 74.31 | [73.54, 75.37] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 16.11 | [16.11, 16.11] | 0.2513 | [0.2513, 0.2513] | lower (better) |
| a64 | 1 | 6 | 64.11 | [64.11, 64.11] | 1 | n/a | baseline |
| a256 | 1 | 6 | 256.1 | [256.1, 256.1] | 3.995 | [3.995, 3.995] | higher (worse) |
| a64-copy | 1 | 6 | 64.11 | [64.11, 64.11] | 1 | [1, 1] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 16.11 | [16.11, 16.11] |
| a64 | a64 | 6 | 64.11 | [64.11, 64.11] |
| a256 | a256 | 6 | 256.1 | [256.1, 256.1] |
| a64-copy | a64-copy | 6 | 64.11 | [64.11, 64.11] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 25.86 | [25.27, 27.19] | 0.3516 | [0.3432, 0.3694] | lower (better) |
| a64 | 1 | 6 | 73.55 | [73.22, 74.21] | 1 | n/a | baseline |
| a256 | 1 | 6 | 265.6 | [265.3, 266.5] | 3.611 | [3.579, 3.629] | higher (worse) |
| a64-copy | 1 | 6 | 74.31 | [73.54, 75.37] | 1.01 | [0.998, 1.026] | no measurable difference |

A/A (a64 / a64-copy): ratio 0.9897, 95% CI [0.975, 1.002], half-width 0.01354 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 25.86 | [25.27, 27.19] |
| a64 | a64 | 6 | 73.55 | [73.22, 74.21] |
| a256 | a256 | 6 | 265.6 | [265.3, 266.5] |
| a64-copy | a64-copy | 6 | 74.31 | [73.54, 75.37] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 17.43 | [17.38, 17.52] | 0.2665 | [0.2657, 0.2677] | lower (better) |
| a64 | 1 | 6 | 65.41 | [65.4, 65.48] | 1 | n/a | baseline |
| a256 | 1 | 6 | 257.5 | [257.4, 257.5] | 3.936 | [3.932, 3.937] | higher (worse) |
| a64-copy | 1 | 6 | 65.47 | [65.45, 65.51] | 1.001 | [0.9998, 1.001] | no measurable difference |

A/A (a64 / a64-copy): ratio 0.9992, 95% CI [0.9985, 1], half-width 0.0008397 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 17.43 | [17.38, 17.52] |
| a64 | a64 | 6 | 65.41 | [65.4, 65.48] |
| a256 | a256 | 6 | 257.5 | [257.4, 257.5] |
| a64-copy | a64-copy | 6 | 65.47 | [65.45, 65.51] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a16 | 1 | 6 | 17.43 | [17.38, 17.48] | 0.2665 | [0.2657, 0.2673] | lower (better) |
| a64 | 1 | 6 | 65.41 | [65.4, 65.47] | 1 | n/a | baseline |
| a256 | 1 | 6 | 257.4 | [257.4, 257.5] | 3.935 | [3.932, 3.937] | higher (worse) |
| a64-copy | 1 | 6 | 65.44 | [65.38, 65.48] | 1 | [0.9989, 1.001] | no measurable difference |

A/A (a64 / a64-copy): ratio 0.9997, 95% CI [0.9989, 1.001], half-width 0.001146 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a16 | a16 | 6 | 17.43 | [17.38, 17.48] |
| a64 | a64 | 6 | 65.41 | [65.4, 65.47] |
| a256 | a256 | 6 | 257.4 | [257.4, 257.5] |
| a64-copy | a64-copy | 6 | 65.44 | [65.38, 65.48] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.43 2.69 2.98 1/2007 3375668 / 2.92 2.83 3.02 1/2019 3379610
