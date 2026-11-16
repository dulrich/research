# Measurement report

Seed 1; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## run_ms (ms)

| group | builds | n | median | 95% CI | ratio | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| hegel-url_invariants | 1 | 15 | 27 | [26.8, 27.4] | n/a | n/a | no baseline |
| proptest-url_invariants | 1 | 15 | 97.3 | [97.2, 97.6] | n/a | n/a | no baseline |
| hegel-action_roundtrip | 1 | 15 | 8.6 | [8.5, 9] | n/a | n/a | no baseline |
| proptest-action_roundtrip | 1 | 15 | 110.3 | [109.5, 110.7] | n/a | n/a | no baseline |
| hegel-action_layout_name-fail | 1 | 15 | 10.7 | [10.6, 10.8] | n/a | n/a | no baseline |
| proptest-action_layout_name-fail | 1 | 15 | 3.7 | [3.7, 4] | n/a | n/a | no baseline |

A/A: not configured; no claims are made.

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| hegel-url_invariants | hegel-url_invariants | 15 | 27 | [27, 27.4] |
| proptest-url_invariants | proptest-url_invariants | 15 | 97.3 | [97.2, 97.6] |
| hegel-action_roundtrip | hegel-action_roundtrip | 15 | 8.6 | [8.5, 9] |
| proptest-action_roundtrip | proptest-action_roundtrip | 15 | 110.3 | [109.5, 110.6] |
| hegel-action_layout_name-fail | hegel-action_layout_name-fail | 15 | 10.7 | [10.6, 10.8] |
| proptest-action_layout_name-fail | proptest-action_layout_name-fail | 15 | 3.7 | [3.7, 4] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 10.03 4.81 3.44 2/1821 1246823 / 9.70 4.83 3.46 5/1822 1247153
