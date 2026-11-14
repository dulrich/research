# Measurement report

Seed 20261114; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.28 | [1.24, 1.295] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.27 | [25.14, 25.49] | 19.75 | [19.47, 20.43] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.28 | [1.24, 1.295] |
| p1 | p1 | 12 | 25.27 | [25.14, 25.49] |

## anon_settled_3s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.29 | [1.245, 1.365] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.33 | [25.14, 25.49] | 19.64 | [18.55, 20.35] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.29 | [1.245, 1.365] |
| p1 | p1 | 12 | 25.33 | [25.14, 25.49] |

## bad_drawn

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 0 | [0, 0] | 1 | n/a | baseline |
| p1 | 1 | 12 | 1 | [1, 1] | n/a | [n/a, n/a] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 0 | [0, 0] |
| p1 | p1 | 12 | 1 | [1, 1] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 6.405 | [6.295, 7.325] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.38 | [25.25, 25.59] | 3.963 | [3.461, 4.051] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 6.405 | [6.295, 7.325] |
| p1 | p1 | 12 | 25.38 | [25.25, 25.59] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 0 | [0, 0] | 1 | n/a | baseline |
| p1 | 1 | 12 | 0 | [0, 0] | n/a | [n/a, n/a] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 0 | [0, 0] |
| p1 | p1 | 12 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 35.82 | [35.16, 36.53] | 1 | n/a | baseline |
| p1 | 1 | 12 | 35.22 | [33.08, 36.92] | 0.9834 | [0.9202, 1.034] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 35.82 | [35.16, 36.53] |
| p1 | p1 | 12 | 35.22 | [33.08, 36.92] |

## release_actual_s

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | -1 | [-1, -1] | 1 | n/a | baseline |
| p1 | 1 | 12 | -1 | [-1, -1] | 1 | [1, 1] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | -1 | [-1, -1] |
| p1 | p1 | 12 | -1 | [-1, -1] |

## release_delay_s

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | -1 | [-1, -1] | 1 | n/a | baseline |
| p1 | 1 | 12 | -1 | [-1, -1] | 1 | [1, 1] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | -1 | [-1, -1] |
| p1 | p1 | 12 | -1 | [-1, -1] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.08 | [1.045, 1.105] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.08 | [24.95, 25.3] | 23.22 | [22.69, 24.06] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.08 | [1.045, 1.105] |
| p1 | p1 | 12 | 25.08 | [24.95, 25.3] |

## rssanon_settled_3s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.08 | [1.045, 1.105] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.08 | [24.95, 25.3] | 23.22 | [22.7, 24.08] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.08 | [1.045, 1.105] |
| p1 | p1 | 12 | 25.08 | [24.95, 25.3] |

## self_rssanon_boundary_mib

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.08 | [1.04, 1.1] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.08 | [24.95, 25.29] | 23.22 | [22.77, 24.14] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.08 | [1.04, 1.1] |
| p1 | p1 | 12 | 25.08 | [24.95, 25.29] |

## self_rssanon_mib

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 1.08 | [1.045, 1.105] | 1 | n/a | baseline |
| p1 | 1 | 12 | 25.08 | [24.95, 25.3] | 23.22 | [22.7, 24.09] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 1.08 | [1.045, 1.105] |
| p1 | p1 | 12 | 25.08 | [24.95, 25.3] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs p0 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 1 | 12 | 27.55 | [27.52, 28.34] | 1 | n/a | baseline |
| p1 | 1 | 12 | 27.74 | [27.6, 29.1] | 1.007 | [0.9783, 1.056] | no A/A floor |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| p0 | p0 | 12 | 27.55 | [27.52, 28.34] |
| p1 | p1 | 12 | 27.74 | [27.6, 29.1] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 3.57 3.31 2.82 1/2092 256901 / 3.14 3.19 2.84 1/2083 275441
