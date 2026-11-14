# Measurement report

Seed 20261114; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.3 | [25.18, 25.41] | 0.9937 | [0.9834, 1.011] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.66] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.3 | [25.18, 25.41] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.66] |

## anon_settled_10s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 1.15 | [1.115, 1.205] | 0.04517 | [0.04365, 0.04757] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.66] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 1.15 | [1.115, 1.205] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.66] |

## anon_settled_12s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 1.17 | [1.115, 1.22] | 0.04595 | [0.04365, 0.04815] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.66] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 1.17 | [1.115, 1.22] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.66] |

## anon_settled_2s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.3 | [13.13, 25.51] | 0.9939 | [0.5147, 1.013] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.67] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.3 | [13.13, 25.51] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.67] |

## anon_settled_4s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.18 | [1.12, 25.51] | 0.989 | [0.04382, 1.01] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.67] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.18 | [1.12, 25.51] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.67] |

## anon_settled_6s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 1.16 | [1.11, 25.27] | 0.04556 | [0.04343, 0.9961] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.67] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 1.16 | [1.11, 25.27] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.67] |

## anon_settled_8s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 1.155 | [1.115, 1.235] | 0.04537 | [0.04365, 0.0488] | no A/A floor |
| nolate | 1 | 12 | 25.46 | [25.02, 25.66] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 1.155 | [1.115, 1.235] |
| nolate | nolate | 12 | 25.46 | [25.02, 25.66] |

## bad_drawn

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 1 | [1, 1] | 1 | [1, 1] | no A/A floor |
| nolate | 1 | 12 | 1 | [1, 1] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 1 | [1, 1] |
| nolate | nolate | 12 | 1 | [1, 1] |

## bad_mode_0s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12/12 (1) | [0.7354, 1] | 0 | [-0.2425, 0.2425] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 12/12 (1) | [0.7354, 1] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_10s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 0/12 (0) | [0, 0.2646] | -1 | [-1, -0.6571] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 0/12 (0) | [0, 0.2646] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_12s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 0/12 (0) | [0, 0.2646] | -1 | [-1, -0.6571] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 0/12 (0) | [0, 0.2646] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_2s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 9/12 (0.75) | [0.4281, 0.9451] | -0.25 | [-0.5323, 0.04111] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 9/12 (0.75) | [0.4281, 0.9451] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_4s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 7/12 (0.5833) | [0.2767, 0.8483] | -0.4167 | [-0.6805, -0.08695] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 7/12 (0.5833) | [0.2767, 0.8483] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_6s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 4/12 (0.3333) | [0.09925, 0.6511] | -0.6667 | [-0.8619, -0.2992] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 4/12 (0.3333) | [0.09925, 0.6511] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## bad_mode_8s — rate

| group | builds | k/n | 95% CI (Clopper-Pearson) | difference vs nolate | difference 95% CI (Newcombe) | verdict |
| --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 2/12 (0.1667) | [0.02086, 0.4841] | -0.8333 | [-0.953, -0.4619] | no A/A floor |
| nolate | 1 | 12/12 (1) | [0.7354, 1] | 0 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics:

| group | build | k/n | 95% CI (Clopper-Pearson) |
| --- | --- | --- | --- |
| late10 | late10 | 2/12 (0.1667) | [0.02086, 0.4841] |
| nolate | nolate | 12/12 (1) | [0.7354, 1] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.4 | [25.28, 25.52] | 0.9937 | [0.9845, 1.011] | no A/A floor |
| nolate | 1 | 12 | 25.56 | [25.13, 25.75] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.4 | [25.28, 25.52] |
| nolate | nolate | 12 | 25.56 | [25.13, 25.75] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0 | [0, 0] | n/a | [n/a, n/a] | no A/A floor |
| nolate | 1 | 12 | 0 | [0, 0] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0 | [0, 0] |
| nolate | nolate | 12 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 35.9 | [35.61, 37.77] | 0.979 | [0.9657, 1.044] | no A/A floor |
| nolate | 1 | 12 | 36.66 | [35.63, 37.14] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 35.9 | [35.61, 37.77] |
| nolate | nolate | 12 | 36.66 | [35.63, 37.14] |

## release_actual_s

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 5.611 | [1.913, 7.35] | -5.611 | [-7.35, -1.913] | no A/A floor |
| nolate | 1 | 12 | -1 | [-1, -1] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 5.611 | [1.913, 7.35] |
| nolate | nolate | 12 | -1 | [-1, -1] |

## release_delay_s

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 5.608 | [1.91, 7.348] | -5.608 | [-7.348, -1.91] | no A/A floor |
| nolate | 1 | 12 | -1 | [-1, -1] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 5.608 | [1.91, 7.348] |
| nolate | nolate | 12 | -1 | [-1, -1] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.11 | [24.98, 25.21] | 0.9939 | [0.9843, 1.011] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.11 | [24.98, 25.21] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_10s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0.915 | [0.905, 0.935] | 0.03622 | [0.03574, 0.03733] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0.915 | [0.905, 0.935] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_12s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0.915 | [0.905, 0.935] | 0.03622 | [0.03574, 0.03733] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0.915 | [0.905, 0.935] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_2s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.06 | [12.94, 25.21] | 0.9923 | [0.5121, 1.011] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.06 | [12.94, 25.21] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_4s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 24.98 | [0.925, 25.21] | 0.9891 | [0.03653, 1.007] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 24.98 | [0.925, 25.21] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_6s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0.93 | [0.905, 25.02] | 0.03682 | [0.03583, 0.9944] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0.93 | [0.905, 25.02] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## rssanon_settled_8s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0.915 | [0.905, 0.945] | 0.03622 | [0.03574, 0.03764] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0.915 | [0.905, 0.945] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## self_rssanon_boundary_mib

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 25.1 | [24.98, 25.2] | 0.9937 | [0.9843, 1.011] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.83, 25.44] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 25.1 | [24.98, 25.2] |
| nolate | nolate | 12 | 25.26 | [24.83, 25.44] |

## self_rssanon_mib

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 0.915 | [0.905, 0.935] | 0.03622 | [0.03574, 0.0373] | no A/A floor |
| nolate | 1 | 12 | 25.26 | [24.84, 25.45] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 0.915 | [0.905, 0.935] |
| nolate | nolate | 12 | 25.26 | [24.84, 25.45] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs nolate | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| late10 | 1 | 12 | 27.71 | [27.55, 28.39] | 0.9757 | [0.9475, 1.016] | no A/A floor |
| nolate | 1 | 12 | 28.41 | [27.69, 29.19] | 1 | n/a | baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| late10 | late10 | 12 | 27.71 | [27.55, 28.39] |
| nolate | nolate | 12 | 28.41 | [27.69, 29.19] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 6.42 4.34 3.31 4/2116 436016 / 4.12 4.61 3.83 2/2123 967824
