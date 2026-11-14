# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 10.85 | [10.79, 11.07] | 0.04605 | [0.04581, 0.047] | lower (better) |
| n1e8 | 1 | 30 | 85.93 | [85.83, 86.09] | 0.3649 | [0.3644, 0.3656] | lower (better) |
| n3e8 | 1 | 30 | 235.5 | [235.4, 235.7] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 758.8 | [758.6, 759] | 3.222 | [3.22, 3.223] | higher (worse) |
| n3e8-copy | 1 | 30 | 235.6 | [235.5, 235.8] | 1 | [0.9995, 1.001] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9997, 95% CI [0.9987, 1], half-width 0.0009014 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 10.85 | [10.79, 11.07] |
| n1e8 | n1e8 | 30 | 85.93 | [85.83, 86.09] |
| n3e8 | n3e8 | 30 | 235.5 | [235.4, 235.7] |
| n1e9 | n1e9 | 30 | 758.8 | [758.6, 759] |
| n3e8-copy | n3e8-copy | 30 | 235.6 | [235.5, 235.8] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n1e8 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n3e8 | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n3e8-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0 | [0, 0] |
| n1e8 | n1e8 | 30 | 0 | [0, 0] |
| n3e8 | n3e8 | 30 | 0 | [0, 0] |
| n1e9 | n1e9 | 30 | 0 | [0, 0] |
| n3e8-copy | n3e8-copy | 30 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0.34 | [0.33, 0.42] | 0.001514 | [0.001469, 0.00187] | lower (better) |
| n1e8 | 1 | 30 | 75.2 | [75.16, 75.31] | 0.3348 | [0.3346, 0.3353] | lower (better) |
| n3e8 | 1 | 30 | 224.6 | [224.5, 224.7] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 747.8 | [747.6, 748] | 3.329 | [3.327, 3.33] | higher (worse) |
| n3e8-copy | 1 | 30 | 224.7 | [224.6, 225] | 1 | [0.9994, 1.002] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9997, 95% CI [0.9983, 1.001], half-width 0.001123 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0.34 | [0.33, 0.42] |
| n1e8 | n1e8 | 30 | 75.2 | [75.16, 75.31] |
| n3e8 | n3e8 | 30 | 224.6 | [224.5, 224.7] |
| n1e9 | n1e9 | 30 | 747.8 | [747.6, 748] |
| n3e8-copy | n3e8-copy | 30 | 224.7 | [224.6, 225] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0.487 | [0.4795, 0.5795] | 0.002166 | [0.002132, 0.002578] | lower (better) |
| n1e8 | 1 | 30 | 75.33 | [75.29, 75.43] | 0.3351 | [0.3349, 0.3356] | lower (better) |
| n3e8 | 1 | 30 | 224.8 | [224.7, 224.9] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 747.8 | [747.3, 748] | 3.327 | [3.324, 3.329] | higher (worse) |
| n3e8-copy | 1 | 30 | 224.9 | [224.7, 225.2] | 1 | [0.9994, 1.002] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9997, 95% CI [0.9982, 1.001], half-width 0.001198 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0.487 | [0.4795, 0.5795] |
| n1e8 | n1e8 | 30 | 75.33 | [75.29, 75.43] |
| n3e8 | n3e8 | 30 | 224.8 | [224.7, 224.9] |
| n1e9 | n1e9 | 30 | 747.8 | [747.3, 748] |
| n3e8-copy | n3e8-copy | 30 | 224.9 | [224.7, 225.2] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n1e8 | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n3e8 | 1 | 30 | 1 | [1, 1] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n3e8-copy | 1 | 30 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 1 | [1, 1] |
| n1e8 | n1e8 | 30 | 1 | [1, 1] |
| n3e8 | n3e8 | 30 | 1 | [1, 1] |
| n1e9 | n1e9 | 30 | 1 | [1, 1] |
| n3e8-copy | n3e8-copy | 30 | 1 | [1, 1] |

