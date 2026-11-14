# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## cgroup_usage_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 10.67 | [10.53, 11.22] | 0.04556 | [0.04345, 0.04782] | lower (better) |
| n1e8 | 1 | 6 | 85.54 | [85.05, 92.53] | 0.3652 | [0.3491, 0.3945] | lower (better) |
| n3e8 | 1 | 6 | 234.2 | [233.4, 246.5] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 757.8 | [754.2, 770] | 3.236 | [3.087, 3.288] | higher (worse) |
| n3e8-copy | 1 | 6 | 234.4 | [233.6, 250.1] | 1.001 | [0.9597, 1.066] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9991, 95% CI [0.9384, 1.042], half-width 0.05179 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 10.67 | [10.53, 11.22] |
| n1e8 | n1e8 | 6 | 85.54 | [85.05, 92.53] |
| n3e8 | n3e8 | 6 | 234.2 | [233.4, 246.5] |
| n1e9 | n1e9 | 6 | 757.8 | [754.2, 770] |
| n3e8-copy | n3e8-copy | 6 | 234.4 | [233.6, 250.1] |

## cpu_sys_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 0 | [0, 0.2385] | n/a | [0, n/a] | no measurable difference |
| n1e8 | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| n3e8 | 1 | 6 | 0 | [0, 1.994] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |
| n3e8-copy | 1 | 6 | 0 | [0, 0] | n/a | [0, n/a] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 0 | [0, 0.2385] |
| n1e8 | n1e8 | 6 | 0 | [0, 0] |
| n3e8 | n3e8 | 6 | 0 | [0, 1.994] |
| n1e9 | n1e9 | 6 | 0 | [0, 0] |
| n3e8-copy | n3e8-copy | 6 | 0 | [0, 0] |

## cpu_task_clock_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 0.335 | [0.33, 0.42] | 0.001499 | [0.001418, 0.001879] | lower (better) |
| n1e8 | 1 | 6 | 74.87 | [74.59, 81.31] | 0.335 | [0.3205, 0.3636] | lower (better) |
| n3e8 | 1 | 6 | 223.5 | [223.1, 235.4] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 746.6 | [743.4, 758.7] | 3.341 | [3.183, 3.39] | higher (worse) |
| n3e8-copy | 1 | 6 | 223.7 | [223.1, 238.9] | 1.001 | [0.9569, 1.059] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9993, 95% CI [0.9442, 1.045], half-width 0.05044 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 0.335 | [0.33, 0.42] |
| n1e8 | n1e8 | 6 | 74.87 | [74.59, 81.31] |
| n3e8 | n3e8 | 6 | 223.5 | [223.1, 235.4] |
| n1e9 | n1e9 | 6 | 746.6 | [743.4, 758.7] |
| n3e8-copy | n3e8-copy | 6 | 223.7 | [223.1, 238.9] |

## cpu_user_ms (ms)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 0.483 | [0.235, 0.602] | 0.002159 | [0.001051, 0.002688] | lower (better) |
| n1e8 | 1 | 6 | 75.09 | [74.77, 81.53] | 0.3357 | [0.3197, 0.3646] | lower (better) |
| n3e8 | 1 | 6 | 223.7 | [221.2, 235.6] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 746.8 | [743.6, 758.9] | 3.339 | [3.17, 3.397] | higher (worse) |
| n3e8-copy | 1 | 6 | 223.8 | [223.3, 239.1] | 1.001 | [0.9505, 1.068] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9992, 95% CI [0.9366, 1.052], half-width 0.05772 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 0.483 | [0.235, 0.602] |
| n1e8 | n1e8 | 6 | 75.09 | [74.77, 81.53] |
| n3e8 | n3e8 | 6 | 223.7 | [221.2, 235.6] |
| n1e9 | n1e9 | 6 | 746.8 | [743.6, 758.9] |
| n3e8-copy | n3e8-copy | 6 | 223.8 | [223.3, 239.1] |

## cpuset_ncpus

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n1e8 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n3e8 | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| n3e8-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 1 | [1, 1] |
| n1e8 | n1e8 | 6 | 1 | [1, 1] |
| n3e8 | n3e8 | 6 | 1 | [1, 1] |
| n1e9 | n1e9 | 6 | 1 | [1, 1] |
| n3e8-copy | n3e8-copy | 6 | 1 | [1, 1] |

