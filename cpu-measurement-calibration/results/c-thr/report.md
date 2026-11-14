# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 235.8 | [235.7, 236] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 231.3 | [230.6, 232.2] | 0.9811 | [0.9779, 0.9846] | lower (better) |
| pinned-thr-copy | 1 | 30 | 235.8 | [235.7, 236] | 1 | [0.9992, 1.001] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 0.9998, 95% CI [0.9989, 1.001], half-width 0.0009527 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 235.8 | [235.7, 236] |
| unpinned-thr | unpinned-thr | 30 | 231.3 | [230.6, 232.2] |
| pinned-thr-copy | pinned-thr-copy | 30 | 235.8 | [235.7, 236] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pinned-thr-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 0 | [0, 0] |
| unpinned-thr | unpinned-thr | 30 | 0 | [0, 0] |
| pinned-thr-copy | pinned-thr-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 225.4 | [225.3, 225.4] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 219.5 | [218.7, 220.2] | 0.9741 | [0.9706, 0.9775] | lower (better) |
| pinned-thr-copy | 1 | 30 | 225.3 | [225.3, 225.4] | 0.9998 | [0.9995, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [0.9997, 1.001], half-width 0.0004216 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 225.4 | [225.3, 225.4] |
| unpinned-thr | unpinned-thr | 30 | 219.5 | [218.7, 220.2] |
| pinned-thr-copy | pinned-thr-copy | 30 | 225.3 | [225.3, 225.4] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 225.5 | [225.4, 225.6] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 219.2 | [218.6, 220.3] | 0.9724 | [0.9693, 0.9772] | lower (better) |
| pinned-thr-copy | 1 | 30 | 225.4 | [225.3, 225.5] | 0.9998 | [0.9991, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [0.9998, 1.001], half-width 0.0005613 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 225.5 | [225.4, 225.6] |
| unpinned-thr | unpinned-thr | 30 | 219.2 | [218.6, 220.3] |
| pinned-thr-copy | pinned-thr-copy | 30 | 225.4 | [225.3, 225.5] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 24 | [24, 24] | 24 | [24, 24] | higher (worse) |
| pinned-thr-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 1 | [1, 1] |
| unpinned-thr | unpinned-thr | 30 | 24 | [24, 24] |
| pinned-thr-copy | pinned-thr-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 1202000000 | [1201000000, 1202000000] | 1.001 | [1.001, 1.001] | higher (worse) |
| pinned-thr-copy | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 0.9999 | [0.9999, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.00014 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 1200000000 | [1200000000, 1200000000] |
| unpinned-thr | unpinned-thr | 30 | 1202000000 | [1201000000, 1202000000] |
| pinned-thr-copy | pinned-thr-copy | 30 | 1200000000 | [1200000000, 1200000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |
| pinned-thr-copy | 1 | 30 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [1, 1], half-width 7.576e-10 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 3300000000 | [3300000000, 3300000000] |
| unpinned-thr | unpinned-thr | 30 | 3300000000 | [3300000000, 3300000000] |
| pinned-thr-copy | pinned-thr-copy | 30 | 3300000000 | [3300000000, 3300000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| unpinned-thr | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pinned-thr-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 30 | 0 | [0, 0] |
| unpinned-thr | unpinned-thr | 30 | 0 | [0, 0] |
| pinned-thr-copy | pinned-thr-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 3.90 3.63 3.12 4/2104 2058921 / 6.56 4.41 3.42 1/2110 2072803
