# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 397 | [395.7, 399.2] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 809.8 | [809.3, 825.4] | 2.04 | [2.029, 2.08] | higher (worse) |
| idle-thr-copy | 1 | 6 | 396.2 | [395.8, 400.3] | 0.9981 | [0.9926, 1.008] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1.002, 95% CI [0.992, 1.007], half-width 0.00771 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 397 | [395.7, 399.2] |
| busy-thr | busy-thr | 6 | 809.8 | [809.3, 825.4] |
| idle-thr-copy | idle-thr-copy | 6 | 396.2 | [395.8, 400.3] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 1.991 | [0, 3.994] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 0 | [0, 0] | 0 | [0, n/a] | no measurable difference |
| idle-thr-copy | 1 | 6 | 0 | [0, 0] | 0 | [0, n/a] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 1.991 | [0, 3.994] |
| busy-thr | busy-thr | 6 | 0 | [0, 0] |
| idle-thr-copy | idle-thr-copy | 6 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 379 | [378.1, 381.1] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 785.1 | [785, 799.9] | 2.072 | [2.06, 2.112] | higher (worse) |
| idle-thr-copy | 1 | 6 | 378.2 | [377.8, 382.2] | 0.998 | [0.9922, 1.008] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1.002, 95% CI [0.9918, 1.008], half-width 0.00802 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 379 | [378.1, 381.1] |
| busy-thr | busy-thr | 6 | 785.1 | [785, 799.9] |
| idle-thr-copy | idle-thr-copy | 6 | 378.2 | [377.8, 382.2] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 377.3 | [374.9, 381.7] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 785.9 | [785.8, 800.7] | 2.083 | [2.059, 2.13] | higher (worse) |
| idle-thr-copy | 1 | 6 | 378.8 | [378.4, 382.8] | 1.004 | [0.9927, 1.015] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 0.996, 95% CI [0.9849, 1.007], half-width 0.01122 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 377.3 | [374.9, 381.7] |
| busy-thr | busy-thr | 6 | 785.9 | [785.8, 800.7] |
| idle-thr-copy | idle-thr-copy | 6 | 378.8 | [378.4, 382.8] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| idle-thr-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 1 | [1, 1] |
| busy-thr | busy-thr | 6 | 1 | [1, 1] |
| idle-thr-copy | idle-thr-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 1203000000 | [1201000000, 1207000000] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 2489000000 | [2489000000, 2493000000] | 2.069 | [2.062, 2.073] | higher (worse) |
| idle-thr-copy | 1 | 6 | 1202000000 | [1201000000, 1208000000] | 0.9988 | [0.9955, 1.004] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1.001, 95% CI [0.996, 1.005], half-width 0.004281 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 1203000000 | [1201000000, 1207000000] |
| busy-thr | busy-thr | 6 | 2489000000 | [2489000000, 2493000000] |
| idle-thr-copy | idle-thr-copy | 6 | 1202000000 | [1201000000, 1208000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | higher (worse) |
| idle-thr-copy | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 1, 95% CI [1, 1], half-width 4.318e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 3300000000 | [3300000000, 3300000000] |
| busy-thr | busy-thr | 6 | 3300000000 | [3300000000, 3300000000] |
| idle-thr-copy | idle-thr-copy | 6 | 3300000000 | [3300000000, 3300000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs idle-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| idle-thr | 1 | 6 | 0 | [0, 0.01165] | 1 | n/a | baseline |
| busy-thr | 1 | 6 | 1 | [1, 1] | n/a | [85.84, n/a] | no measurable difference |
| idle-thr-copy | 1 | 6 | 0.0111 | [0, 0.0253] | n/a | [0.9528, n/a] | no measurable difference |

A/A (idle-thr / idle-thr-copy): ratio 0, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| idle-thr | idle-thr | 6 | 0 | [0, 0.01165] |
| busy-thr | busy-thr | 6 | 1 | [1, 1] |
| idle-thr-copy | idle-thr-copy | 6 | 0.0111 | [0, 0.0253] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: 2-3 (online: 1)
- loadavg before / after: 0.87 0.26 0.17 1/210 12616 / 1.27 0.43 0.23 1/219 15895
