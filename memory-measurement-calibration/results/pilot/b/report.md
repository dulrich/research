# Measurement report

Seed 20261113; 10000 hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. Metrics without a `metrics` entry are treated as lower-is-better times: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width. Level metrics with an entry use the same rule worded "lower"/"higher" (better/worse per the entry). Rate metrics (0/1 per invocation) report k/n with a Clopper-Pearson 95% interval, pooled over layout builds; versus baseline the difference in proportions with a Newcombe hybrid score 95% interval; "higher"/"lower" only when that interval excludes 0 and |difference| exceeds the A/A difference-interval half-width. Otherwise "no measurable difference".

## anon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 65.31 | [65.31, 65.31] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 257.3 | [257.3, 257.3] | 3.94 | [3.94, 3.94] | higher (worse) |
| b64f256-copy | 1 | 6 | 65.31 | [65.31, 65.36] | 1 | [1, 1.001] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9992, 1], half-width 0.0004207 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 65.31 | [65.31, 65.31] |
| b256f256 | b256f256 | 6 | 257.3 | [257.3, 257.3] |
| b64f256-copy | b64f256-copy | 6 | 65.31 | [65.31, 65.36] |

## cgroup_anon_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 65.36 | [65.31, 65.41] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 257.4 | [257.4, 257.4] | 3.938 | [3.935, 3.941] | higher (worse) |
| b64f256-copy | 1 | 6 | 65.36 | [65.31, 65.41] | 1 | [0.9985, 1.002] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9985, 1.002], half-width 0.00153 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 65.36 | [65.31, 65.41] |
| b256f256 | b256f256 | 6 | 257.4 | [257.4, 257.4] |
| b64f256-copy | b64f256-copy | 6 | 65.36 | [65.31, 65.41] |

## cgroup_file_hwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 256 | [256, 256] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 256 | [256, 256] | 1 | [1, 1] | no measurable difference |
| b64f256-copy | 1 | 6 | 256 | [256, 256] | 1 | [1, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [1, 1], half-width 0 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 256 | [256, 256] |
| b256f256 | b256f256 | 6 | 256 | [256, 256] |
| b64f256-copy | b64f256-copy | 6 | 256 | [256, 256] |

## cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 331.3 | [330.7, 335.5] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 523.5 | [522.9, 526.4] | 1.58 | [1.56, 1.589] | higher (worse) |
| b64f256-copy | 1 | 6 | 334.1 | [331.4, 337] | 1.009 | [0.989, 1.018] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 0.9914, 95% CI [0.9823, 1.011], half-width 0.01443 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 331.3 | [330.7, 335.5] |
| b256f256 | b256f256 | 6 | 523.5 | [522.9, 526.4] |
| b64f256-copy | b64f256-copy | 6 | 334.1 | [331.4, 337] |

## rssanon_settled_0s_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 65.11 | [65.11, 65.12] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 257.1 | [257.1, 257.1] | 3.949 | [3.948, 3.949] | higher (worse) |
| b64f256-copy | 1 | 6 | 65.11 | [65.11, 65.12] | 1 | [0.9998, 1] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.9999, 1], half-width 0.0001152 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 65.11 | [65.11, 65.12] |
| b256f256 | b256f256 | 6 | 257.1 | [257.1, 257.1] |
| b64f256-copy | b64f256-copy | 6 | 65.11 | [65.11, 65.12] |

## self_cgroup_peak_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 331.3 | [330.7, 335.5] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 523.5 | [522.9, 526.4] | 1.58 | [1.56, 1.589] | higher (worse) |
| b64f256-copy | 1 | 6 | 334.1 | [331.4, 337] | 1.009 | [0.9886, 1.018] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 0.9914, 95% CI [0.9823, 1.012], half-width 0.01465 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 331.3 | [330.7, 335.5] |
| b256f256 | b256f256 | 6 | 523.5 | [522.9, 526.4] |
| b64f256-copy | b64f256-copy | 6 | 334.1 | [331.4, 337] |

## self_vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 66.63 | [66.58, 66.69] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 258.7 | [258.6, 258.7] | 3.882 | [3.879, 3.885] | higher (worse) |
| b64f256-copy | 1 | 6 | 66.59 | [66.57, 66.68] | 0.9995 | [0.9987, 1.001] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.999, 1.001], half-width 0.001201 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 66.63 | [66.58, 66.69] |
| b256f256 | b256f256 | 6 | 258.7 | [258.6, 258.7] |
| b64f256-copy | b64f256-copy | 6 | 66.59 | [66.57, 66.68] |

## vmhwm_mib (MiB)

| group | builds | n | median | 95% CI | ratio vs b64f256 | ratio 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| b64f256 | 1 | 6 | 66.62 | [66.57, 66.69] | 1 | n/a | baseline |
| b256f256 | 1 | 6 | 258.7 | [258.6, 258.7] | 3.883 | [3.879, 3.885] | higher (worse) |
| b64f256-copy | 1 | 6 | 66.59 | [66.57, 66.67] | 0.9995 | [0.9986, 1.001] | no measurable difference |

A/A (b64f256 / b64f256-copy): ratio 1, 95% CI [0.999, 1.001], half-width 0.001238 (noise floor).

Per-build diagnostics (plain bootstrap over each build's own invocations):

| group | build | n | median | 95% CI |
| --- | --- | --- | --- | --- |
| b64f256 | b64f256 | 6 | 66.62 | [66.57, 66.69] |
| b256f256 | b256f256 | 6 | 258.7 | [258.6, 258.7] |
| b64f256-copy | b64f256-copy | 6 | 66.59 | [66.57, 66.67] |

## Environment

- CPU: AMD Ryzen 9 7900X 12-Core Processor
- governor / driver: powersave / amd-pstate-epp
- boost: 1 (intel no_turbo: unavailable)
- SMT: control on, active 1
- loadavg before / after: 2.92 2.83 3.02 1/2020 3379668 / 2.58 2.76 2.99 1/2038 3383005
