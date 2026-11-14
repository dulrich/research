# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416.3 | [415.8, 416.5] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.7 | [415.5, 416.1] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.9 | [414.6, 415.3] | 0.9979 | [0.9968, 0.9991] | lower (better) |
| c6-arena2 | 1 | 20 | 387 | [386.3, 388.7] | 0.9308 | [0.9291, 0.9351] | lower (better) |
| c6-copy | 1 | 20 | 415.7 | [415.4, 415.9] | 0.9999 | [0.9987, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9993, 1.001], half-width 0.001023 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416.3 | [415.8, 416.5] |
| c6 | c6 | 20 | 415.7 | [415.5, 416.1] |
| c2 | c2 | 20 | 414.9 | [414.6, 415.3] |
| c6-arena2 | c6-arena2 | 20 | 387 | [386.3, 388.7] |
| c6-copy | c6-copy | 20 | 415.7 | [415.4, 415.9] |

## anon_settled_120s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416.3 | [415.9, 416.5] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.8 | [415.6, 416.2] | 1 | n/a | baseline |
| c2 | 1 | 20 | 415 | [414.7, 415.5] | 0.9979 | [0.9968, 0.9993] | lower (better) |
| c6-arena2 | 1 | 20 | 387.9 | [386.3, 389.2] | 0.9327 | [0.9288, 0.9359] | lower (better) |
| c6-copy | 1 | 20 | 415.8 | [415.5, 416] | 0.9999 | [0.9988, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9993, 1.001], half-width 0.0009984 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416.3 | [415.9, 416.5] |
| c6 | c6 | 20 | 415.8 | [415.6, 416.2] |
| c2 | c2 | 20 | 415 | [414.7, 415.5] |
| c6-arena2 | c6-arena2 | 20 | 387.9 | [386.3, 389.2] |
| c6-copy | c6-copy | 20 | 415.8 | [415.5, 416] |

## anon_settled_30s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416.3 | [415.9, 416.5] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.8 | [415.6, 416.3] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.9 | [414.7, 415.5] | 0.9979 | [0.9967, 0.9992] | lower (better) |
| c6-arena2 | 1 | 20 | 387.2 | [386.3, 388.4] | 0.9312 | [0.9287, 0.9343] | lower (better) |
| c6-copy | 1 | 20 | 415.8 | [415.5, 416] | 0.9999 | [0.9986, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9994, 1.001], half-width 0.001022 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416.3 | [415.9, 416.5] |
| c6 | c6 | 20 | 415.8 | [415.6, 416.3] |
| c2 | c2 | 20 | 414.9 | [414.7, 415.5] |
| c6-arena2 | c6-arena2 | 20 | 387.2 | [386.3, 388.4] |
| c6-copy | c6-copy | 20 | 415.8 | [415.5, 416] |

## arenas

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 13 | [13, 13] | 1 | [1, 1] | no measurable difference |
| c6 | 1 | 20 | 13 | [13, 13] | 1 | n/a | baseline |
| c2 | 1 | 20 | 13 | [13, 13] | 1 | [1, 1] | no measurable difference |
| c6-arena2 | 1 | 20 | 2 | [2, 2] | 0.1538 | [0.1538, 0.1538] | lower (better) |
| c6-copy | 1 | 20 | 13 | [13, 13] | 1 | [1, 1] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 13 | [13, 13] |
| c6 | c6 | 20 | 13 | [13, 13] |
| c2 | c2 | 20 | 13 | [13, 13] |
| c6-arena2 | c6-arena2 | 20 | 2 | [2, 2] |
| c6-copy | c6-copy | 20 | 13 | [13, 13] |

## bad_mode_0s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c6 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6 | 1 | 0/20 (0) | [0, 0.1684] | 0 | n/a | baseline |
| c2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-arena2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-copy | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |

A/A (c6 - c6-copy): difference 0, 95% CI [-0.1611, 0.1611], half-width 0.1611 (noise floor).

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 0/20 (0) | [0, 0.1684] |
| c6 | c6 | 0/20 (0) | [0, 0.1684] |
| c2 | c2 | 0/20 (0) | [0, 0.1684] |
| c6-arena2 | c6-arena2 | 0/20 (0) | [0, 0.1684] |
| c6-copy | c6-copy | 0/20 (0) | [0, 0.1684] |

## bad_mode_120s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c6 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6 | 1 | 0/20 (0) | [0, 0.1684] | 0 | n/a | baseline |
| c2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-arena2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-copy | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |

