# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 234.1 | [233.6, 235.8] | 1 | n/a | baseline |
| later | 1 | 6 | 232.6 | [231.8, 233] | 0.9934 | [0.9853, 0.9963] | lower (better) |
| fresh-copy | 1 | 6 | 233.9 | [233.6, 234.3] | 0.9993 | [0.9918, 1.002] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1.001, 95% CI [0.9981, 1.008], half-width 0.005065 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 234.1 | [233.6, 235.8] |
| later | later | 6 | 232.6 | [231.8, 233] |
| fresh-copy | fresh-copy | 6 | 233.9 | [233.6, 234.3] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 0 | [0, 1.996] | 1 | n/a | baseline |
| later | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| fresh-copy | 1 | 6 | 0 | [0, 1.996] | n/a | [0, n/a] | no measurable difference |

A/A (fresh / fresh-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 0 | [0, 1.996] |
| later | later | 6 | 0 | [0, 0] |
| fresh-copy | fresh-copy | 6 | 0 | [0, 1.996] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 223.3 | [223.3, 224.9] | 1 | n/a | baseline |
| later | 1 | 6 | 223.1 | [222.4, 223.4] | 0.9988 | [0.992, 1] | no measurable difference |
| fresh-copy | 1 | 6 | 223.3 | [223.1, 223.5] | 0.9998 | [0.993, 1.001] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [0.9993, 1.007], half-width 0.00384 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 223.3 | [223.3, 224.9] |
| later | later | 6 | 223.1 | [222.4, 223.4] |
| fresh-copy | fresh-copy | 6 | 223.3 | [223.1, 223.5] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 223.5 | [221.5, 225.1] | 1 | n/a | baseline |
| later | 1 | 6 | 223.2 | [222.6, 223.6] | 0.9988 | [0.9911, 1.008] | no measurable difference |
| fresh-copy | 1 | 6 | 223.4 | [221.4, 223.7] | 0.9995 | [0.99, 1.009] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [0.9915, 1.01], half-width 0.009282 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 223.5 | [221.5, 225.1] |
| later | later | 6 | 223.2 | [222.6, 223.6] |
| fresh-copy | fresh-copy | 6 | 223.4 | [221.4, 223.7] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| later | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| pair | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| fresh-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 1 | [1, 1] |
| later | later | 6 | 1 | [1, 1] |
| pair | pair | 6 | 1 | [1, 1] |
| fresh-copy | fresh-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 1200000000 | [1200000000, 1201000000] | 1 | n/a | baseline |
| later | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 1 | [0.9998, 1] | no measurable difference |
| fresh-copy | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 1 | [0.9998, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.0001235 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 1200000000 | [1200000000, 1201000000] |
| later | later | 6 | 1200000000 | [1200000000, 1200000000] |
| fresh-copy | fresh-copy | 6 | 1200000000 | [1200000000, 1200000000] |

## first_cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 233.6 | [233.4, 233.9] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 233.6 | [233.4, 233.9] |

## first_cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 0 | [0, 0] |

## first_cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 223.3 | [223.1, 223.4] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 223.3 | [223.1, 223.4] |

## first_cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 223.4 | [223.2, 223.5] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 223.4 | [223.2, 223.5] |

## first_cycles_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 1200000000 | [1200000000, 1200000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 1200000000 | [1200000000, 1200000000] |

## first_instructions_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 1500000000 | [1500000000, 1500000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 1500000000 | [1500000000, 1500000000] |

## first_sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 0 | [0, 0] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| later | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| fresh-copy | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (fresh / fresh-copy): ratio 1, 95% CI [1, 1], half-width 1.65e-8 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 1500000000 | [1500000000, 1500000000] |
| later | later | 6 | 1500000000 | [1500000000, 1500000000] |
| fresh-copy | fresh-copy | 6 | 1500000000 | [1500000000, 1500000000] |

## second_cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 232.3 | [232, 232.9] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 232.3 | [232, 232.9] |

## second_cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 0 | [0, 1.994] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 0 | [0, 1.994] |

## second_cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 223.3 | [223.1, 223.5] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 223.3 | [223.1, 223.5] |

## second_cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 223.4 | [221.3, 223.6] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 223.4 | [221.3, 223.6] |

## second_cycles_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 1200000000 | [1200000000, 1200000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 1200000000 | [1200000000, 1200000000] |

## second_instructions_u

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 1500000000 | [1500000000, 1500000000] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 1500000000 | [1500000000, 1500000000] |

## second_sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pair | 1 | 6 | 0 | [0, 0] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pair | pair | 6 | 0 | [0, 0] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs fresh | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| fresh | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| later | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fresh-copy | 1 | 6 | 0 | [0, 0.02085] | n/a | [n/a, n/a] | no measurable difference |

A/A (fresh / fresh-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| fresh | fresh | 6 | 0 | [0, 0] |
| later | later | 6 | 0 | [0, 0] |
| fresh-copy | fresh-copy | 6 | 0 | [0, 0.02085] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 3.10 2.67 2.70 2/2062 1885651 / 3.44 2.78 2.74 1/2093 1889691
