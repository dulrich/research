# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 397.3 | [397.2, 397.6] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 397.1 | [396.9, 397.5] | 0.9994 | [0.9984, 1.001] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 1.001, 95% CI [0.9994, 1.002], half-width 0.001072 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 397.3 | [397.2, 397.6] |
| offline-thr-copy | offline-thr-copy | 30 | 397.1 | [396.9, 397.5] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 0 | [0, 0] |
| offline-thr-copy | offline-thr-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 378.9 | [378.8, 379.3] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 379 | [378.8, 379.6] | 1 | [0.9991, 1.002] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 0.9997, 95% CI [0.9983, 1.001], half-width 0.001325 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 378.9 | [378.8, 379.3] |
| offline-thr-copy | offline-thr-copy | 30 | 379 | [378.8, 379.6] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 379.6 | [379.4, 379.9] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 379.5 | [379.4, 379.9] | 0.9998 | [0.9989, 1.001] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 1, 95% CI [0.9991, 1.001], half-width 0.0009946 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 379.6 | [379.4, 379.9] |
| offline-thr-copy | offline-thr-copy | 30 | 379.5 | [379.4, 379.9] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 1 | [1, 1] |
| offline-thr-copy | offline-thr-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | [1, 1] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 1, 95% CI [1, 1], half-width 0.00001694 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 1201000000 | [1201000000, 1201000000] |
| offline-thr-copy | offline-thr-copy | 30 | 1201000000 | [1201000000, 1201000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio 1, 95% CI [1, 1], half-width 4.545e-10 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 3300000000 | [3300000000, 3300000000] |
| offline-thr-copy | offline-thr-copy | 30 | 3300000000 | [3300000000, 3300000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs offline-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| offline-thr | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| offline-thr-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (offline-thr / offline-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| offline-thr | offline-thr | 30 | 0 | [0, 0] |
| offline-thr-copy | offline-thr-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: unavailable (online: 0)
- loadavg before / after: 1.18 1.32 0.77 1/211 58294 / 1.09 1.27 0.79 1/217 65657