A/A (c6 - c6-copy): difference 0, 95% CI [-0.1611, 0.1611], half-width 0.1611 (noise floor).

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 0/20 (0) | [0, 0.1684] |
| c6 | c6 | 0/20 (0) | [0, 0.1684] |
| c2 | c2 | 0/20 (0) | [0, 0.1684] |
| c6-arena2 | c6-arena2 | 0/20 (0) | [0, 0.1684] |
| c6-copy | c6-copy | 0/20 (0) | [0, 0.1684] |

## bad_mode_30s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c6 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6 | 1 | 0/20 (0) | [0, 0.1684] | 0 | n/a | baseline |
| c2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-arena2 | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |
| c6-copy | 1 | 0/20 (0) | [0, 0.1684] | 0 | [-0.1611, 0.1611] | no measurable difference |

A/A (c6 - c6-copy): difference 0, 95% CI [-0.1611, 0.1611], half-width 0.1611 (noise floor).

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 0/20 (0) | [0, 0.1684] |
| c6 | c6 | 0/20 (0) | [0, 0.1684] |
| c2 | c2 | 0/20 (0) | [0, 0.1684] |
| c6-arena2 | c6-arena2 | 0/20 (0) | [0, 0.1684] |
| c6-copy | c6-copy | 0/20 (0) | [0, 0.1684] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 417.9 | [417.9, 418] | 1 | [1, 1.001] | higher (worse) |
| c6 | 1 | 20 | 417.8 | [417.7, 417.9] | 1 | n/a | baseline |
| c2 | 1 | 20 | 416.6 | [416.4, 416.7] | 0.9971 | [0.9967, 0.9974] | lower (better) |
| c6-arena2 | 1 | 20 | 388.2 | [387.5, 389.4] | 0.9292 | [0.9274, 0.932] | lower (better) |
| c6-copy | 1 | 20 | 417.8 | [417.7, 417.9] | 1 | [0.9997, 1] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9997, 1], half-width 0.0003351 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 417.9 | [417.9, 418] |
| c6 | c6 | 20 | 417.8 | [417.7, 417.9] |
| c2 | c2 | 20 | 416.6 | [416.4, 416.7] |
| c6-arena2 | c6-arena2 | 20 | 388.2 | [387.5, 389.4] |
| c6-copy | c6-copy | 20 | 417.8 | [417.7, 417.9] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| c6 | 1 | 20 | 0 | [0, 0] | 1 | n/a | baseline |
| c2 | 1 | 20 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| c6-arena2 | 1 | 20 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| c6-copy | 1 | 20 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (c6 / c6-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 0 | [0, 0] |
| c6 | c6 | 20 | 0 | [0, 0] |
| c2 | c2 | 20 | 0 | [0, 0] |
| c6-arena2 | c6-arena2 | 20 | 0 | [0, 0] |
| c6-copy | c6-copy | 20 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 422.9 | [422.8, 423.1] | 1.003 | [1.003, 1.004] | higher (worse) |
| c6 | 1 | 20 | 421.6 | [421.5, 421.8] | 1 | n/a | baseline |
| c2 | 1 | 20 | 419.9 | [419.7, 420.3] | 0.9959 | [0.9954, 0.997] | lower (better) |
| c6-arena2 | 1 | 20 | 391.8 | [391.1, 393.4] | 0.9294 | [0.9277, 0.933] | lower (better) |
| c6-copy | 1 | 20 | 421.6 | [421.5, 421.9] | 1 | [0.9996, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9992, 1], half-width 0.0005929 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 422.9 | [422.8, 423.1] |
| c6 | c6 | 20 | 421.6 | [421.5, 421.8] |
| c2 | c2 | 20 | 419.9 | [419.7, 420.3] |
| c6-arena2 | c6-arena2 | 20 | 391.8 | [391.1, 393.4] |
| c6-copy | c6-copy | 20 | 421.6 | [421.5, 421.9] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416 | [415.6, 416.2] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.5 | [415.3, 416] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.6 | [414.4, 415.1] | 0.9978 | [0.9966, 0.9992] | lower (better) |
| c6-arena2 | 1 | 20 | 386.6 | [386, 388.1] | 0.9303 | [0.9285, 0.9341] | lower (better) |
| c6-copy | 1 | 20 | 415.5 | [415.2, 415.7] | 0.9999 | [0.9986, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9993, 1.001], half-width 0.001029 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416 | [415.6, 416.2] |
| c6 | c6 | 20 | 415.5 | [415.3, 416] |
| c2 | c2 | 20 | 414.6 | [414.4, 415.1] |
| c6-arena2 | c6-arena2 | 20 | 386.6 | [386, 388.1] |
| c6-copy | c6-copy | 20 | 415.5 | [415.2, 415.7] |

## rssanon_settled_120s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416 | [415.6, 416.2] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.5 | [415.3, 416] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.7 | [414.4, 415.2] | 0.998 | [0.9968, 0.9993] | lower (better) |
| c6-arena2 | 1 | 20 | 387.6 | [386, 388.9] | 0.9328 | [0.9287, 0.9357] | lower (better) |
| c6-copy | 1 | 20 | 415.5 | [415.2, 415.7] | 0.9999 | [0.9987, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9992, 1.001], half-width 0.001011 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416 | [415.6, 416.2] |
| c6 | c6 | 20 | 415.5 | [415.3, 416] |
| c2 | c2 | 20 | 414.7 | [414.4, 415.2] |
| c6-arena2 | c6-arena2 | 20 | 387.6 | [386, 388.9] |
| c6-copy | c6-copy | 20 | 415.5 | [415.2, 415.7] |

## rssanon_settled_30s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416 | [415.6, 416.2] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.5 | [415.3, 416] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.6 | [414.4, 415.2] | 0.9979 | [0.9967, 0.9992] | lower (better) |
| c6-arena2 | 1 | 20 | 386.9 | [386, 388.1] | 0.9312 | [0.9287, 0.9342] | lower (better) |
| c6-copy | 1 | 20 | 415.5 | [415.2, 415.7] | 0.9999 | [0.9986, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9993, 1.001], half-width 0.001041 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416 | [415.6, 416.2] |
| c6 | c6 | 20 | 415.5 | [415.3, 416] |
| c2 | c2 | 20 | 414.6 | [414.4, 415.2] |
| c6-arena2 | c6-arena2 | 20 | 386.9 | [386, 388.1] |
| c6-copy | c6-copy | 20 | 415.5 | [415.2, 415.7] |

## self_rssanon_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 416 | [415.6, 416.2] | 1.001 | [0.9998, 1.002] | no measurable difference |
| c6 | 1 | 20 | 415.5 | [415.3, 416] | 1 | n/a | baseline |
| c2 | 1 | 20 | 414.7 | [414.4, 415.2] | 0.998 | [0.9968, 0.9993] | lower (better) |
| c6-arena2 | 1 | 20 | 387.6 | [386, 388.9] | 0.9328 | [0.9287, 0.9359] | lower (better) |
| c6-copy | 1 | 20 | 415.5 | [415.2, 415.7] | 0.9999 | [0.9987, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9993, 1.001], half-width 0.001011 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 416 | [415.6, 416.2] |
| c6 | c6 | 20 | 415.5 | [415.3, 416] |
| c2 | c2 | 20 | 414.7 | [414.4, 415.2] |
| c6-arena2 | c6-arena2 | 20 | 387.6 | [386, 388.9] |
| c6-copy | c6-copy | 20 | 415.5 | [415.2, 415.7] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c6 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 20 | 420.3 | [420.2, 420.4] | 1.002 | [1.002, 1.002] | higher (worse) |
| c6 | 1 | 20 | 419.4 | [419.3, 419.5] | 1 | n/a | baseline |
| c2 | 1 | 20 | 418.3 | [418.2, 418.5] | 0.9973 | [0.997, 0.998] | lower (better) |
| c6-arena2 | 1 | 20 | 389.4 | [388.8, 390.6] | 0.9285 | [0.9271, 0.9313] | lower (better) |
| c6-copy | 1 | 20 | 419.4 | [419.3, 419.6] | 1 | [0.9997, 1.001] | no measurable difference |

A/A (c6 / c6-copy): ratio 1, 95% CI [0.9995, 1], half-width 0.0004291 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 20 | 420.3 | [420.2, 420.4] |
| c6 | c6 | 20 | 419.4 | [419.3, 419.5] |
| c2 | c2 | 20 | 418.3 | [418.2, 418.5] |
| c6-arena2 | c6-arena2 | 20 | 389.4 | [388.8, 390.6] |
| c6-copy | c6-copy | 20 | 419.4 | [419.3, 419.6] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 3.31 3.97 3.54 1/2336 3733796 / 0.29 0.42 0.53 1/1901 1080789
