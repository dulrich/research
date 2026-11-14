# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 65.31 | [65.31, 65.31] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 257.3 | [257.3, 257.3] | 3.94 | [3.94, 3.94] | higher (worse) |
| b64f256-copy | 1 | 30 | 65.31 | [65.31, 65.31] | 1 | [1, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 65.31 | [65.31, 65.31] |
| b256f256 | b256f256 | 30 | 257.3 | [257.3, 257.3] |
| b64f256-copy | b64f256-copy | 30 | 65.31 | [65.31, 65.31] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 65.32 | [65.31, 65.41] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 257.3 | [257.3, 257.4] | 3.939 | [3.934, 3.941] | higher (worse) |
| b64f256-copy | 1 | 30 | 65.41 | [65.31, 65.41] | 1.001 | [0.9985, 1.002] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 0.9986, 95% CI [0.9985, 1.002], half-width 0.00153 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 65.32 | [65.31, 65.41] |
| b256f256 | b256f256 | 30 | 257.3 | [257.3, 257.4] |
| b64f256-copy | b64f256-copy | 30 | 65.41 | [65.31, 65.41] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 256 | [256, 256] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 256 | [256, 256] | 1 | [1, 1] | no measurable difference |
| b64f256-copy | 1 | 30 | 256 | [256, 256] | 1 | [1, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 256 | [256, 256] |
| b256f256 | b256f256 | 30 | 256 | [256, 256] |
| b64f256-copy | b64f256-copy | 30 | 256 | [256, 256] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 331.1 | [330.9, 331.4] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 523.7 | [523.3, 526.1] | 1.582 | [1.58, 1.589] | higher (worse) |
| b64f256-copy | 1 | 30 | 331.3 | [331, 336.3] | 1.001 | [0.9992, 1.016] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 0.9993, 95% CI [0.9844, 1.001], half-width 0.008173 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 331.1 | [330.9, 331.4] |
| b256f256 | b256f256 | 30 | 523.7 | [523.3, 526.1] |
| b64f256-copy | b64f256-copy | 30 | 331.3 | [331, 336.3] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 65.11 | [65.11, 65.12] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 257.1 | [257.1, 257.1] | 3.949 | [3.948, 3.949] | higher (worse) |
| b64f256-copy | 1 | 30 | 65.11 | [65.11, 65.12] | 1 | [0.9998, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9998, 1], half-width 0.0001536 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 65.11 | [65.11, 65.12] |
| b256f256 | b256f256 | 30 | 257.1 | [257.1, 257.1] |
| b64f256-copy | b64f256-copy | 30 | 65.11 | [65.11, 65.12] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 331.1 | [330.9, 331.4] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 523.7 | [523.3, 526.1] | 1.582 | [1.58, 1.589] | higher (worse) |
| b64f256-copy | 1 | 30 | 331.3 | [331, 336.3] | 1.001 | [0.9993, 1.016] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 0.9993, 95% CI [0.9843, 1.001], half-width 0.00822 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 331.1 | [330.9, 331.4] |
| b256f256 | b256f256 | 30 | 523.7 | [523.3, 526.1] |
| b64f256-copy | b64f256-copy | 30 | 331.3 | [331, 336.3] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 66.68 | [66.67, 66.68] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 258.7 | [258.6, 258.7] | 3.879 | [3.878, 3.88] | higher (worse) |
| b64f256-copy | 1 | 30 | 66.67 | [66.6, 66.68] | 0.9999 | [0.999, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9999, 1.001], half-width 0.0006005 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 66.68 | [66.67, 66.68] |
| b256f256 | b256f256 | 30 | 258.7 | [258.6, 258.7] |
| b64f256-copy | b64f256-copy | 30 | 66.67 | [66.6, 66.68] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 30 | 66.67 | [66.67, 66.68] | 1 | n/a | baseline |
| b256f256 | 1 | 30 | 258.7 | [258.6, 258.7] | 3.88 | [3.879, 3.88] | higher (worse) |
| b64f256-copy | 1 | 30 | 66.67 | [66.6, 66.68] | 1 | [0.999, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9999, 1.001], half-width 0.0006005 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 30 | 66.67 | [66.67, 66.68] |
| b256f256 | b256f256 | 30 | 258.7 | [258.6, 258.7] |
| b64f256-copy | b64f256-copy | 30 | 66.67 | [66.6, 66.68] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 3.03 3.15 3.13 1/2073 3509473 / 5.48 4.13 3.49 2/2220 3674766
