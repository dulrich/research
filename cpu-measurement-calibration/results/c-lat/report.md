# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 234 | [233.8, 234.3] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 230.4 | [229.6, 230.9] | 0.9846 | [0.9812, 0.9872] | lower (better) |
| pinned-lat-copy | 1 | 30 | 234 | [233.8, 234.4] | 1 | [0.9982, 1.002] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 0.9998, 95% CI [0.9979, 1.002], half-width 0.001944 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 234 | [233.8, 234.3] |
| unpinned-lat | unpinned-lat | 30 | 230.4 | [229.6, 230.9] |
| pinned-lat-copy | pinned-lat-copy | 30 | 234 | [233.8, 234.4] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pinned-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 0 | [0, 0] |
| unpinned-lat | unpinned-lat | 30 | 0 | [0, 0] |
| pinned-lat-copy | pinned-lat-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 223.5 | [223.3, 223.8] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 218.6 | [218.1, 218.8] | 0.9781 | [0.9755, 0.9797] | lower (better) |
| pinned-lat-copy | 1 | 30 | 223.5 | [223.4, 223.8] | 1 | [0.9987, 1.002] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 0.9997, 95% CI [0.9984, 1.001], half-width 0.001465 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 223.5 | [223.3, 223.8] |
| unpinned-lat | unpinned-lat | 30 | 218.6 | [218.1, 218.8] |
| pinned-lat-copy | pinned-lat-copy | 30 | 223.5 | [223.4, 223.8] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 223.5 | [223.4, 223.8] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 218.8 | [217.8, 219.1] | 0.9789 | [0.9743, 0.9807] | lower (better) |
| pinned-lat-copy | 1 | 30 | 223.7 | [223.4, 223.9] | 1.001 | [0.9991, 1.002] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 0.9994, 95% CI [0.9981, 1.001], half-width 0.001411 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 223.5 | [223.4, 223.7] |
| unpinned-lat | unpinned-lat | 30 | 218.8 | [217.8, 219.1] |
| pinned-lat-copy | pinned-lat-copy | 30 | 223.7 | [223.4, 223.9] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 24 | [24, 24] | 24 | [24, 24] | higher (worse) |
| pinned-lat-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 1 | [1, 1] |
| unpinned-lat | unpinned-lat | 30 | 24 | [24, 24] |
| pinned-lat-copy | pinned-lat-copy | 30 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | higher (worse) |
| pinned-lat-copy | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [1, 1], half-width 0.00002312 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 1200000000 | [1200000000, 1200000000] |
| unpinned-lat | unpinned-lat | 30 | 1200000000 | [1200000000, 1200000000] |
| pinned-lat-copy | pinned-lat-copy | 30 | 1200000000 | [1200000000, 1200000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| pinned-lat-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [1, 1], half-width 2.666e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 1500000000 | [1500000000, 1500000000] |
| unpinned-lat | unpinned-lat | 30 | 1500000000 | [1500000000, 1500000000] |
| pinned-lat-copy | pinned-lat-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| unpinned-lat | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pinned-lat-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 30 | 0 | [0, 0] |
| unpinned-lat | unpinned-lat | 30 | 0 | [0, 0] |
| pinned-lat-copy | pinned-lat-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 4.33 3.61 3.08 1/2106 2045103 / 3.90 3.63 3.12 1/2103 2058862
