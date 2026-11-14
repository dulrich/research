# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 396.1 | [395.8, 396.9] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 402.8 | [402.5, 404.5] | 1.017 | [1.015, 1.021] | higher (worse) |
| idle-lat-copy | 1 | 6 | 396.2 | [395.6, 398] | 1 | [0.998, 1.005] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 0.9998, 95% CI [0.9954, 1.002], half-width 0.003335 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 396.1 | [395.8, 396.9] |
| busy-lat | busy-lat | 6 | 402.8 | [402.5, 404.5] |
| idle-lat-copy | idle-lat-copy | 6 | 396.2 | [395.6, 398] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 0 | [0, 3.986] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| idle-lat-copy | 1 | 6 | 0 | [0, 3.983] | n/a | [0, n/a] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 0 | [0, 3.986] |
| busy-lat | busy-lat | 6 | 0 | [0, 0] |
| idle-lat-copy | idle-lat-copy | 6 | 0 | [0, 3.983] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 378.2 | [377.9, 378.7] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 378.6 | [378.5, 380.2] | 1.001 | [0.9998, 1.005] | no measurable difference |
| idle-lat-copy | 1 | 6 | 378.4 | [377.8, 380.1] | 1 | [0.9987, 1.005] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 0.9995, 95% CI [0.9952, 1.001], half-width 0.003062 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 378.2 | [377.9, 378.7] |
| busy-lat | busy-lat | 6 | 378.6 | [378.5, 380.2] |
| idle-lat-copy | idle-lat-copy | 6 | 378.4 | [377.8, 380.1] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 378.5 | [374.7, 379.3] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 379.3 | [379.2, 381] | 1.002 | [1, 1.013] | no measurable difference |
| idle-lat-copy | 1 | 6 | 378.9 | [374.4, 380.6] | 1.001 | [0.9889, 1.012] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 0.9989, 95% CI [0.9881, 1.011], half-width 0.01157 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 378.5 | [374.7, 379.3] |
| busy-lat | busy-lat | 6 | 379.3 | [379.2, 381] |
| idle-lat-copy | idle-lat-copy | 6 | 378.9 | [374.4, 380.6] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| idle-lat-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 1 | [1, 1] |
| busy-lat | busy-lat | 6 | 1 | [1, 1] |
| idle-lat-copy | idle-lat-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 1201000000 | [1201000000, 1201000000] | 0.9999 | [0.9997, 1] | no measurable difference |
| idle-lat-copy | 1 | 6 | 1201000000 | [1201000000, 1202000000] | 1 | [0.9997, 1.001] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [0.9994, 1], half-width 0.0004685 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 1201000000 | [1201000000, 1201000000] |
| busy-lat | busy-lat | 6 | 1201000000 | [1201000000, 1201000000] |
| idle-lat-copy | idle-lat-copy | 6 | 1201000000 | [1201000000, 1202000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| idle-lat-copy | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 1, 95% CI [1, 1], half-width 7.666e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 1500000000 | [1500000000, 1500000000] |
| busy-lat | busy-lat | 6 | 1500000000 | [1500000000, 1500000000] |
| idle-lat-copy | idle-lat-copy | 6 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs idle-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-lat | 1 | 6 | 0 | [0, 0.025] | 1 | n/a | baseline |
| busy-lat | 1 | 6 | 1 | [1, 1] | n/a | [40, n/a] | no measurable difference |
| idle-lat-copy | 1 | 6 | 0.0119 | [0, 0.025] | n/a | [0, n/a] | no measurable difference |

A/A (idle-lat / idle-lat-copy): ratio 0, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-lat | idle-lat | 6 | 0 | [0, 0.025] |
| busy-lat | busy-lat | 6 | 1 | [1, 1] |
| idle-lat-copy | idle-lat-copy | 6 | 0.0119 | [0, 0.025] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: 2-3 (online: 1)
- loadavg before / after: 0.01 0.02 0.09 1/207 9369 / 1.12 0.28 0.17 1/218 12535
