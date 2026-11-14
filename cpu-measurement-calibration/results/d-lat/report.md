# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 395.7 | [395.4, 396] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 402.9 | [402.7, 403.3] | 1.018 | [1.017, 1.019] | higher (worse) |
| idle-lat-copy | 1 | 30 | 395.5 | [395.4, 395.6] | 0.9997 | [0.9986, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [0.9996, 1.001], half-width 0.000907 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 395.7 | [395.4, 396] |
| busy-lat | busy-lat | 30 | 402.9 | [402.7, 403.3] |
| idle-lat-copy | idle-lat-copy | 30 | 395.5 | [395.4, 395.7] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| idle-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 0 | [0, 0] |
| busy-lat | busy-lat | 30 | 0 | [0, 0] |
| idle-lat-copy | idle-lat-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 378.1 | [377.8, 378.5] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 379.2 | [378.9, 379.6] | 1.003 | [1.001, 1.004] | higher (worse) |
| idle-lat-copy | 1 | 30 | 378 | [377.8, 378.1] | 0.9996 | [0.9986, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [0.9995, 1.001], half-width 0.000946 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 378.1 | [377.8, 378.5] |
| busy-lat | busy-lat | 30 | 379.2 | [378.9, 379.6] |
| idle-lat-copy | idle-lat-copy | 30 | 378 | [377.8, 378.1] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 378.4 | [378.2, 378.7] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 379.9 | [379.6, 380.3] | 1.004 | [1.003, 1.005] | higher (worse) |
| idle-lat-copy | 1 | 30 | 378.4 | [378.2, 378.5] | 1 | [0.9992, 1.001] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 0.9999, 95% CI [0.9993, 1.001], half-width 0.0007385 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 378.4 | [378.2, 378.7] |
| busy-lat | busy-lat | 30 | 379.9 | [379.6, 380.3] |
| idle-lat-copy | idle-lat-copy | 30 | 378.4 | [378.2, 378.5] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| idle-lat-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 1 | [1, 1] |
| busy-lat | busy-lat | 30 | 1 | [1, 1] |
| idle-lat-copy | idle-lat-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | [1, 1] | no measurable difference |
| idle-lat-copy | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | [0.9999, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.0001362 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 1201000000 | [1201000000, 1201000000] |
| busy-lat | busy-lat | 30 | 1201000000 | [1201000000, 1201000000] |
| idle-lat-copy | idle-lat-copy | 30 | 1201000000 | [1201000000, 1201000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| idle-lat-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [1, 1], half-width 9.999e-10 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 1500000000 | [1500000000, 1500000000] |
| busy-lat | busy-lat | 30 | 1500000000 | [1500000000, 1500000000] |
| idle-lat-copy | idle-lat-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 30 | 0 | [0, 0.0244] | 1 | n/a | baseline |
| busy-lat | 1 | 30 | 1 | [1, 1] | n/a | [40.98, n/a] | no measurable difference |
| idle-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 30 | 0 | [0, 0.0244] |
| busy-lat | busy-lat | 30 | 1 | [1, 1] |
| idle-lat-copy | idle-lat-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: 2-3 (online: 1)
- loadavg before / after: 1.56 0.79 0.32 1/226 20972 / 2.05 1.27 0.57 2/220 35630
