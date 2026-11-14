# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 397.5 | [397.3, 397.7] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 397.3 | [397.1, 397.6] | 0.9996 | [0.9987, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [0.9996, 1.001], half-width 0.0008559 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 397.5 | [397.3, 397.7] |
| offline-lat-copy | offline-lat-copy | 30 | 397.3 | [397.1, 397.6] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 0 | [0, 0] |
| offline-lat-copy | offline-lat-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 379.1 | [378.9, 379.6] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 379 | [378.8, 379.4] | 0.9998 | [0.9982, 1.001] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [0.9992, 1.002], half-width 0.001312 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 379.1 | [378.9, 379.6] |
| offline-lat-copy | offline-lat-copy | 30 | 379 | [378.8, 379.4] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 379.7 | [379.5, 380.1] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 379.6 | [379.5, 379.9] | 0.9996 | [0.9984, 1.001] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [0.9994, 1.002], half-width 0.001088 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 379.7 | [379.5, 380.1] |
| offline-lat-copy | offline-lat-copy | 30 | 379.6 | [379.5, 379.9] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 1 | [1, 1] |
| offline-lat-copy | offline-lat-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | [1, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 0.0000169 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 1201000000 | [1201000000, 1201000000] |
| offline-lat-copy | offline-lat-copy | 30 | 1201000000 | [1201000000, 1201000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio 1, 95% CI [1, 1], half-width 2e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 1500000000 | [1500000000, 1500000000] |
| offline-lat-copy | offline-lat-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs offline-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-lat | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| offline-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (offline-lat / offline-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-lat | offline-lat | 30 | 0 | [0, 0] |
| offline-lat-copy | offline-lat-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: unavailable (online: 0)
- loadavg before / after: 1.54 1.37 0.73 1/213 50579 / 1.51 1.39 0.78 1/220 57966
