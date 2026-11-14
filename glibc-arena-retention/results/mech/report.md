# Measurement report

Seed 20261114; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.43 | [25.09, 25.66] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 25.17 | [24.95, 25.48] | 0.99 | [0.9764, 1.007] | no measurable difference |
| main | 1 | 6 | 0.97 | [0.945, 1.03] | 0.03815 | [0.03709, 0.04073] | lower (better) |
| fast0 | 1 | 6 | 1.035 | [1.02, 1.06] | 0.04071 | [0.04006, 0.04172] | lower (better) |
| fast70 | 1 | 6 | 25.41 | [25.21, 25.54] | 0.9992 | [0.9861, 1.013] | no measurable difference |
| fast100 | 1 | 6 | 31.21 | [31.21, 31.21] | 1.228 | [1.216, 1.244] | higher (worse) |
| mxfast0 | 1 | 6 | 1.13 | [1.105, 1.15] | 0.04444 | [0.04337, 0.04529] | lower (better) |
| pin0.1 | 1 | 6 | 24.3 | [24.28, 24.32] | 0.9556 | [0.9468, 0.9681] | lower (better) |
| pin0.5 | 1 | 6 | 13.96 | [13.94, 14.02] | 0.5493 | [0.5442, 0.5566] | lower (better) |
| pin0.9 | 1 | 6 | 3.595 | [3.58, 3.62] | 0.1414 | [0.1399, 0.1435] | lower (better) |
| pin0.99 | 1 | 6 | 1.24 | [1.22, 1.295] | 0.04877 | [0.04793, 0.05102] | lower (better) |
| mib16 | 1 | 6 | 15.84 | [15.63, 16.1] | 0.6228 | [0.6132, 0.6351] | lower (better) |
| mib48 | 1 | 6 | 49 | [48.55, 49.4] | 1.927 | [1.902, 1.957] | higher (worse) |
| mib100 | 1 | 6 | 40.53 | [40.5, 40.55] | 1.594 | [1.579, 1.615] | higher (worse) |
| notrim | 1 | 6 | 26.2 | [26.18, 26.2] | 1.03 | [1.021, 1.044] | higher (worse) |
| thr128k | 1 | 6 | 25.3 | [25.06, 25.64] | 0.9949 | [0.9825, 1.013] | no measurable difference |
| thr128k-notrim | 1 | 6 | 26.19 | [26.18, 26.2] | 1.03 | [1.02, 1.043] | higher (worse) |
| late1s | 1 | 6 | 25.08 | [12.93, 25.58] | 0.9862 | [0.5095, 1.009] | no measurable difference |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9929, 1.024], half-width 0.01564 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.43 | [25.09, 25.66] |
| thread-copy | thread-copy | 6 | 25.17 | [24.95, 25.48] |
| main | main | 6 | 0.97 | [0.945, 1.03] |
| fast0 | fast0 | 6 | 1.035 | [1.02, 1.06] |
| fast70 | fast70 | 6 | 25.41 | [25.21, 25.54] |
| fast100 | fast100 | 6 | 31.21 | [31.21, 31.21] |
| mxfast0 | mxfast0 | 6 | 1.13 | [1.105, 1.15] |
| pin0.1 | pin0.1 | 6 | 24.3 | [24.28, 24.32] |
| pin0.5 | pin0.5 | 6 | 13.96 | [13.94, 14.02] |
| pin0.9 | pin0.9 | 6 | 3.595 | [3.58, 3.62] |
| pin0.99 | pin0.99 | 6 | 1.24 | [1.22, 1.295] |
| mib16 | mib16 | 6 | 15.84 | [15.63, 16.1] |
| mib48 | mib48 | 6 | 49 | [48.55, 49.4] |
| mib100 | mib100 | 6 | 40.53 | [40.5, 40.55] |
| notrim | notrim | 6 | 26.2 | [26.18, 26.2] |
| thr128k | thr128k | 6 | 25.3 | [25.06, 25.64] |
| thr128k-notrim | thr128k-notrim | 6 | 26.19 | [26.18, 26.2] |
| late1s | late1s | 6 | 25.08 | [12.93, 25.58] |

## anon_settled_3s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.47 | [25.19, 25.66] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 25.25 | [24.95, 25.5] | 0.9914 | [0.977, 1.006] | no measurable difference |
| main | 1 | 6 | 0.97 | [0.945, 1.03] | 0.03808 | [0.03707, 0.04066] | lower (better) |
| fast0 | 1 | 6 | 1.04 | [1.02, 1.105] | 0.04083 | [0.03998, 0.04332] | lower (better) |
| fast70 | 1 | 6 | 25.45 | [25.26, 25.54] | 0.9994 | [0.9879, 1.011] | no measurable difference |
| fast100 | 1 | 6 | 31.21 | [31.21, 31.27] | 1.225 | [1.216, 1.239] | higher (worse) |
| mxfast0 | 1 | 6 | 1.215 | [1.12, 1.255] | 0.0477 | [0.04397, 0.04934] | lower (better) |
| pin0.1 | 1 | 6 | 24.34 | [24.3, 24.41] | 0.9558 | [0.9478, 0.9666] | lower (better) |
| pin0.5 | 1 | 6 | 14.01 | [13.96, 14.09] | 0.5501 | [0.5451, 0.5567] | lower (better) |
| pin0.9 | 1 | 6 | 3.61 | [3.585, 3.7] | 0.1417 | [0.1401, 0.1455] | lower (better) |
| pin0.99 | 1 | 6 | 1.24 | [1.22, 1.345] | 0.04868 | [0.0479, 0.05269] | lower (better) |
| mib16 | 1 | 6 | 15.94 | [15.67, 16.2] | 0.6256 | [0.6148, 0.6374] | lower (better) |
| mib48 | 1 | 6 | 49.11 | [48.59, 49.45] | 1.928 | [1.904, 1.952] | higher (worse) |
| mib100 | 1 | 6 | 40.53 | [40.5, 40.55] | 1.591 | [1.579, 1.609] | higher (worse) |
| notrim | 1 | 6 | 26.2 | [26.18, 26.2] | 1.029 | [1.021, 1.04] | higher (worse) |
| thr128k | 1 | 6 | 25.3 | [25.12, 25.64] | 0.9931 | [0.9825, 1.011] | no measurable difference |
| thr128k-notrim | 1 | 6 | 26.23 | [26.19, 26.29] | 1.03 | [1.021, 1.042] | higher (worse) |
| late1s | 1 | 6 | 1.14 | [1.09, 1.205] | 0.04476 | [0.04282, 0.04727] | lower (better) |

