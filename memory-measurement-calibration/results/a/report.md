# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 5.91 | [5.91, 6.965] | 0.09191 | [0.09191, 0.1083] | lower (better) |
| a16 | 1 | 30 | 16.3 | [16.3, 16.3] | 0.2535 | [0.2535, 0.2535] | lower (better) |
| a64 | 1 | 30 | 64.3 | [64.3, 64.3] | 1 | n/a | baseline |
| a256 | 1 | 30 | 256.3 | [256.3, 256.3] | 3.986 | [3.986, 3.986] | higher (worse) |
| a64-copy | 1 | 30 | 64.3 | [64.3, 64.3] | 1 | [1, 1] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 5.91 | [5.91, 6.965] |
| a16 | a16 | 30 | 16.3 | [16.3, 16.3] |
| a64 | a64 | 30 | 64.3 | [64.3, 64.3] |
| a256 | a256 | 30 | 256.3 | [256.3, 256.3] |
| a64-copy | a64-copy | 30 | 64.3 | [64.3, 64.3] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 5.91 | [5.91, 6.965] | 0.0919 | [0.09182, 0.1083] | lower (better) |
| a16 | 1 | 30 | 16.31 | [16.3, 16.4] | 0.2536 | [0.2535, 0.2551] | lower (better) |
| a64 | 1 | 30 | 64.31 | [64.3, 64.35] | 1 | n/a | baseline |
| a256 | 1 | 30 | 256.3 | [256.3, 256.4] | 3.985 | [3.983, 3.987] | higher (worse) |
| a64-copy | 1 | 30 | 64.31 | [64.3, 64.4] | 1 | [0.9994, 1.002] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [0.9984, 1.001], half-width 0.001087 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 5.91 | [5.91, 6.965] |
| a16 | a16 | 30 | 16.31 | [16.3, 16.4] |
| a64 | a64 | 30 | 64.31 | [64.3, 64.35] |
| a256 | a256 | 30 | 256.3 | [256.3, 256.4] |
| a64-copy | a64-copy | 30 | 64.31 | [64.3, 64.4] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| a16 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| a64 | 1 | 30 | 0 | [0, 0] | 1 | n/a | baseline |
| a256 | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |
| a64-copy | 1 | 30 | 0 | [0, 0] | n/a | [n/a, n/a] | no measurable difference |

