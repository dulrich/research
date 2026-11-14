# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 234 | [233.9, 234.4] | 1 | n/a | baseline |
| later | 1 | 30 | 232.8 | [232.6, 233] | 0.9945 | [0.9929, 0.9957] | lower (better) |
| fresh-copy | 1 | 30 | 234.2 | [233.9, 234.6] | 1.001 | [0.9988, 1.002] | no measurable difference |

A/A (fresh / fresh-copy): ratio 0.9995, 95% CI [0.9977, 1.001], half-width 0.001763 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 234 | [233.9, 234.4] |
| later | later | 30 | 232.8 | [232.6, 233] |
| fresh-copy | fresh-copy | 30 | 234.2 | [233.9, 234.6] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| later | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fresh-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (fresh / fresh-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 0 | [0, 0] |
| later | later | 30 | 0 | [0, 0] |
| fresh-copy | fresh-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 223.5 | [223.4, 223.8] | 1 | n/a | baseline |
| later | 1 | 30 | 223.4 | [223.3, 223.5] | 0.9996 | [0.998, 1] | no measurable difference |
| fresh-copy | 1 | 30 | 223.7 | [223.4, 224.1] | 1.001 | [0.9989, 1.003] | no measurable difference |

A/A (fresh / fresh-copy): ratio 0.9992, 95% CI [0.9975, 1.001], half-width 0.001808 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 223.5 | [223.4, 223.8] |
| later | later | 30 | 223.4 | [223.3, 223.5] |
| fresh-copy | fresh-copy | 30 | 223.7 | [223.4, 224.1] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 223.6 | [223.5, 223.9] | 1 | n/a | baseline |
| later | 1 | 30 | 223.4 | [223.4, 223.6] | 0.9993 | [0.9978, 1] | no measurable difference |
| fresh-copy | 1 | 30 | 223.6 | [223.4, 224.1] | 1 | [0.9986, 1.002] | no measurable difference |

A/A (fresh / fresh-copy): ratio 0.9998, 95% CI [0.9976, 1.001], half-width 0.001884 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 223.6 | [223.5, 223.9] |
| later | later | 30 | 223.4 | [223.4, 223.6] |
| fresh-copy | fresh-copy | 30 | 223.6 | [223.4, 224.1] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| later | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| pair | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| fresh-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 1 | [1, 1] |
| later | later | 30 | 1 | [1, 1] |
| pair | pair | 30 | 1 | [1, 1] |
| fresh-copy | fresh-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| later | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | no measurable difference |
| fresh-copy | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [1, 1], half-width 0.00002181 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 1200000000 | [1200000000, 1200000000] |
| later | later | 30 | 1200000000 | [1200000000, 1200000000] |
| fresh-copy | fresh-copy | 30 | 1200000000 | [1200000000, 1200000000] |

## first_cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 234.3 | [233.9, 234.6] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 234.3 | [233.9, 234.6] |

## first_cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 0 | [0, 0] |

## first_cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 223.6 | [223.3, 223.9] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 223.6 | [223.3, 223.9] |

## first_cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 223.8 | [223.5, 224.1] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 223.8 | [223.5, 224.1] |

## first_cycles_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 1200000000 | [1200000000, 1200000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 1200000000 | [1200000000, 1200000000] |

## first_instructions_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 1500000000 | [1500000000, 1500000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 1500000000 | [1500000000, 1500000000] |

## first_sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 0 | [0, 0] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| later | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| fresh-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [1, 1], half-width 3.5e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 1500000000 | [1500000000, 1500000000] |
| later | later | 30 | 1500000000 | [1500000000, 1500000000] |
| fresh-copy | fresh-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## second_cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 232.7 | [232.5, 233.2] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 232.7 | [232.5, 233.2] |

## second_cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 0 | [0, 0] |

## second_cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 223.4 | [223.3, 223.6] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 223.4 | [223.3, 223.7] |

## second_cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 223.5 | [223.4, 223.6] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 223.5 | [223.4, 223.6] |

## second_cycles_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 1200000000 | [1200000000, 1200000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 1200000000 | [1200000000, 1200000000] |

## second_instructions_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 1500000000 | [1500000000, 1500000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 1500000000 | [1500000000, 1500000000] |

## second_sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 30 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 30 | 0 | [0, 0] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| later | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fresh-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (fresh / fresh-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 30 | 0 | [0, 0] |
| later | later | 30 | 0 | [0, 0] |
| fresh-copy | fresh-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 4.14 3.22 2.90 1/2119 2023303 / 4.33 3.61 3.08 3/2113 2045039
