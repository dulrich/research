# Measurement report

Seed 1; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".

## process_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hegel/cp-bounds | 1 | 10 | 5258 | [5228, 5328] | n/a | n/a | no baseline |
| hegel/cp-symmetry | 1 | 10 | 12640 | [12530, 12720] | n/a | n/a | no baseline |
| hegel/cp-narrowing | 1 | 10 | 11130 | [11110, 11190] | n/a | n/a | no baseline |
| hegel/nd-props | 1 | 10 | 41.75 | [38.89, 42.12] | n/a | n/a | no baseline |
| hegel/pct-bounds | 1 | 10 | 48.2 | [46.1, 52.26] | n/a | n/a | no baseline |
| hegel/pct-monotone | 1 | 10 | 49.09 | [48.7, 49.45] | n/a | n/a | no baseline |
| hegel/pct-perm | 1 | 10 | 62.8 | [61.35, 64.73] | n/a | n/a | no baseline |
| fastcheck/cp-bounds | 1 | 10 | 7072 | [7028, 7154] | n/a | n/a | no baseline |
| fastcheck/cp-symmetry | 1 | 10 | 15710 | [15670, 15860] | n/a | n/a | no baseline |
| fastcheck/cp-narrowing | 1 | 10 | 14040 | [13960, 14260] | n/a | n/a | no baseline |
| fastcheck/nd-props | 1 | 10 | 21.8 | [20.54, 22.28] | n/a | n/a | no baseline |
| fastcheck/pct-bounds | 1 | 10 | 25.28 | [24.24, 27.72] | n/a | n/a | no baseline |
| fastcheck/pct-monotone | 1 | 10 | 27.64 | [24.89, 28.89] | n/a | n/a | no baseline |
| fastcheck/pct-perm | 1 | 10 | 30.29 | [27.64, 31.5] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| hegel/cp-bounds | hegel/cp-bounds | 10 | 5258 | [5230, 5328] |
| hegel/cp-symmetry | hegel/cp-symmetry | 10 | 12640 | [12530, 12720] |
| hegel/cp-narrowing | hegel/cp-narrowing | 10 | 11130 | [11110, 11180] |
| hegel/nd-props | hegel/nd-props | 10 | 41.75 | [38.89, 42.12] |
| hegel/pct-bounds | hegel/pct-bounds | 10 | 48.2 | [46.12, 52.26] |
| hegel/pct-monotone | hegel/pct-monotone | 10 | 49.09 | [48.7, 49.45] |
| hegel/pct-perm | hegel/pct-perm | 10 | 62.8 | [61.21, 64.73] |
| fastcheck/cp-bounds | fastcheck/cp-bounds | 10 | 7072 | [7028, 7154] |
| fastcheck/cp-symmetry | fastcheck/cp-symmetry | 10 | 15710 | [15670, 15870] |
| fastcheck/cp-narrowing | fastcheck/cp-narrowing | 10 | 14040 | [13960, 14260] |
| fastcheck/nd-props | fastcheck/nd-props | 10 | 21.8 | [20.54, 22.28] |
| fastcheck/pct-bounds | fastcheck/pct-bounds | 10 | 25.28 | [24.24, 27.72] |
| fastcheck/pct-monotone | fastcheck/pct-monotone | 10 | 27.64 | [24.89, 28.89] |
| fastcheck/pct-perm | fastcheck/pct-perm | 10 | 30.29 | [27.64, 31.5] |

## run_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hegel/cp-bounds | 1 | 10 | 5244 | [5213, 5314] | n/a | n/a | no baseline |
| hegel/cp-symmetry | 1 | 10 | 12630 | [12510, 12700] | n/a | n/a | no baseline |
| hegel/cp-narrowing | 1 | 10 | 11110 | [11100, 11160] | n/a | n/a | no baseline |
| hegel/nd-props | 1 | 10 | 26.92 | [23.86, 27.21] | n/a | n/a | no baseline |
| hegel/pct-bounds | 1 | 10 | 33.83 | [30.07, 36.85] | n/a | n/a | no baseline |
| hegel/pct-monotone | 1 | 10 | 33.83 | [33.47, 34.18] | n/a | n/a | no baseline |
| hegel/pct-perm | 1 | 10 | 47.94 | [46.28, 48.97] | n/a | n/a | no baseline |
| fastcheck/cp-bounds | 1 | 10 | 7058 | [7014, 7119] | n/a | n/a | no baseline |
| fastcheck/cp-symmetry | 1 | 10 | 15700 | [15650, 15850] | n/a | n/a | no baseline |
| fastcheck/cp-narrowing | 1 | 10 | 14020 | [13950, 14240] | n/a | n/a | no baseline |
| fastcheck/nd-props | 1 | 10 | 6.795 | [5.648, 7.68] | n/a | n/a | no baseline |
| fastcheck/pct-bounds | 1 | 10 | 10.8 | [9.389, 13.56] | n/a | n/a | no baseline |
| fastcheck/pct-monotone | 1 | 10 | 11.79 | [9.981, 14] | n/a | n/a | no baseline |
| fastcheck/pct-perm | 1 | 10 | 16.2 | [12.8, 16.88] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| hegel/cp-bounds | hegel/cp-bounds | 10 | 5244 | [5213, 5314] |
| hegel/cp-symmetry | hegel/cp-symmetry | 10 | 12630 | [12510, 12700] |
| hegel/cp-narrowing | hegel/cp-narrowing | 10 | 11110 | [11100, 11170] |
| hegel/nd-props | hegel/nd-props | 10 | 26.92 | [23.86, 27.21] |
| hegel/pct-bounds | hegel/pct-bounds | 10 | 33.83 | [30.07, 36.85] |
| hegel/pct-monotone | hegel/pct-monotone | 10 | 33.83 | [33.47, 34.18] |
| hegel/pct-perm | hegel/pct-perm | 10 | 47.94 | [46.28, 48.97] |
| fastcheck/cp-bounds | fastcheck/cp-bounds | 10 | 7058 | [7014, 7120] |
| fastcheck/cp-symmetry | fastcheck/cp-symmetry | 10 | 15700 | [15660, 15850] |
| fastcheck/cp-narrowing | fastcheck/cp-narrowing | 10 | 14020 | [13950, 14240] |
| fastcheck/nd-props | fastcheck/nd-props | 10 | 6.795 | [5.648, 7.684] |
| fastcheck/pct-bounds | fastcheck/pct-bounds | 10 | 10.8 | [9.389, 13.56] |
| fastcheck/pct-monotone | fastcheck/pct-monotone | 10 | 11.79 | [9.981, 14.1] |
| fastcheck/pct-perm | fastcheck/pct-perm | 10 | 16.2 | [12.8, 16.88] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.11 2.18 2.57 3/1790 1214213 / 3.83 3.71 3.64 4/1993 1294138