A/A (thread / thread-copy): ratio 1.009, 95% CI [0.9941, 1.024], half-width 0.01472 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.47 | [25.19, 25.66] |
| thread-copy | thread-copy | 6 | 25.25 | [24.95, 25.5] |
| main | main | 6 | 0.97 | [0.945, 1.03] |
| fast0 | fast0 | 6 | 1.04 | [1.02, 1.105] |
| fast70 | fast70 | 6 | 25.45 | [25.26, 25.54] |
| fast100 | fast100 | 6 | 31.21 | [31.21, 31.27] |
| mxfast0 | mxfast0 | 6 | 1.215 | [1.12, 1.255] |
| pin0.1 | pin0.1 | 6 | 24.34 | [24.3, 24.41] |
| pin0.5 | pin0.5 | 6 | 14.01 | [13.96, 14.09] |
| pin0.9 | pin0.9 | 6 | 3.61 | [3.585, 3.7] |
| pin0.99 | pin0.99 | 6 | 1.24 | [1.22, 1.345] |
| mib16 | mib16 | 6 | 15.94 | [15.67, 16.2] |
| mib48 | mib48 | 6 | 49.11 | [48.59, 49.45] |
| mib100 | mib100 | 6 | 40.53 | [40.5, 40.55] |
| notrim | notrim | 6 | 26.2 | [26.18, 26.2] |
| thr128k | thr128k | 6 | 25.3 | [25.12, 25.64] |
| thr128k-notrim | thr128k-notrim | 6 | 26.23 | [26.19, 26.29] |
| late1s | late1s | 6 | 1.14 | [1.09, 1.205] |

## bad_drawn

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 1 | [1, 1] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| main | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| fast0 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| fast70 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| fast100 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| mxfast0 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| pin0.1 | 1 | 6 | 0 | [0, 0] | 0 | [0, 0] | lower (better) |
| pin0.5 | 1 | 6 | 0 | [0, 0] | 0 | [0, 0] | lower (better) |
| pin0.9 | 1 | 6 | 0 | [0, 0] | 0 | [0, 0] | lower (better) |
| pin0.99 | 1 | 6 | 0 | [0, 0] | 0 | [0, 0] | lower (better) |
| mib16 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| mib48 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| mib100 | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| notrim | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| thr128k | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| thr128k-notrim | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |
| late1s | 1 | 6 | 1 | [1, 1] | 1 | [1, 1] | no measurable difference |

