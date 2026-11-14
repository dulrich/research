# Class R truth checks: rate recovery

Source: `results/r/raw.jsonl`, warm-up excluded. Rate `bad_mode_<S>s` = anon above the pilot-fixed 12 MiB threshold at window S after the boundary; truth is the program's `bad_drawn`. Rigor: standard (rate claims, M7); CP = Clopper-Pearson 95%.

## Per variant

| variant | configured p | n | window | k bad | k/n | CP 95% | contains p |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 0 | 60 | 0 s | 0 | 0.000 | [0.000, 0.060] | yes |
| p0 | 0 | 60 | 2 s | 0 | 0.000 | [0.000, 0.060] | yes |
| p25 | 0.25 | 60 | 0 s | 19 | 0.317 | [0.203, 0.450] | yes |
| p25 | 0.25 | 60 | 2 s | 19 | 0.317 | [0.203, 0.450] | yes |
| p25b | 0.25 | 60 | 0 s | 14 | 0.233 | [0.134, 0.360] | yes |
| p25b | 0.25 | 60 | 2 s | 14 | 0.233 | [0.134, 0.360] | yes |
| p50 | 0.5 | 60 | 0 s | 32 | 0.533 | [0.400, 0.663] | yes |
| p50 | 0.5 | 60 | 2 s | 32 | 0.533 | [0.400, 0.663] | yes |

## Draw check (ground truth `bad_drawn` against p) and probe agreement

| variant | configured p | n | k drawn bad | share | CP 95% | contains p | `bad_mode_0s` equals `bad_drawn` |
| --- | --- | --- | --- | --- | --- | --- | --- |
| p0 | 0 | 60 | 0 | 0.000 | [0.000, 0.060] | yes | 60/60 |
| p25 | 0.25 | 60 | 19 | 0.317 | [0.203, 0.450] | yes | 60/60 |
| p25b | 0.25 | 60 | 14 | 0.233 | [0.134, 0.360] | yes | 60/60 |
| p50 | 0.5 | 60 | 32 | 0.533 | [0.400, 0.663] | yes | 60/60 |

## Differences in the bad rate (window 0 s, Newcombe hybrid score 95%; difference = first minus second)

| comparison | subset | n each | k1/n1 | k2/n2 | difference [95%] | excludes 0 |
| --- | --- | --- | --- | --- | --- | --- |
| p25 vs p50 | first 20 | 20 | 8/20 | 10/20 | -0.100 [-0.370, 0.193] | no |
| p25 vs p50 | all | 60 | 19/60 | 32/60 | -0.217 [-0.375, -0.040] | yes |
| p25 vs p25b (A/A floor) | first 20 | 20 | 8/20 | 3/20 | 0.250 [-0.028, 0.485] | no |
| p25 vs p25b (A/A floor) | all | 60 | 19/60 | 14/60 | 0.083 [-0.076, 0.237] | no |
