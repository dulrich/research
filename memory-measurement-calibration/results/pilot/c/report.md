# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 415.9 | [415.5, 416.7] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.4 | [413.7, 415.7] | 0.9964 | [0.9939, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 415.9 | [415.5, 416.7] |
| c2 | c2 | 4 | 414.4 | [413.7, 415.7] |

## anon_settled_120s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 416 | [415.6, 416.8] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.5 | [413.8, 415.8] | 0.9964 | [0.9937, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 416 | [415.6, 416.8] |
| c2 | c2 | 4 | 414.5 | [413.8, 415.8] |

## anon_settled_30s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 416 | [415.6, 416.8] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.5 | [413.8, 415.8] | 0.9964 | [0.9939, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 416 | [415.6, 416.8] |
| c2 | c2 | 4 | 414.5 | [413.8, 415.8] |

## arenas

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 13 | [13, 13] | 1 | n/a | baseline |
| c2 | 1 | 4 | 13 | [13, 13] | 1 | [1, 1] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 13 | [13, 13] |
| c2 | c2 | 4 | 13 | [13, 13] |

## bad_mode_0s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c12 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4/4 (1) | [0.3976, 1] | 0 | n/a | baseline |
| c2 | 1 | 4/4 (1) | [0.3976, 1] | 0 | [-0.4899, 0.4899] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 4/4 (1) | [0.3976, 1] |
| c2 | c2 | 4/4 (1) | [0.3976, 1] |

## bad_mode_120s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c12 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4/4 (1) | [0.3976, 1] | 0 | n/a | baseline |
| c2 | 1 | 4/4 (1) | [0.3976, 1] | 0 | [-0.4899, 0.4899] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 4/4 (1) | [0.3976, 1] |
| c2 | c2 | 4/4 (1) | [0.3976, 1] |

## bad_mode_30s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs c12 | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4/4 (1) | [0.3976, 1] | 0 | n/a | baseline |
| c2 | 1 | 4/4 (1) | [0.3976, 1] | 0 | [-0.4899, 0.4899] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| c12 | c12 | 4/4 (1) | [0.3976, 1] |
| c2 | c2 | 4/4 (1) | [0.3976, 1] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 418 | [417.7, 418.1] | 1 | n/a | baseline |
| c2 | 1 | 4 | 416.5 | [416.4, 417] | 0.9966 | [0.9961, 0.9977] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 418 | [417.7, 418.1] |
| c2 | c2 | 4 | 416.5 | [416.4, 417] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 0 | [0, 0] | 1 | n/a | baseline |
| c2 | 1 | 4 | 0 | [0, 0] | n/a | [n/a, n/a] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 0 | [0, 0] |
| c2 | c2 | 4 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 422.7 | [422.5, 423.3] | 1 | n/a | baseline |
| c2 | 1 | 4 | 420.1 | [419.3, 420.3] | 0.994 | [0.9919, 0.9945] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 422.7 | [422.5, 423.3] |
| c2 | c2 | 4 | 420.1 | [419.3, 420.3] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 415.7 | [415.3, 416.6] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.2 | [413.5, 415.5] | 0.9964 | [0.9937, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 415.7 | [415.3, 416.6] |
| c2 | c2 | 4 | 414.2 | [413.5, 415.5] |

## rssanon_settled_120s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 415.7 | [415.3, 416.6] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.2 | [413.5, 415.5] | 0.9964 | [0.9939, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 415.7 | [415.3, 416.6] |
| c2 | c2 | 4 | 414.2 | [413.5, 415.5] |

## rssanon_settled_30s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 415.7 | [415.3, 416.6] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.2 | [413.5, 415.5] | 0.9964 | [0.9937, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 415.7 | [415.3, 416.6] |
| c2 | c2 | 4 | 414.2 | [413.5, 415.5] |

## self_rssanon_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 415.7 | [415.3, 416.6] | 1 | n/a | baseline |
| c2 | 1 | 4 | 414.2 | [413.5, 415.5] | 0.9964 | [0.9939, 0.9994] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 415.7 | [415.3, 416.6] |
| c2 | c2 | 4 | 414.2 | [413.5, 415.5] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs c12 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| c12 | 1 | 4 | 420.4 | [420.2, 420.4] | 1 | n/a | baseline |
| c2 | 1 | 4 | 418.4 | [417.8, 418.6] | 0.9953 | [0.994, 0.9958] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| c12 | c12 | 4 | 420.4 | [420.2, 420.4] |
| c2 | c2 | 4 | 418.4 | [417.8, 418.6] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.45 2.72 2.97 2/1992 3383624 / 3.80 3.35 3.18 4/2044 3480005