A/A (thread / thread-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 1 | [1, 1] |
| thread-copy | thread-copy | 6 | 1 | [1, 1] |
| main | main | 6 | 1 | [1, 1] |
| fast0 | fast0 | 6 | 1 | [1, 1] |
| fast70 | fast70 | 6 | 1 | [1, 1] |
| fast100 | fast100 | 6 | 1 | [1, 1] |
| mxfast0 | mxfast0 | 6 | 1 | [1, 1] |
| pin0.1 | pin0.1 | 6 | 0 | [0, 0] |
| pin0.5 | pin0.5 | 6 | 0 | [0, 0] |
| pin0.9 | pin0.9 | 6 | 0 | [0, 0] |
| pin0.99 | pin0.99 | 6 | 0 | [0, 0] |
| mib16 | mib16 | 6 | 1 | [1, 1] |
| mib48 | mib48 | 6 | 1 | [1, 1] |
| mib100 | mib100 | 6 | 1 | [1, 1] |
| notrim | notrim | 6 | 1 | [1, 1] |
| thr128k | thr128k | 6 | 1 | [1, 1] |
| thr128k-notrim | thr128k-notrim | 6 | 1 | [1, 1] |
| late1s | late1s | 6 | 1 | [1, 1] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.52 | [25.19, 25.77] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 25.27 | [25.05, 25.58] | 0.99 | [0.9763, 1.007] | no measurable difference |
| main | 1 | 6 | 6.67 | [6.545, 7.81] | 0.2614 | [0.2551, 0.306] | lower (better) |
| fast0 | 1 | 6 | 6.35 | [3.645, 8.26] | 0.2488 | [0.1428, 0.3225] | lower (better) |
| fast70 | 1 | 6 | 25.51 | [25.3, 25.63] | 0.9996 | [0.9862, 1.013] | no measurable difference |
| fast100 | 1 | 6 | 31.31 | [31.3, 31.31] | 1.227 | [1.215, 1.243] | higher (worse) |
| mxfast0 | 1 | 6 | 6.415 | [6.18, 8.12] | 0.2514 | [0.2416, 0.319] | lower (better) |
| pin0.1 | 1 | 6 | 24.39 | [24.38, 24.43] | 0.9559 | [0.9469, 0.9684] | lower (better) |
| pin0.5 | 1 | 6 | 14.07 | [14.04, 14.12] | 0.5511 | [0.5458, 0.5582] | lower (better) |
| pin0.9 | 1 | 6 | 6.3 | [6.195, 7.27] | 0.2469 | [0.2426, 0.2857] | lower (better) |
| pin0.99 | 1 | 6 | 6.295 | [6.15, 6.57] | 0.2467 | [0.2401, 0.2579] | lower (better) |
| mib16 | 1 | 6 | 15.94 | [15.73, 16.2] | 0.6244 | [0.6154, 0.6362] | lower (better) |
| mib48 | 1 | 6 | 49.11 | [48.64, 49.5] | 1.924 | [1.898, 1.953] | higher (worse) |
| mib100 | 1 | 6 | 40.63 | [40.6, 40.66] | 1.592 | [1.577, 1.613] | higher (worse) |
| notrim | 1 | 6 | 26.3 | [26.28, 26.3] | 1.031 | [1.021, 1.044] | higher (worse) |
| thr128k | 1 | 6 | 25.4 | [25.17, 25.75] | 0.9953 | [0.9827, 1.013] | no measurable difference |
| thr128k-notrim | 1 | 6 | 26.29 | [26.27, 26.3] | 1.03 | [1.02, 1.044] | higher (worse) |
| late1s | 1 | 6 | 25.08 | [15.43, 25.63] | 0.9826 | [0.6049, 1.009] | no measurable difference |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9929, 1.024], half-width 0.01568 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.52 | [25.19, 25.77] |
| thread-copy | thread-copy | 6 | 25.27 | [25.05, 25.58] |
| main | main | 6 | 6.67 | [6.545, 7.81] |
| fast0 | fast0 | 6 | 6.35 | [3.645, 8.26] |
| fast70 | fast70 | 6 | 25.51 | [25.3, 25.63] |
| fast100 | fast100 | 6 | 31.31 | [31.3, 31.31] |
| mxfast0 | mxfast0 | 6 | 6.415 | [6.18, 8.12] |
| pin0.1 | pin0.1 | 6 | 24.39 | [24.38, 24.43] |
| pin0.5 | pin0.5 | 6 | 14.07 | [14.04, 14.12] |
| pin0.9 | pin0.9 | 6 | 6.3 | [6.195, 7.27] |
| pin0.99 | pin0.99 | 6 | 6.295 | [6.15, 6.57] |
| mib16 | mib16 | 6 | 15.94 | [15.73, 16.2] |
| mib48 | mib48 | 6 | 49.11 | [48.64, 49.5] |
| mib100 | mib100 | 6 | 40.63 | [40.6, 40.66] |
| notrim | notrim | 6 | 26.3 | [26.28, 26.3] |
| thr128k | thr128k | 6 | 25.4 | [25.17, 25.75] |
| thr128k-notrim | thr128k-notrim | 6 | 26.29 | [26.27, 26.3] |
| late1s | late1s | 6 | 25.08 | [15.43, 25.63] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 0 | [0, 0] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| main | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fast0 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fast70 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| fast100 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| mxfast0 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pin0.1 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pin0.5 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pin0.9 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| pin0.99 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| mib16 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| mib48 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| mib100 | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| notrim | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| thr128k | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| thr128k-notrim | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| late1s | 1 | 6 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (thread / thread-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 0 | [0, 0] |
| thread-copy | thread-copy | 6 | 0 | [0, 0] |
| main | main | 6 | 0 | [0, 0] |
| fast0 | fast0 | 6 | 0 | [0, 0] |
| fast70 | fast70 | 6 | 0 | [0, 0] |
| fast100 | fast100 | 6 | 0 | [0, 0] |
| mxfast0 | mxfast0 | 6 | 0 | [0, 0] |
| pin0.1 | pin0.1 | 6 | 0 | [0, 0] |
| pin0.5 | pin0.5 | 6 | 0 | [0, 0] |
| pin0.9 | pin0.9 | 6 | 0 | [0, 0] |
| pin0.99 | pin0.99 | 6 | 0 | [0, 0] |
| mib16 | mib16 | 6 | 0 | [0, 0] |
| mib48 | mib48 | 6 | 0 | [0, 0] |
| mib100 | mib100 | 6 | 0 | [0, 0] |
| notrim | notrim | 6 | 0 | [0, 0] |
| thr128k | thr128k | 6 | 0 | [0, 0] |
| thr128k-notrim | thr128k-notrim | 6 | 0 | [0, 0] |
| late1s | late1s | 6 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 36.32 | [32.37, 38.34] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 36.3 | [35.14, 38.02] | 0.9996 | [0.9371, 1.134] | no measurable difference |
| main | 1 | 6 | 35.45 | [35.16, 37.28] | 0.9762 | [0.9245, 1.097] | no measurable difference |
| fast0 | 1 | 6 | 34.8 | [31.76, 36.42] | 0.9581 | [0.8649, 1.082] | no measurable difference |
| fast70 | 1 | 6 | 35.16 | [31.8, 35.52] | 0.9682 | [0.8749, 1.082] | no measurable difference |
| fast100 | 1 | 6 | 44.67 | [41.67, 46.37] | 1.23 | [1.13, 1.38] | higher (worse) |
| mxfast0 | 1 | 6 | 36.07 | [35.49, 37.28] | 0.9931 | [0.9386, 1.114] | no measurable difference |
| pin0.1 | 1 | 6 | 35.89 | [35.16, 36.75] | 0.9882 | [0.9349, 1.109] | no measurable difference |
| pin0.5 | 1 | 6 | 35.36 | [35.06, 36.45] | 0.9734 | [0.9188, 1.092] | no measurable difference |
| pin0.9 | 1 | 6 | 35.75 | [34.95, 37.99] | 0.9844 | [0.9277, 1.112] | no measurable difference |
| pin0.99 | 1 | 6 | 36.56 | [35.5, 37.28] | 1.007 | [0.9454, 1.129] | no measurable difference |
| mib16 | 1 | 6 | 27.39 | [26.31, 28.05] | 0.7541 | [0.7077, 0.8462] | lower (better) |
| mib48 | 1 | 6 | 58.76 | [55.1, 61.83] | 1.618 | [1.492, 1.829] | higher (worse) |
| mib100 | 1 | 6 | 109.2 | [108.2, 110.3] | 3.008 | [2.842, 3.373] | higher (worse) |
| notrim | 1 | 6 | 35.77 | [35.33, 37.65] | 0.985 | [0.9314, 1.105] | no measurable difference |
| thr128k | 1 | 6 | 35.67 | [30.98, 38.79] | 0.9822 | [0.8455, 1.109] | no measurable difference |
| thr128k-notrim | 1 | 6 | 36.78 | [35.78, 38.77] | 1.013 | [0.9556, 1.136] | no measurable difference |
| late1s | 1 | 6 | 35.1 | [29.8, 36.64] | 0.9664 | [0.8201, 1.084] | no measurable difference |

A/A (thread / thread-copy): ratio 1, 95% CI [0.8817, 1.067], half-width 0.09273 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 36.32 | [32.37, 38.34] |
| thread-copy | thread-copy | 6 | 36.3 | [35.14, 38.02] |
| main | main | 6 | 35.45 | [35.16, 37.28] |
| fast0 | fast0 | 6 | 34.8 | [31.76, 36.42] |
| fast70 | fast70 | 6 | 35.16 | [31.8, 35.52] |
| fast100 | fast100 | 6 | 44.67 | [41.67, 46.37] |
| mxfast0 | mxfast0 | 6 | 36.07 | [35.49, 37.28] |
| pin0.1 | pin0.1 | 6 | 35.89 | [35.16, 36.75] |
| pin0.5 | pin0.5 | 6 | 35.36 | [35.06, 36.45] |
| pin0.9 | pin0.9 | 6 | 35.75 | [34.95, 37.99] |
| pin0.99 | pin0.99 | 6 | 36.56 | [35.5, 37.28] |
| mib16 | mib16 | 6 | 27.39 | [26.31, 28.05] |
| mib48 | mib48 | 6 | 58.76 | [55.1, 61.83] |
| mib100 | mib100 | 6 | 109.2 | [108.2, 110.3] |
| notrim | notrim | 6 | 35.77 | [35.33, 37.65] |
| thr128k | thr128k | 6 | 35.67 | [30.98, 38.79] |
| thr128k-notrim | thr128k-notrim | 6 | 36.78 | [35.78, 38.77] |
| late1s | late1s | 6 | 35.1 | [29.8, 36.64] |

## release_actual_s

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | -1 | [-1, -1] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| main | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast0 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast70 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast100 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mxfast0 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.1 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.5 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.9 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.99 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib16 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib48 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib100 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| notrim | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| thr128k | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| thr128k-notrim | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| late1s | 1 | 6 | 0.338 | [0.1055, 0.7415] | -0.338 | [-0.7415, -0.1055] | lower (better) |

A/A (thread / thread-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | -1 | [-1, -1] |
| thread-copy | thread-copy | 6 | -1 | [-1, -1] |
| main | main | 6 | -1 | [-1, -1] |
| fast0 | fast0 | 6 | -1 | [-1, -1] |
| fast70 | fast70 | 6 | -1 | [-1, -1] |
| fast100 | fast100 | 6 | -1 | [-1, -1] |
| mxfast0 | mxfast0 | 6 | -1 | [-1, -1] |
| pin0.1 | pin0.1 | 6 | -1 | [-1, -1] |
| pin0.5 | pin0.5 | 6 | -1 | [-1, -1] |
| pin0.9 | pin0.9 | 6 | -1 | [-1, -1] |
| pin0.99 | pin0.99 | 6 | -1 | [-1, -1] |
| mib16 | mib16 | 6 | -1 | [-1, -1] |
| mib48 | mib48 | 6 | -1 | [-1, -1] |
| mib100 | mib100 | 6 | -1 | [-1, -1] |
| notrim | notrim | 6 | -1 | [-1, -1] |
| thr128k | thr128k | 6 | -1 | [-1, -1] |
| thr128k-notrim | thr128k-notrim | 6 | -1 | [-1, -1] |
| late1s | late1s | 6 | 0.338 | [0.1055, 0.7415] |

## release_delay_s

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | -1 | [-1, -1] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| main | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast0 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast70 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| fast100 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mxfast0 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.1 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.5 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.9 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| pin0.99 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib16 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib48 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| mib100 | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| notrim | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| thr128k | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| thr128k-notrim | 1 | 6 | -1 | [-1, -1] | 1 | [1, 1] | no measurable difference |
| late1s | 1 | 6 | 0.336 | [0.104, 0.7395] | -0.336 | [-0.7395, -0.104] | lower (better) |

A/A (thread / thread-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | -1 | [-1, -1] |
| thread-copy | thread-copy | 6 | -1 | [-1, -1] |
| main | main | 6 | -1 | [-1, -1] |
| fast0 | fast0 | 6 | -1 | [-1, -1] |
| fast70 | fast70 | 6 | -1 | [-1, -1] |
| fast100 | fast100 | 6 | -1 | [-1, -1] |
| mxfast0 | mxfast0 | 6 | -1 | [-1, -1] |
| pin0.1 | pin0.1 | 6 | -1 | [-1, -1] |
| pin0.5 | pin0.5 | 6 | -1 | [-1, -1] |
| pin0.9 | pin0.9 | 6 | -1 | [-1, -1] |
| pin0.99 | pin0.99 | 6 | -1 | [-1, -1] |
| mib16 | mib16 | 6 | -1 | [-1, -1] |
| mib48 | mib48 | 6 | -1 | [-1, -1] |
| mib100 | mib100 | 6 | -1 | [-1, -1] |
| notrim | notrim | 6 | -1 | [-1, -1] |
| thr128k | thr128k | 6 | -1 | [-1, -1] |
| thr128k-notrim | thr128k-notrim | 6 | -1 | [-1, -1] |
| late1s | late1s | 6 | 0.336 | [0.104, 0.7395] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.23 | [24.9, 25.46] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 24.97 | [24.75, 25.29] | 0.9899 | [0.9762, 1.007] | no measurable difference |
| main | 1 | 6 | 0.775 | [0.75, 0.84] | 0.03072 | [0.02963, 0.03345] | lower (better) |
| fast0 | 1 | 6 | 0.84 | [0.82, 0.87] | 0.0333 | [0.03251, 0.03449] | lower (better) |
| fast70 | 1 | 6 | 25.2 | [25.02, 25.34] | 0.9992 | [0.9862, 1.012] | no measurable difference |
| fast100 | 1 | 6 | 31.02 | [31.02, 31.02] | 1.23 | [1.218, 1.246] | higher (worse) |
| mxfast0 | 1 | 6 | 0.935 | [0.905, 0.96] | 0.03707 | [0.0358, 0.03806] | lower (better) |
| pin0.1 | 1 | 6 | 24.11 | [24.08, 24.13] | 0.9556 | [0.9466, 0.9681] | lower (better) |
| pin0.5 | 1 | 6 | 13.77 | [13.74, 13.82] | 0.5459 | [0.5407, 0.553] | lower (better) |
| pin0.9 | 1 | 6 | 3.405 | [3.39, 3.425] | 0.135 | [0.1335, 0.1369] | lower (better) |
| pin0.99 | 1 | 6 | 1.045 | [1.02, 1.1] | 0.04143 | [0.04044, 0.04374] | lower (better) |
| mib16 | 1 | 6 | 15.64 | [15.43, 15.91] | 0.62 | [0.6106, 0.6319] | lower (better) |
| mib48 | 1 | 6 | 48.8 | [48.35, 49.2] | 1.935 | [1.91, 1.965] | higher (worse) |
| mib100 | 1 | 6 | 40.33 | [40.3, 40.36] | 1.599 | [1.584, 1.619] | higher (worse) |
| notrim | 1 | 6 | 26 | [25.98, 26.01] | 1.031 | [1.021, 1.044] | higher (worse) |
| thr128k | 1 | 6 | 25.1 | [24.87, 25.45] | 0.995 | [0.9825, 1.014] | no measurable difference |
| thr128k-notrim | 1 | 6 | 25.98 | [25.98, 26] | 1.03 | [1.021, 1.044] | higher (worse) |
| late1s | 1 | 6 | 24.88 | [12.73, 25.38] | 0.9861 | [0.5049, 1.01] | no measurable difference |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9932, 1.024], half-width 0.01557 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.23 | [24.9, 25.46] |
| thread-copy | thread-copy | 6 | 24.97 | [24.75, 25.29] |
| main | main | 6 | 0.775 | [0.75, 0.84] |
| fast0 | fast0 | 6 | 0.84 | [0.82, 0.87] |
| fast70 | fast70 | 6 | 25.2 | [25.02, 25.34] |
| fast100 | fast100 | 6 | 31.02 | [31.02, 31.02] |
| mxfast0 | mxfast0 | 6 | 0.935 | [0.905, 0.96] |
| pin0.1 | pin0.1 | 6 | 24.11 | [24.08, 24.13] |
| pin0.5 | pin0.5 | 6 | 13.77 | [13.74, 13.82] |
| pin0.9 | pin0.9 | 6 | 3.405 | [3.39, 3.425] |
| pin0.99 | pin0.99 | 6 | 1.045 | [1.02, 1.1] |
| mib16 | mib16 | 6 | 15.64 | [15.43, 15.91] |
| mib48 | mib48 | 6 | 48.8 | [48.35, 49.2] |
| mib100 | mib100 | 6 | 40.33 | [40.3, 40.36] |
| notrim | notrim | 6 | 26 | [25.98, 26.01] |
| thr128k | thr128k | 6 | 25.1 | [24.87, 25.45] |
| thr128k-notrim | thr128k-notrim | 6 | 25.98 | [25.98, 26] |
| late1s | late1s | 6 | 24.88 | [12.73, 25.38] |

## rssanon_settled_3s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.23 | [24.9, 25.46] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 24.97 | [24.75, 25.29] | 0.9899 | [0.9762, 1.007] | no measurable difference |
| main | 1 | 6 | 0.775 | [0.75, 0.84] | 0.03072 | [0.02963, 0.0334] | lower (better) |
| fast0 | 1 | 6 | 0.84 | [0.82, 0.87] | 0.0333 | [0.03251, 0.03454] | lower (better) |
| fast70 | 1 | 6 | 25.2 | [25.02, 25.34] | 0.9992 | [0.9862, 1.012] | no measurable difference |
| fast100 | 1 | 6 | 31.02 | [31.02, 31.02] | 1.23 | [1.218, 1.246] | higher (worse) |
| mxfast0 | 1 | 6 | 0.935 | [0.905, 0.96] | 0.03707 | [0.0358, 0.03814] | lower (better) |
| pin0.1 | 1 | 6 | 24.11 | [24.08, 24.13] | 0.9556 | [0.9466, 0.9679] | lower (better) |
| pin0.5 | 1 | 6 | 13.77 | [13.74, 13.82] | 0.5459 | [0.5407, 0.553] | lower (better) |
| pin0.9 | 1 | 6 | 3.405 | [3.39, 3.425] | 0.135 | [0.1335, 0.1367] | lower (better) |
| pin0.99 | 1 | 6 | 1.045 | [1.02, 1.1] | 0.04143 | [0.04044, 0.04383] | lower (better) |
| mib16 | 1 | 6 | 15.64 | [15.43, 15.91] | 0.62 | [0.6106, 0.6319] | lower (better) |
| mib48 | 1 | 6 | 48.8 | [48.35, 49.2] | 1.935 | [1.909, 1.964] | higher (worse) |
| mib100 | 1 | 6 | 40.33 | [40.3, 40.36] | 1.599 | [1.584, 1.619] | higher (worse) |
| notrim | 1 | 6 | 26 | [25.98, 26.01] | 1.031 | [1.021, 1.044] | higher (worse) |
| thr128k | 1 | 6 | 25.1 | [24.87, 25.45] | 0.995 | [0.9825, 1.013] | no measurable difference |
| thr128k-notrim | 1 | 6 | 25.98 | [25.98, 26] | 1.03 | [1.021, 1.044] | higher (worse) |
| late1s | 1 | 6 | 0.93 | [0.875, 0.945] | 0.03687 | [0.03469, 0.03757] | lower (better) |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9932, 1.024], half-width 0.01557 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.23 | [24.9, 25.46] |
| thread-copy | thread-copy | 6 | 24.97 | [24.75, 25.29] |
| main | main | 6 | 0.775 | [0.75, 0.84] |
| fast0 | fast0 | 6 | 0.84 | [0.82, 0.87] |
| fast70 | fast70 | 6 | 25.2 | [25.02, 25.34] |
| fast100 | fast100 | 6 | 31.02 | [31.02, 31.02] |
| mxfast0 | mxfast0 | 6 | 0.935 | [0.905, 0.96] |
| pin0.1 | pin0.1 | 6 | 24.11 | [24.08, 24.13] |
| pin0.5 | pin0.5 | 6 | 13.77 | [13.74, 13.82] |
| pin0.9 | pin0.9 | 6 | 3.405 | [3.39, 3.425] |
| pin0.99 | pin0.99 | 6 | 1.045 | [1.02, 1.1] |
| mib16 | mib16 | 6 | 15.64 | [15.43, 15.91] |
| mib48 | mib48 | 6 | 48.8 | [48.35, 49.2] |
| mib100 | mib100 | 6 | 40.33 | [40.3, 40.36] |
| notrim | notrim | 6 | 26 | [25.98, 26.01] |
| thr128k | thr128k | 6 | 25.1 | [24.87, 25.45] |
| thr128k-notrim | thr128k-notrim | 6 | 25.98 | [25.98, 26] |
| late1s | late1s | 6 | 0.93 | [0.875, 0.945] |

## self_rssanon_boundary_mib

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.23 | [24.89, 25.46] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 24.97 | [24.75, 25.29] | 0.9899 | [0.9762, 1.007] | no measurable difference |
| main | 1 | 6 | 0.775 | [0.75, 0.84] | 0.03072 | [0.02963, 0.03341] | lower (better) |
| fast0 | 1 | 6 | 0.835 | [0.815, 0.86] | 0.0331 | [0.03224, 0.03409] | lower (better) |
| fast70 | 1 | 6 | 25.2 | [25.01, 25.34] | 0.9992 | [0.986, 1.013] | no measurable difference |
| fast100 | 1 | 6 | 31.01 | [31.01, 31.02] | 1.229 | [1.218, 1.246] | higher (worse) |
| mxfast0 | 1 | 6 | 0.93 | [0.9, 0.95] | 0.03687 | [0.03568, 0.03766] | lower (better) |
| pin0.1 | 1 | 6 | 24.09 | [24.08, 24.13] | 0.9552 | [0.9466, 0.9681] | lower (better) |
| pin0.5 | 1 | 6 | 13.77 | [13.73, 13.82] | 0.5457 | [0.5405, 0.553] | lower (better) |
| pin0.9 | 1 | 6 | 3.395 | [3.385, 3.42] | 0.1346 | [0.1332, 0.1367] | lower (better) |
| pin0.99 | 1 | 6 | 1.04 | [1.015, 1.095] | 0.04123 | [0.04015, 0.0435] | lower (better) |
| mib16 | 1 | 6 | 15.63 | [15.42, 15.9] | 0.6198 | [0.6104, 0.6319] | lower (better) |
| mib48 | 1 | 6 | 48.8 | [48.34, 49.2] | 1.935 | [1.909, 1.965] | higher (worse) |
| mib100 | 1 | 6 | 40.33 | [40.3, 40.36] | 1.599 | [1.584, 1.62] | higher (worse) |
| notrim | 1 | 6 | 26 | [25.98, 26.01] | 1.031 | [1.021, 1.045] | higher (worse) |
| thr128k | 1 | 6 | 25.09 | [24.87, 25.45] | 0.9948 | [0.9825, 1.014] | no measurable difference |
| thr128k-notrim | 1 | 6 | 25.98 | [25.98, 26] | 1.03 | [1.021, 1.044] | higher (worse) |
| late1s | 1 | 6 | 25.1 | [24.64, 25.38] | 0.995 | [0.975, 1.012] | no measurable difference |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9928, 1.024], half-width 0.01577 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.23 | [24.89, 25.46] |
| thread-copy | thread-copy | 6 | 24.97 | [24.75, 25.29] |
| main | main | 6 | 0.775 | [0.75, 0.84] |
| fast0 | fast0 | 6 | 0.835 | [0.815, 0.86] |
| fast70 | fast70 | 6 | 25.2 | [25.01, 25.34] |
| fast100 | fast100 | 6 | 31.01 | [31.01, 31.02] |
| mxfast0 | mxfast0 | 6 | 0.93 | [0.9, 0.95] |
| pin0.1 | pin0.1 | 6 | 24.09 | [24.08, 24.13] |
| pin0.5 | pin0.5 | 6 | 13.77 | [13.73, 13.82] |
| pin0.9 | pin0.9 | 6 | 3.395 | [3.385, 3.42] |
| pin0.99 | pin0.99 | 6 | 1.04 | [1.015, 1.095] |
| mib16 | mib16 | 6 | 15.63 | [15.42, 15.9] |
| mib48 | mib48 | 6 | 48.8 | [48.34, 49.2] |
| mib100 | mib100 | 6 | 40.33 | [40.3, 40.36] |
| notrim | notrim | 6 | 26 | [25.98, 26.01] |
| thr128k | thr128k | 6 | 25.09 | [24.87, 25.45] |
| thr128k-notrim | thr128k-notrim | 6 | 25.98 | [25.98, 26] |
| late1s | late1s | 6 | 25.1 | [24.64, 25.38] |