A/A (a64 / a64-copy): ratio n/a, 95% CI [n/a, n/a], half-width n/a (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 0 | [0, 0] |
| a16 | a16 | 30 | 0 | [0, 0] |
| a64 | a64 | 30 | 0 | [0, 0] |
| a256 | a256 | 30 | 0 | [0, 0] |
| a64-copy | a64-copy | 30 | 0 | [0, 0] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 9.49 | [9.36, 10.4] | 0.1293 | [0.1273, 0.1419] | lower (better) |
| a16 | 1 | 30 | 25.29 | [25.19, 25.55] | 0.3444 | [0.3423, 0.3486] | lower (better) |
| a64 | 1 | 30 | 73.42 | [73.12, 73.7] | 1 | n/a | baseline |
| a256 | 1 | 30 | 265.7 | [265.6, 265.9] | 3.62 | [3.605, 3.634] | higher (worse) |
| a64-copy | 1 | 30 | 73.22 | [72.98, 73.55] | 0.9973 | [0.9921, 1.003] | no measurable difference |

A/A (a64 / a64-copy): ratio 1.003, 95% CI [0.9967, 1.008], half-width 0.00564 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 9.49 | [9.36, 10.4] |
| a16 | a16 | 30 | 25.29 | [25.18, 25.55] |
| a64 | a64 | 30 | 73.42 | [73.12, 73.7] |
| a256 | a256 | 30 | 265.7 | [265.6, 265.9] |
| a64-copy | a64-copy | 30 | 73.22 | [72.98, 73.55] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 0.12 | [0.12, 0.12] | 0.001872 | [0.001872, 0.001872] | lower (better) |
| a16 | 1 | 30 | 16.11 | [16.11, 16.11] | 0.2513 | [0.2513, 0.2513] | lower (better) |
| a64 | 1 | 30 | 64.11 | [64.11, 64.11] | 1 | n/a | baseline |
| a256 | 1 | 30 | 256.1 | [256.1, 256.1] | 3.995 | [3.995, 3.995] | higher (worse) |
| a64-copy | 1 | 30 | 64.11 | [64.11, 64.11] | 1 | [1, 1] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 0.12 | [0.12, 0.12] |
| a16 | a16 | 30 | 16.11 | [16.11, 16.11] |
| a64 | a64 | 30 | 64.11 | [64.11, 64.11] |
| a256 | a256 | 30 | 256.1 | [256.1, 256.1] |
| a64-copy | a64-copy | 30 | 64.11 | [64.11, 64.11] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 9.49 | [9.36, 10.4] | 0.1293 | [0.1273, 0.1419] | lower (better) |
| a16 | 1 | 30 | 25.29 | [25.18, 25.54] | 0.3444 | [0.3423, 0.3486] | lower (better) |
| a64 | 1 | 30 | 73.42 | [73.12, 73.7] | 1 | n/a | baseline |
| a256 | 1 | 30 | 265.7 | [265.6, 265.9] | 3.62 | [3.605, 3.635] | higher (worse) |
| a64-copy | 1 | 30 | 73.22 | [72.98, 73.55] | 0.9973 | [0.9921, 1.003] | no measurable difference |

A/A (a64 / a64-copy): ratio 1.003, 95% CI [0.9967, 1.008], half-width 0.005605 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 9.49 | [9.36, 10.4] |
| a16 | a16 | 30 | 25.29 | [25.19, 25.55] |
| a64 | a64 | 30 | 73.42 | [73.12, 73.7] |
| a256 | a256 | 30 | 265.7 | [265.6, 265.9] |
| a64-copy | a64-copy | 30 | 73.22 | [72.98, 73.55] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 1.44 | [1.42, 1.46] | 0.022 | [0.0217, 0.02231] | lower (better) |
| a16 | 1 | 30 | 17.45 | [17.42, 17.48] | 0.2665 | [0.2661, 0.2671] | lower (better) |
| a64 | 1 | 30 | 65.45 | [65.43, 65.47] | 1 | n/a | baseline |
| a256 | 1 | 30 | 257.4 | [257.4, 257.5] | 3.933 | [3.932, 3.935] | higher (worse) |
| a64-copy | 1 | 30 | 65.45 | [65.43, 65.48] | 1 | [0.9994, 1.001] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [0.9992, 1.001], half-width 0.0006874 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 1.44 | [1.42, 1.46] |
| a16 | a16 | 30 | 17.45 | [17.42, 17.48] |
| a64 | a64 | 30 | 65.45 | [65.43, 65.47] |
| a256 | a256 | 30 | 257.4 | [257.4, 257.5] |
| a64-copy | a64-copy | 30 | 65.45 | [65.43, 65.48] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs a64 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| a0 | 1 | 30 | 1.42 | [1.415, 1.445] | 0.0217 | [0.02162, 0.02209] | lower (better) |
| a16 | 1 | 30 | 17.42 | [17.41, 17.44] | 0.2663 | [0.2661, 0.2666] | lower (better) |
| a64 | 1 | 30 | 65.43 | [65.42, 65.47] | 1 | n/a | baseline |
| a256 | 1 | 30 | 257.4 | [257.4, 257.4] | 3.934 | [3.932, 3.935] | higher (worse) |
| a64-copy | 1 | 30 | 65.42 | [65.4, 65.47] | 0.9999 | [0.9992, 1.001] | no measurable difference |

A/A (a64 / a64-copy): ratio 1, 95% CI [0.9994, 1.001], half-width 0.0006876 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| a0 | a0 | 30 | 1.42 | [1.415, 1.445] |
| a16 | a16 | 30 | 17.42 | [17.41, 17.44] |
| a64 | a64 | 30 | 65.43 | [65.42, 65.47] |
| a256 | a256 | 30 | 257.4 | [257.4, 257.4] |
| a64-copy | a64-copy | 30 | 65.42 | [65.4, 65.47] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 3.33 3.29 3.17 1/2027 3481108 / 3.03 3.15 3.13 2/2073 3509415
