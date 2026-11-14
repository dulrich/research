# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 396.6 | [395.9, 397.1] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 809.7 | [809.4, 810] | 2.042 | [2.039, 2.046] | higher (worse) |
| idle-thr-copy | 1 | 30 | 396.6 | [396, 397.4] | 1 | [0.998, 1.003] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 0.9998, 95% CI [0.9975, 1.002], half-width 0.002265 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 396.6 | [395.9, 397.1] |
| busy-thr | busy-thr | 30 | 809.7 | [809.4, 810] |
| idle-thr-copy | idle-thr-copy | 30 | 396.6 | [396, 397.4] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| idle-thr-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 0 | [0, 0] |
| busy-thr | busy-thr | 30 | 0 | [0, 0] |
| idle-thr-copy | idle-thr-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 379.2 | [378.5, 379.5] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 785.2 | [784.7, 785.4] | 2.071 | [2.069, 2.075] | higher (worse) |
| idle-thr-copy | 1 | 30 | 378.8 | [378.5, 379.6] | 0.999 | [0.998, 1.002] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1.001, 95% CI [0.9978, 1.002], half-width 0.00209 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 379.2 | [378.5, 379.5] |
| busy-thr | busy-thr | 30 | 785.2 | [784.7, 785.4] |
| idle-thr-copy | idle-thr-copy | 30 | 378.8 | [378.5, 379.6] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 378.8 | [378.3, 379.8] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 785.9 | [785.4, 786.1] | 2.075 | [2.069, 2.078] | higher (worse) |
| idle-thr-copy | 1 | 30 | 379.3 | [378.9, 380.1] | 1.001 | [0.9987, 1.004] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 0.9987, 95% CI [0.9961, 1.001], half-width 0.0026 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 378.8 | [378.3, 379.8] |
| busy-thr | busy-thr | 30 | 785.9 | [785.4, 786.1] |
| idle-thr-copy | idle-thr-copy | 30 | 379.3 | [378.9, 380.1] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| idle-thr-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 1 | [1, 1] |
| busy-thr | busy-thr | 30 | 1 | [1, 1] |
| idle-thr-copy | idle-thr-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 1203000000 | [1202000000, 1205000000] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 2489000000 | [2489000000, 2489000000] | 2.068 | [2.066, 2.071] | higher (worse) |
| idle-thr-copy | 1 | 30 | 1203000000 | [1202000000, 1204000000] | 1 | [0.9987, 1.001] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1, 95% CI [0.9987, 1.001], half-width 0.001339 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 1203000000 | [1202000000, 1205000000] |
| busy-thr | busy-thr | 30 | 2489000000 | [2489000000, 2489000000] |
| idle-thr-copy | idle-thr-copy | 30 | 1203000000 | [1202000000, 1204000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | higher (worse) |
| idle-thr-copy | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1, 95% CI [1, 1], half-width 3.03e-10 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 3300000000 | [3300000000, 3300000000] |
| busy-thr | busy-thr | 30 | 3300000000 | [3300000000, 3300000000] |
| idle-thr-copy | idle-thr-copy | 30 | 3300000000 | [3300000000, 3300000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 30 | 0 | [0, 0.0244] | 1 | n/a | baseline |
| busy-thr | 1 | 30 | 1 | [1, 1] | n/a | [40.98, n/a] | no measurable difference |
| idle-thr-copy | 1 | 30 | 0 | [0, 0.02415] | n/a | [0, n/a] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 30 | 0 | [0, 0.0244] |
| busy-thr | busy-thr | 30 | 1 | [1, 1] |
| idle-thr-copy | idle-thr-copy | 30 | 0 | [0, 0.02415] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: 2-3 (online: 1)
- loadavg before / after: 1.88 1.25 0.57 1/220 35688 / 1.82 1.42 0.74 1/221 50347