## self_rssanon_mib

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 25.23 | [24.9, 25.46] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 24.97 | [24.75, 25.29] | 0.9899 | [0.9762, 1.007] | no measurable difference |
| main | 1 | 6 | 0.775 | [0.75, 0.84] | 0.03072 | [0.02963, 0.0334] | lower (better) |
| fast0 | 1 | 6 | 0.84 | [0.82, 0.87] | 0.0333 | [0.03251, 0.03443] | lower (better) |
| fast70 | 1 | 6 | 25.2 | [25.02, 25.34] | 0.9992 | [0.9862, 1.012] | no measurable difference |
| fast100 | 1 | 6 | 31.02 | [31.02, 31.02] | 1.23 | [1.218, 1.246] | higher (worse) |
| mxfast0 | 1 | 6 | 0.935 | [0.905, 0.96] | 0.03707 | [0.03586, 0.03814] | lower (better) |
| pin0.1 | 1 | 6 | 24.11 | [24.08, 24.13] | 0.9556 | [0.9466, 0.9679] | lower (better) |
| pin0.5 | 1 | 6 | 13.77 | [13.74, 13.82] | 0.5459 | [0.5407, 0.553] | lower (better) |
| pin0.9 | 1 | 6 | 3.405 | [3.39, 3.425] | 0.135 | [0.1335, 0.1367] | lower (better) |
| pin0.99 | 1 | 6 | 1.045 | [1.02, 1.1] | 0.04143 | [0.04044, 0.04374] | lower (better) |
| mib16 | 1 | 6 | 15.64 | [15.43, 15.91] | 0.62 | [0.6106, 0.632] | lower (better) |
| mib48 | 1 | 6 | 48.8 | [48.35, 49.2] | 1.935 | [1.909, 1.964] | higher (worse) |
| mib100 | 1 | 6 | 40.33 | [40.3, 40.36] | 1.599 | [1.584, 1.619] | higher (worse) |
| notrim | 1 | 6 | 26 | [25.98, 26.01] | 1.031 | [1.021, 1.044] | higher (worse) |
| thr128k | 1 | 6 | 25.1 | [24.87, 25.45] | 0.995 | [0.9825, 1.013] | no measurable difference |
| thr128k-notrim | 1 | 6 | 25.98 | [25.98, 26] | 1.03 | [1.021, 1.043] | higher (worse) |
| late1s | 1 | 6 | 0.93 | [0.875, 0.945] | 0.03687 | [0.03476, 0.03756] | lower (better) |

