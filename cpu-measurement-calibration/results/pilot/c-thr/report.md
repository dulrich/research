# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 235.6 | [235.3, 238.2] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 230.4 | [229.7, 236] | 0.978 | [0.9658, 1.002] | no measurable difference |
| pinned-thr-copy | 1 | 6 | 235 | [234.8, 235.7] | 0.9972 | [0.986, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1.003, 95% CI [0.9998, 1.014], half-width 0.007223 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 235.6 | [235.3, 238.2] |
| unpinned-thr | unpinned-thr | 6 | 230.4 | [229.7, 236] |
| pinned-thr-copy | pinned-thr-copy | 6 | 235 | [234.8, 235.7] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 0 | [0, 1.994] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 0 | [0, 1.982] | n/a | [0, n/a] | no measurable difference |
| pinned-thr-copy | 1 | 6 | 0 | [0, 1.974] | n/a | [0, n/a] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio n/a, 95% CI [0, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 0 | [0, 1.994] |
| unpinned-thr | unpinned-thr | 6 | 0 | [0, 1.982] |
| pinned-thr-copy | pinned-thr-copy | 6 | 0 | [0, 1.974] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 224.8 | [224.7, 227.1] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 218.6 | [218.2, 223.4] | 0.9726 | [0.9622, 0.9937] | lower (better) |
| pinned-thr-copy | 1 | 6 | 224.7 | [224.4, 225] | 0.9995 | [0.9892, 1.001] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [0.9991, 1.011], half-width 0.005917 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 224.8 | [224.7, 227.1] |
| unpinned-thr | unpinned-thr | 6 | 218.6 | [218.2, 223.4] |
| pinned-thr-copy | pinned-thr-copy | 6 | 224.7 | [224.4, 225] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 224.9 | [224.1, 226.1] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 218.9 | [218.6, 221.8] | 0.9733 | [0.968, 0.9861] | lower (better) |
| pinned-thr-copy | 1 | 6 | 224.7 | [222.8, 225.1] | 0.9991 | [0.9904, 1.003] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1.001, 95% CI [0.9973, 1.01], half-width 0.006223 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 224.9 | [224.1, 226.1] |
| unpinned-thr | unpinned-thr | 6 | 218.9 | [218.6, 221.8] |
| pinned-thr-copy | pinned-thr-copy | 6 | 224.7 | [222.8, 225.1] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 24 | [24, 24] | 24 | [24, 24] | higher (worse) |
| pinned-thr-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 1 | [1, 1] |
| unpinned-thr | unpinned-thr | 6 | 24 | [24, 24] |
| pinned-thr-copy | pinned-thr-copy | 6 | 1 | [1, 1] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 1201000000 | [1201000000, 1203000000] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 1201000000 | [1201000000, 1202000000] | 1 | [0.9984, 1.001] | no measurable difference |
| pinned-thr-copy | 1 | 6 | 1200000000 | [1200000000, 1201000000] | 0.9997 | [0.9979, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [1, 1.002], half-width 0.001066 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 1201000000 | [1201000000, 1203000000] |
| unpinned-thr | unpinned-thr | 6 | 1201000000 | [1201000000, 1202000000] |
| pinned-thr-copy | pinned-thr-copy | 6 | 1200000000 | [1200000000, 1201000000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |
| pinned-thr-copy | 1 | 6 | 3300000000 | [3300000000, 3300000000] | 1 | [1, 1] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio 1, 95% CI [1, 1], half-width 4.826e-8 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 3300000000 | [3300000000, 3300000000] |
| unpinned-thr | unpinned-thr | 6 | 3300000000 | [3300000000, 3300000000] |
| pinned-thr-copy | pinned-thr-copy | 6 | 3300000000 | [3300000000, 3300000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs pinned-thr | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| pinned-thr | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| unpinned-thr | 1 | 6 | 0 | [0, 0.02] | n/a | [n/a, n/a] | no measurable difference |
| pinned-thr-copy | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (pinned-thr / pinned-thr-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| pinned-thr | pinned-thr | 6 | 0 | [0, 0] |
| unpinned-thr | unpinned-thr | 6 | 0 | [0, 0.02] |
| pinned-thr-copy | pinned-thr-copy | 6 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 3.62 2.84 2.76 3/2112 1892805 / 3.64 2.88 2.77 1/2097 1895813