## cycles_k

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 1627000 | [1610000, 1792000] | 0.4844 | [0.4341, 0.5441] | lower (better) |
| n1e8 | 1 | 30 | 2717000 | [2662000, 2968000] | 0.8091 | [0.7253, 0.8997] | lower (better) |
| n3e8 | 1 | 30 | 3358000 | [3122000, 3749000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 6572000 | [5994000, 7056000] | 1.957 | [1.687, 2.152] | higher (worse) |
| n3e8-copy | 1 | 30 | 3350000 | [3225000, 3634000] | 0.9975 | [0.8914, 1.104] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1.003, 95% CI [0.9055, 1.122], half-width 0.1082 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 1627000 | [1610000, 1792000] |
| n1e8 | n1e8 | 30 | 2717000 | [2662000, 2968000] |
| n3e8 | n3e8 | 30 | 3358000 | [3122000, 3749000] |
| n1e9 | n1e9 | 30 | 6572000 | [5994000, 7056000] |
| n3e8-copy | n3e8-copy | 30 | 3350000 | [3225000, 3634000] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 147300 | [145500, 163700] | 0.0001228 | [0.0001212, 0.0001363] | lower (better) |
| n1e8 | 1 | 30 | 400200000 | [400200000, 400200000] | 0.3334 | [0.3334, 0.3335] | lower (better) |
| n3e8 | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 4001000000 | [4001000000, 4001000000] | 3.333 | [3.333, 3.333] | higher (worse) |
| n3e8-copy | 1 | 30 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.00004593 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 147300 | [145500, 163700] |
| n1e8 | n1e8 | 30 | 400200000 | [400200000, 400200000] |
| n3e8 | n3e8 | 30 | 1200000000 | [1200000000, 1200000000] |
| n1e9 | n1e9 | 30 | 4001000000 | [4001000000, 4001000000] |
| n3e8-copy | n3e8-copy | 30 | 1200000000 | [1200000000, 1200000000] |

## instructions_k

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 1878000 | [1851000, 1887000] | 0.7223 | [0.6976, 0.7523] | lower (better) |
| n1e8 | 1 | 30 | 2254000 | [2195000, 2399000] | 0.8669 | [0.8281, 0.9363] | lower (better) |
| n3e8 | 1 | 30 | 2600000 | [2497000, 2668000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 3754000 | [3603000, 3981000] | 1.444 | [1.369, 1.554] | higher (worse) |
| n3e8-copy | 1 | 30 | 2553000 | [2508000, 2695000] | 0.9818 | [0.9451, 1.061] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1.018, 95% CI [0.9425, 1.058], half-width 0.05782 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 1878000 | [1852000, 1887000] |
| n1e8 | n1e8 | 30 | 2254000 | [2195000, 2399000] |
| n3e8 | n3e8 | 30 | 2600000 | [2497000, 2671000] |
| n1e9 | n1e9 | 30 | 3754000 | [3603000, 3981000] |
| n3e8-copy | n3e8-copy | 30 | 2553000 | [2508000, 2695000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 102900 | [102900, 102900] | 0.00006859 | [0.00006859, 0.00006859] | lower (better) |
| n1e8 | 1 | 30 | 500100000 | [500100000, 500100000] | 0.3334 | [0.3334, 0.3334] | lower (better) |
| n3e8 | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 5000000000 | [5000000000, 5000000000] | 3.333 | [3.333, 3.333] | higher (worse) |
| n3e8-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [1, 1], half-width 8.166e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 102900 | [102900, 102900] |
| n1e8 | n1e8 | 30 | 500100000 | [500100000, 500100000] |
| n3e8 | n3e8 | 30 | 1500000000 | [1500000000, 1500000000] |
| n1e9 | n1e9 | 30 | 5000000000 | [5000000000, 5000000000] |
| n3e8-copy | n3e8-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n1e8 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n3e8 | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 0 | [0, 0.0053] | n/a | [n/a, n/a] | no measurable difference |
| n3e8-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0 | [0, 0] |
| n1e8 | n1e8 | 30 | 0 | [0, 0] |
| n3e8 | n3e8 | 30 | 0 | [0, 0] |
| n1e9 | n1e9 | 30 | 0 | [0, 0.0053] |
| n3e8-copy | n3e8-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 2.02 2.58 2.68 3/2071 1903982 / 4.14 3.22 2.90 2/2118 2023245
