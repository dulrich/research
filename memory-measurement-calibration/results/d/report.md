# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 64.3 | [64.3, 64.3] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 64.3 | [64.3, 64.3] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 64.3 | [64.3, 64.3] |
| probe-copy | probe-copy | 30 | 64.3 | [64.3, 64.3] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 64.4 | [64.3, 64.4] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 64.3 | [64.3, 64.4] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1.002, 95% CI [0.9991, 1.002], half-width 0.001205 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 64.4 | [64.3, 64.4] |
| probe-copy | probe-copy | 30 | 64.3 | [64.3, 64.4] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 0 | [0, 0] |
| probe-copy | probe-copy | 30 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 73.31 | [73.15, 73.64] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 73.51 | [73.33, 73.7] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 0.9973, 95% CI [0.9939, 1.002], half-width 0.004287 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 73.31 | [73.14, 73.64] |
| probe-copy | probe-copy | 30 | 73.51 | [73.33, 73.7] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 64.11 | [64.11, 64.11] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 64.11 | [64.11, 64.11] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 64.11 | [64.11, 64.11] |
| probe-copy | probe-copy | 30 | 64.11 | [64.11, 64.11] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs bare | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bare | 1 | 30 | 71.93 | [71.81, 72.05] | 1 | n/a | baseline |
| probe | 1 | 30 | 73.31 | [73.15, 73.64] | 1.019 | [1.016, 1.024] | higher (worse) |
| probe-copy | 1 | 30 | 73.51 | [73.33, 73.7] | 1.022 | [1.019, 1.025] | higher (worse) |

A/A (probe / probe-copy): ratio 0.9973, 95% CI [0.9939, 1.002], half-width 0.004206 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| bare | bare | 30 | 71.93 | [71.81, 72.05] |
| probe | probe | 30 | 73.31 | [73.15, 73.64] |
| probe-copy | probe-copy | 30 | 73.51 | [73.33, 73.7] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs bare | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bare | 1 | 30 | 65.46 | [65.44, 65.48] | 1 | n/a | baseline |
| probe | 1 | 30 | 65.45 | [65.44, 65.47] | 0.9998 | [0.9995, 1] | no measurable difference |
| probe-copy | 1 | 30 | 65.45 | [65.43, 65.47] | 0.9998 | [0.9993, 1] | no measurable difference |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9997, 1], half-width 0.000382 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| bare | bare | 30 | 65.46 | [65.44, 65.48] |
| probe | probe | 30 | 65.45 | [65.44, 65.47] |
| probe-copy | probe-copy | 30 | 65.45 | [65.43, 65.47] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| probe | 1 | 30 | 65.42 | [65.4, 65.46] | n/a | n/a | no baseline |
| probe-copy | 1 | 30 | 65.42 | [65.42, 65.47] | n/a | n/a | no baseline |

A/A (probe / probe-copy): ratio 1, 95% CI [0.9992, 1.001], half-width 0.0006493 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| probe | probe | 30 | 65.42 | [65.4, 65.46] |
| probe-copy | probe-copy | 30 | 65.42 | [65.42, 65.47] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 5.48 4.13 3.49 2/2206 3674886 / 3.31 3.97 3.54 1/2335 3733737
