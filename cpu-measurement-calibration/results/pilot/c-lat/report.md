# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 234.1 | [233.9, 235.6] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 229.9 | [227.7, 233.7] | 0.9822 | [0.9722, 0.9981] | lower (better) |
| pinned-lat-copy | 1 | 6 | 234 | [233.5, 235.9] | 0.9994 | [0.9931, 1.008] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1.001, 95% CI [0.9924, 1.007], half-width 0.007258 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 234.1 | [233.9, 235.6] |
| unpinned-lat | unpinned-lat | 6 | 229.9 | [227.7, 233.7] |
| pinned-lat-copy | pinned-lat-copy | 6 | 234 | [233.5, 235.9] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 1.982 | [0, 3.996] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 0 | [0, 0] | 0 | [0, n/a] | no measurable difference |
| pinned-lat-copy | 1 | 6 | 0 | [0, 0] | 0 | [0, n/a] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 1.982 | [0, 3.996] |
| unpinned-lat | unpinned-lat | 6 | 0 | [0, 0] |
| pinned-lat-copy | pinned-lat-copy | 6 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 223.6 | [223.5, 224.7] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 218.4 | [215.9, 221.2] | 0.9767 | [0.9652, 0.9891] | lower (better) |
| pinned-lat-copy | 1 | 6 | 223.4 | [223.3, 224.5] | 0.9993 | [0.9943, 1.004] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1.001, 95% CI [0.9963, 1.006], half-width 0.004726 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 223.6 | [223.5, 224.7] |
| unpinned-lat | unpinned-lat | 6 | 218.4 | [215.9, 221.2] |
| pinned-lat-copy | pinned-lat-copy | 6 | 223.4 | [223.3, 224.5] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 222.8 | [219.8, 223.7] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 218.6 | [216.1, 221.6] | 0.9815 | [0.9668, 1.002] | no measurable difference |
| pinned-lat-copy | 1 | 6 | 223.6 | [223.5, 224.6] | 1.004 | [0.9993, 1.018] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 0.9963, 95% CI [0.9824, 1.001], half-width 0.009121 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 222.8 | [219.8, 223.7] |
| unpinned-lat | unpinned-lat | 6 | 218.6 | [216.1, 221.6] |
| pinned-lat-copy | pinned-lat-copy | 6 | 223.6 | [223.5, 224.6] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 24 | [24, 24] | 24 | [24, 24] | higher (worse) |
| pinned-lat-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 1 | [1, 1] |
| unpinned-lat | unpinned-lat | 6 | 24 | [24, 24] |
| pinned-lat-copy | pinned-lat-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 1200000000 | [1200000000, 1201000000] | 1 | [1, 1] | no measurable difference |
| pinned-lat-copy | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 0.9999 | [0.9999, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.00008789 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 1200000000 | [1200000000, 1200000000] |
| unpinned-lat | unpinned-lat | 6 | 1200000000 | [1200000000, 1201000000] |
| pinned-lat-copy | pinned-lat-copy | 6 | 1200000000 | [1200000000, 1200000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |
| pinned-lat-copy | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio 1, 95% CI [1, 1], half-width 7.166e-8 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 1500000000 | [1500000000, 1500000000] |
| unpinned-lat | unpinned-lat | 6 | 1500000000 | [1500000000, 1500000000] |
| pinned-lat-copy | pinned-lat-copy | 6 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs pinned-lat | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-lat | 1 | 6 | 0 | [0, 0.02085] | 1 | n/a | baseline |
| unpinned-lat | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| pinned-lat-copy | 1 | 6 | 0 | [0, 0.02085] | n/a | [0, n/a] | no measurable difference |

A/A (pinned-lat / pinned-lat-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-lat | pinned-lat | 6 | 0 | [0, 0.02085] |
| unpinned-lat | unpinned-lat | 6 | 0 | [0, 0] |
| pinned-lat-copy | pinned-lat-copy | 6 | 0 | [0, 0.02085] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 3.44 2.78 2.74 2/2093 1889752 / 3.62 2.84 2.76 1/2104 1892733
