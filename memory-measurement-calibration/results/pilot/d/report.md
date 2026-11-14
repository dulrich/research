# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 64.3 | [64.3, 64.31] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 64.3 | [64.3, 64.31] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.00007776 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 64.3 | [64.3, 64.31] |
| probe-copy | probe-copy | 6 | 64.3 | [64.3, 64.31] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 64.3 | [64.3, 64.41] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 64.3 | [64.3, 64.36] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9992, 1.002], half-width 0.001166 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 64.3 | [64.3, 64.41] |
| probe-copy | probe-copy | 6 | 64.3 | [64.3, 64.36] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 0 | [0, 0] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 0 | [0, 0] |
| probe-copy | probe-copy | 6 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 73.34 | [72.88, 74.74] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 73.94 | [70.28, 74.98] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 0.9918, 95% CI [0.9774, 1.043], half-width 0.03303 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 73.34 | [72.88, 74.74] |
| probe-copy | probe-copy | 6 | 73.94 | [70.28, 74.98] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 64.11 | [64.11, 64.11] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 64.11 | [64.11, 64.11] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 64.11 | [64.11, 64.11] |
| probe-copy | probe-copy | 6 | 64.11 | [64.11, 64.11] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs bare | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bare | 1 | 6 | 72.19 | [71.95, 72.53] | 1 | n/a | baseline |
| probe | 1 | 6 | 73.34 | [72.88, 74.74] | 1.016 | [1.007, 1.035] | no measurable difference |
| probe-copy | 1 | 6 | 73.94 | [70.28, 74.98] | 1.024 | [0.9735, 1.039] | no measurable difference |

A/A (probe / probe-copy): ratio 0.9918, 95% CI [0.9772, 1.043], half-width 0.03313 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| bare | bare | 6 | 72.19 | [71.95, 72.53] |
| probe | probe | 6 | 73.34 | [72.88, 74.74] |
| probe-copy | probe-copy | 6 | 73.94 | [70.28, 74.98] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs bare | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bare | 1 | 6 | 65.47 | [65.42, 65.51] | 1 | n/a | baseline |
| probe | 1 | 6 | 65.45 | [65.43, 65.47] | 0.9996 | [0.999, 1.001] | no measurable difference |
| probe-copy | 1 | 6 | 65.45 | [65.42, 65.47] | 0.9996 | [0.9989, 1.001] | no measurable difference |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9995, 1], half-width 0.0004584 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| bare | bare | 6 | 65.47 | [65.42, 65.51] |
| probe | probe | 6 | 65.45 | [65.43, 65.47] |
| probe-copy | probe-copy | 6 | 65.45 | [65.42, 65.47] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 6 | 65.43 | [65.41, 65.46] | n/a | n/a | no baseline |
| probe-copy | 1 | 6 | 65.41 | [65.4, 65.47] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9994, 1.001], half-width 0.0006877 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 6 | 65.43 | [65.41, 65.46] |
| probe-copy | probe-copy | 6 | 65.41 | [65.4, 65.47] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.35 2.71 3.00 1/1998 3372201 / 2.47 2.71 2.99 1/2055 3375561