A/A (thread / thread-copy): ratio 1.01, 95% CI [0.9932, 1.024], half-width 0.01557 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 25.23 | [24.9, 25.46] |
| thread-copy | thread-copy | 6 | 24.97 | [24.75, 25.29] |
| main | main | 6 | 0.775 | [0.75, 0.84] |
| fast0 | fast0 | 6 | 0.84 | [0.82, 0.87] |
| fast70 | fast70 | 6 | 25.2 | [25.02, 25.34] |
| fast100 | fast100 | 6 | 31.02 | [31.02, 31.02] |
| mxfast0 | mxfast0 | 6 | 0.935 | [0.905, 0.96] |
| pin0.1 | pin0.1 | 6 | 24.11 | [24.08, 24.13] |
| pin0.5 | pin0.5 | 6 | 13.77 | [13.74, 13.82] |
| pin0.9 | pin0.9 | 6 | 3.405 | [3.39, 3.425] |
| pin0.99 | pin0.99 | 6 | 1.045 | [1.02, 1.1] |
| mib16 | mib16 | 6 | 15.64 | [15.43, 15.91] |
| mib48 | mib48 | 6 | 48.8 | [48.35, 49.2] |
| mib100 | mib100 | 6 | 40.33 | [40.3, 40.36] |
| notrim | notrim | 6 | 26 | [25.98, 26.01] |
| thr128k | thr128k | 6 | 25.1 | [24.87, 25.45] |
| thr128k-notrim | thr128k-notrim | 6 | 25.98 | [25.98, 26] |
| late1s | late1s | 6 | 0.93 | [0.875, 0.945] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs thread | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| thread | 1 | 6 | 27.54 | [27.49, 28.34] | 1 | n/a | baseline |
| thread-copy | 1 | 6 | 27.59 | [27.48, 28.33] | 1.002 | [0.9735, 1.029] | no measurable difference |
| main | 1 | 6 | 27.74 | [27.59, 28.76] | 1.007 | [0.9792, 1.044] | no measurable difference |
| fast0 | 1 | 6 | 26.72 | [26.57, 26.79] | 0.9704 | [0.9428, 0.9733] | lower (better) |
| fast70 | 1 | 6 | 27.64 | [27.49, 27.7] | 1.004 | [0.9753, 1.006] | no measurable difference |
| fast100 | 1 | 6 | 36.13 | [35.63, 37.1] | 1.312 | [1.275, 1.346] | higher (worse) |
| mxfast0 | 1 | 6 | 27.49 | [27.42, 28.16] | 0.9984 | [0.9707, 1.023] | no measurable difference |
| pin0.1 | 1 | 6 | 27.63 | [27.52, 28.52] | 1.003 | [0.9749, 1.034] | no measurable difference |
| pin0.5 | 1 | 6 | 27.65 | [27.51, 27.7] | 1.004 | [0.9757, 1.007] | no measurable difference |
| pin0.9 | 1 | 6 | 27.7 | [27.55, 29.15] | 1.006 | [0.979, 1.058] | no measurable difference |
| pin0.99 | 1 | 6 | 28.35 | [27.46, 29.45] | 1.03 | [0.9915, 1.07] | no measurable difference |
| mib16 | 1 | 6 | 19.02 | [18.13, 19.93] | 0.6906 | [0.6549, 0.7238] | lower (better) |
| mib48 | 1 | 6 | 52.95 | [51.53, 53.38] | 1.923 | [1.86, 1.937] | higher (worse) |
| mib100 | 1 | 6 | 107.4 | [106.9, 108.2] | 3.899 | [3.789, 3.925] | higher (worse) |
| notrim | 1 | 6 | 28.32 | [27.52, 29.14] | 1.029 | [0.9951, 1.058] | no measurable difference |
| thr128k | 1 | 6 | 28.49 | [27.49, 29.34] | 1.035 | [0.9924, 1.066] | no measurable difference |
| thr128k-notrim | 1 | 6 | 29 | [27.55, 29.29] | 1.053 | [0.9975, 1.063] | no measurable difference |
| late1s | 1 | 6 | 27.74 | [27.57, 28.7] | 1.007 | [0.9792, 1.042] | no measurable difference |