## cycles_k

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 1611000 | [1591000, 1807000] | 0.5876 | [0.5574, 0.6605] | lower (better) |
| n1e8 | 1 | 6 | 2218000 | [2074000, 3242000] | 0.8091 | [0.7469, 1.182] | no measurable difference |
| n3e8 | 1 | 6 | 2742000 | [2594000, 2888000] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 4973000 | [4666000, 5459000] | 1.814 | [1.67, 2.026] | higher (worse) |
| n3e8-copy | 1 | 6 | 2921000 | [2554000, 3800000] | 1.065 | [0.9316, 1.403] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9387, 95% CI [0.7128, 1.073], half-width 0.1803 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 1611000 | [1591000, 1807000] |
| n1e8 | n1e8 | 6 | 2218000 | [2074000, 3242000] |
| n3e8 | n3e8 | 6 | 2742000 | [2594000, 2888000] |
| n1e9 | n1e9 | 6 | 4973000 | [4666000, 5459000] |
| n3e8-copy | n3e8-copy | 6 | 2921000 | [2554000, 3800000] |

## cycles_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 148500 | [145600, 158400] | 0.0001237 | [0.0001213, 0.0001319] | lower (better) |
| n1e8 | 1 | 6 | 400200000 | [400200000, 400300000] | 0.3334 | [0.3334, 0.3335] | lower (better) |
| n3e8 | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 4001000000 | [4000000000, 4001000000] | 3.333 | [3.333, 3.334] | higher (worse) |
| n3e8-copy | 1 | 6 | 1200000000 | [1200000000, 1200000000] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.0000591 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 148500 | [145600, 158400] |
| n1e8 | n1e8 | 6 | 400200000 | [400200000, 400300000] |
| n3e8 | n3e8 | 6 | 1200000000 | [1200000000, 1200000000] |
| n1e9 | n1e9 | 6 | 4001000000 | [4000000000, 4001000000] |
| n3e8-copy | n3e8-copy | 6 | 1200000000 | [1200000000, 1200000000] |

## instructions_k

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 1890000 | [1867000, 1960000] | 0.7756 | [0.7382, 0.808] | lower (better) |
| n1e8 | 1 | 6 | 2121000 | [2085000, 2179000] | 0.8704 | [0.8268, 0.8969] | lower (better) |
| n3e8 | 1 | 6 | 2437000 | [2391000, 2561000] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 3521000 | [3428000, 3815000] | 1.445 | [1.375, 1.566] | higher (worse) |
| n3e8-copy | 1 | 6 | 2525000 | [2400000, 2705000] | 1.036 | [0.9716, 1.113] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 0.9653, 95% CI [0.8981, 1.029], half-width 0.06558 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 1890000 | [1867000, 1960000] |
| n1e8 | n1e8 | 6 | 2121000 | [2085000, 2179000] |
| n3e8 | n3e8 | 6 | 2437000 | [2391000, 2561000] |
| n1e9 | n1e9 | 6 | 3521000 | [3428000, 3815000] |
| n3e8-copy | n3e8-copy | 6 | 2525000 | [2400000, 2705000] |

## instructions_u

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 102900 | [102900, 102900] | 0.00006859 | [0.00006859, 0.00006859] | lower (better) |
| n1e8 | 1 | 6 | 500100000 | [500100000, 500100000] | 0.3334 | [0.3334, 0.3334] | lower (better) |
| n3e8 | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 5000000000 | [5000000000, 5000000000] | 3.333 | [3.333, 3.333] | higher (worse) |
| n3e8-copy | 1 | 6 | 1500000000 | [1500000000, 1500000000] | 1 | [1, 1] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio 1, 95% CI [1, 1], half-width 5.5e-9 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 102900 | [102900, 102900] |
| n1e8 | n1e8 | 6 | 500100000 | [500100000, 500100000] |
| n3e8 | n3e8 | 6 | 1500000000 | [1500000000, 1500000000] |
| n1e9 | n1e9 | 6 | 5000000000 | [5000000000, 5000000000] |
| n3e8-copy | n3e8-copy | 6 | 1500000000 | [1500000000, 1500000000] |

## sibling_busy (fraction)

| group | builds | n | median | 95% CI | ratio vs n3e8 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| n0 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n1e8 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| n3e8 | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| n1e9 | 1 | 6 | 0 | [0, 0.01285] | n/a | [n/a, n/a] | no measurable difference |
| n3e8-copy | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (n3e8 / n3e8-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| n0 | n0 | 6 | 0 | [0, 0] |
| n1e8 | n1e8 | 6 | 0 | [0, 0] |
| n3e8 | n3e8 | 6 | 0 | [0, 0] |
| n1e9 | n1e9 | 6 | 0 | [0, 0.01285] |
| n3e8-copy | n3e8-copy | 6 | 0 | [0, 0] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- pinned CPU siblings: 6,18 (online: 1)
- loadavg before / after: 2.12 2.47 2.64 1/2042 1880621 / 3.10 2.67 2.70 1/2119 1885438
