# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 396.8 | [396.6, 398.1] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 397.2 | [396.9, 397.9] | 1.001 | [0.9979, 1.003] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 0.9988, 95% CI [0.9971, 1.002], half-width 0.002484 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 396.8 | [396.6, 398.1] |
| offline-lat-copy | offline-lat-copy | 6 | 397.2 | [396.9, 397.9] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 0 | [0, 1.997] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 0 | [0, 1.997] |
| offline-lat-copy | offline-lat-copy | 6 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 378.8 | [378.6, 379.5] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 378.9 | [378.7, 379.5] | 1 | [0.9985, 1.002] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 0.9997, 95% CI [0.9982, 1.002], half-width 0.001661 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 378.8 | [378.6, 379.5] |
| offline-lat-copy | offline-lat-copy | 6 | 378.9 | [378.7, 379.5] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 379.2 | [377.3, 380.2] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 379.6 | [379.3, 380.1] | 1.001 | [0.9987, 1.006] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 0.999, 95% CI [0.9938, 1.001], half-width 0.003746 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 379.2 | [377.3, 380.2] |
| offline-lat-copy | offline-lat-copy | 6 | 379.6 | [379.3, 380.1] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 1 | [1, 1] |
| offline-lat-copy | offline-lat-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 1201000000 | [1201000000, 1201000000] | 1 | [0.9999, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 0.0000431 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 1201000000 | [1201000000, 1201000000] |
| offline-lat-copy | offline-lat-copy | 6 | 1201000000 | [1201000000, 1201000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 6e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 1500000000 | [1500000000, 1500000000] |
| offline-lat-copy | offline-lat-copy | 6 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 6 | 0 | [0, 0] |
| offline-lat-copy | offline-lat-copy | 6 | 0 | [0, 0] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: unavailable (online: 0)
- loadavg before / after: 1.07 0.41 0.22 1/211 16107 / 1.22 0.46 0.24 1/224 17764