A/A (thread / thread-copy): ratio 0.998, 95% CI [0.9721, 1.027], half-width 0.02755 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| thread | thread | 6 | 27.54 | [27.49, 28.34] |
| thread-copy | thread-copy | 6 | 27.59 | [27.48, 28.33] |
| main | main | 6 | 27.74 | [27.59, 28.76] |
| fast0 | fast0 | 6 | 26.72 | [26.57, 26.79] |
| fast70 | fast70 | 6 | 27.64 | [27.49, 27.7] |
| fast100 | fast100 | 6 | 36.13 | [35.63, 37.1] |
| mxfast0 | mxfast0 | 6 | 27.49 | [27.42, 28.16] |
| pin0.1 | pin0.1 | 6 | 27.63 | [27.52, 28.52] |
| pin0.5 | pin0.5 | 6 | 27.65 | [27.51, 27.7] |
| pin0.9 | pin0.9 | 6 | 27.7 | [27.55, 29.15] |
| pin0.99 | pin0.99 | 6 | 28.35 | [27.46, 29.45] |
| mib16 | mib16 | 6 | 19.02 | [18.13, 19.93] |
| mib48 | mib48 | 6 | 52.95 | [51.53, 53.38] |
| mib100 | mib100 | 6 | 107.4 | [106.9, 108.2] |
| notrim | notrim | 6 | 28.32 | [27.52, 29.14] |
| thr128k | thr128k | 6 | 28.49 | [27.49, 29.34] |
| thr128k-notrim | thr128k-notrim | 6 | 29 | [27.55, 29.29] |
| late1s | late1s | 6 | 27.74 | [27.57, 28.7] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.11 2.38 2.47 2/2053 184107 / 4.12 3.37 2.83 3/2099 255835
