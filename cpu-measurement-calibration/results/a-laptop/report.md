# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 17.86 | [17.73, 18.11] | 0.04516 | [0.04481, 0.04578] | lower (better) |
| n1e8 | 1 | 30 | 144.4 | [144.3, 144.7] | 0.3652 | [0.3648, 0.3659] | lower (better) |
| n3e8 | 1 | 30 | 395.6 | [395.5, 395.7] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 1275 | [1275, 1276] | 3.224 | [3.223, 3.225] | higher (worse) |
| n3e8-copy | 1 | 30 | 395.6 | [395.4, 396.1] | 1 | [0.9995, 1.001] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [0.9986, 1], half-width 0.0009232 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 17.86 | [17.73, 18.11] |
| n1e8 | n1e8 | 30 | 144.4 | [144.3, 144.7] |
| n3e8 | n3e8 | 30 | 395.6 | [395.5, 395.7] |
| n1e9 | n1e9 | 30 | 1275 | [1275, 1276] |
| n3e8-copy | n3e8-copy | 30 | 395.6 | [395.4, 396.1] |

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
| n0 | 1 | 30 | 0.325 | [0.29, 0.36] | 0.0008601 | [0.0007672, 0.000953] | lower (better) |
| n1e8 | 1 | 30 | 126.6 | [126.5, 126.7] | 0.335 | [0.3346, 0.3355] | lower (better) |
| n3e8 | 1 | 30 | 377.9 | [377.8, 378.1] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 1258 | [1257, 1258] | 3.328 | [3.326, 3.33] | higher (worse) |
| n3e8-copy | 1 | 30 | 377.9 | [377.8, 378.3] | 1 | [0.9996, 1.001] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9999, 95% CI [0.9988, 1], half-width 0.0008064 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0.325 | [0.29, 0.36] |
| n1e8 | n1e8 | 30 | 126.6 | [126.5, 126.7] |
| n3e8 | n3e8 | 30 | 377.9 | [377.8, 378] |
| n1e9 | n1e9 | 30 | 1258 | [1257, 1258] |
| n3e8-copy | n3e8-copy | 30 | 377.9 | [377.8, 378.3] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0.84 | [0.778, 1.022] | 0.00222 | [0.002056, 0.002703] | lower (better) |
| n1e8 | 1 | 30 | 127.1 | [127, 127.4] | 0.336 | [0.3355, 0.3367] | lower (better) |
| n3e8 | 1 | 30 | 378.3 | [378.2, 378.5] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 1258 | [1258, 1259] | 3.325 | [3.323, 3.327] | higher (worse) |
| n3e8-copy | 1 | 30 | 378.5 | [378.4, 378.6] | 1 | [0.9998, 1.001] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9995, 95% CI [0.9991, 1], half-width 0.0005204 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0.84 | [0.778, 1.022] |
| n1e8 | n1e8 | 30 | 127.1 | [127, 127.4] |
| n3e8 | n3e8 | 30 | 378.3 | [378.2, 378.5] |
| n1e9 | n1e9 | 30 | 1258 | [1258, 1259] |
| n3e8-copy | n3e8-copy | 30 | 378.5 | [378.3, 378.6] |

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
| n0 | 1 | 30 | 674500 | [671700, 676800] | 0.4146 | [0.4045, 0.4276] | lower (better) |
| n1e8 | 1 | 30 | 1118000 | [1082000, 1150000] | 0.6873 | [0.6626, 0.7158] | lower (better) |
| n3e8 | 1 | 30 | 1627000 | [1578000, 1661000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 3032000 | [2961000, 3203000] | 1.863 | [1.805, 1.982] | higher (worse) |
| n3e8-copy | 1 | 30 | 1653000 | [1604000, 1703000] | 1.016 | [0.9782, 1.059] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9845, 95% CI [0.9443, 1.022], half-width 0.03901 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 674500 | [671700, 676800] |
| n1e8 | n1e8 | 30 | 1118000 | [1082000, 1150000] |
| n3e8 | n3e8 | 30 | 1627000 | [1578000, 1661000] |
| n1e9 | n1e9 | 30 | 3032000 | [2961000, 3203000] |
| n3e8-copy | n3e8-copy | 30 | 1653000 | [1604000, 1703000] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 234500 | [233400, 235100] | 0.0001953 | [0.0001943, 0.0001958] | lower (better) |
| n1e8 | 1 | 30 | 400500000 | [400500000, 400700000] | 0.3336 | [0.3335, 0.3337] | lower (better) |
| n3e8 | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 4002000000 | [4001000000, 4002000000] | 3.332 | [3.332, 3.333] | higher (worse) |
| n3e8-copy | 1 | 30 | 1201000000 | [1201000000, 1201000000] | 1 | [0.9999, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.0001207 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 234500 | [233400, 235100] |
| n1e8 | n1e8 | 30 | 400500000 | [400500000, 400700000] |
| n3e8 | n3e8 | 30 | 1201000000 | [1201000000, 1201000000] |
| n1e9 | n1e9 | 30 | 4002000000 | [4001000000, 4002000000] |
| n3e8-copy | n3e8-copy | 30 | 1201000000 | [1201000000, 1201000000] |

## instructions_k

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 501000 | [497600, 502700] | 0.4448 | [0.4317, 0.4525] | lower (better) |
| n1e8 | 1 | 30 | 739600 | [721100, 774100] | 0.6567 | [0.6281, 0.6928] | lower (better) |
| n3e8 | 1 | 30 | 1126000 | [1109000, 1159000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 2346000 | [2324000, 2365000] | 2.083 | [2.018, 2.123] | higher (worse) |
| n3e8-copy | 1 | 30 | 1129000 | [1109000, 1153000] | 1.003 | [0.9665, 1.032] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9973, 95% CI [0.969, 1.035], half-width 0.03283 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 501000 | [497600, 502700] |
| n1e8 | n1e8 | 30 | 739600 | [721100, 774100] |
| n3e8 | n3e8 | 30 | 1126000 | [1109000, 1159000] |
| n1e9 | n1e9 | 30 | 2346000 | [2324000, 2366000] |
| n3e8-copy | n3e8-copy | 30 | 1129000 | [1108000, 1153000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 107900 | [107900, 107900] | 0.00007191 | [0.00007191, 0.00007191] | lower (better) |
| n1e8 | 1 | 30 | 500100000 | [500100000, 500100000] | 0.3334 | [0.3334, 0.3334] | lower (better) |
| n3e8 | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 5000000000 | [5000000000, 5000000000] | 3.333 | [3.333, 3.333] | higher (worse) |
| n3e8-copy | 1 | 30 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [1, 1], half-width 9.999e-10 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 107900 | [107900, 107900] |
| n1e8 | n1e8 | 30 | 500100000 | [500100000, 500100000] |
| n3e8 | n3e8 | 30 | 1500000000 | [1500000000, 1500000000] |
| n1e9 | n1e9 | 30 | 5000000000 | [5000000000, 5000000000] |
| n3e8-copy | n3e8-copy | 30 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 30 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| n1e8 | 1 | 30 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| n3e8 | 1 | 30 | 0 | [0, 0.01135] | 1 | n/a | baseline |
| n1e9 | 1 | 30 | 0.00765 | [0, 0.00785] | n/a | [0.6383, n/a] | no measurable difference |
| n3e8-copy | 1 | 30 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 30 | 0 | [0, 0] |
| n1e8 | n1e8 | 30 | 0 | [0, 0] |
| n3e8 | n3e8 | 30 | 0 | [0, 0.01085] |
| n1e9 | n1e9 | 30 | 0.00765 | [0, 0.00785] |
| n3e8-copy | n3e8-copy | 30 | 0 | [0, 0] |

## Environment

- CPU: Intel(R) Core(TM) i7-5600U CPU @ 2.60GHz
- governor / driver: schedutil / intel_cpufreq
- boost: unavailable (intel no_turbo: 0)
- SMT: control on, active 1
- pinned CPU siblings: 2-3 (online: 1)
- loadavg before / after: 0.27 0.13 0.05 1/215 1934 / 1.56 0.79 0.32 1/226 20914
