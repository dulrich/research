# Class P truth checks: continuous spread

Source: `results/p/raw.jsonl`, warm-up excluded, n=40 (pool mode: 4 workers, 12 requests, trim). Metric: cgroup anon (MiB) at the settle window. Thresholds fixed before looking: 12 MiB (the pilot's bad-mode threshold), 30 and 60 MiB. Rigor: indicative (levels); the threshold rates are standard-format rates but have no known truth in pool mode (`bad_drawn` = -1).

## Settled distribution (MiB; quartiles by linear interpolation)

| window | n | min | Q1 | median | Q3 | max |
| --- | --- | --- | --- | --- | --- | --- |
| 0 s | 40 | 7.09 | 44.35 | 54.43 | 63.98 | 89.00 |
| 3 s | 40 | 7.09 | 44.38 | 54.43 | 64.00 | 89.00 |

Sorted values at 0 s (MiB): 7.1, 19.6, 23.6, 27.6, 28.0, 30.4, 36.0, 37.6, 39.6, 41.5, 45.3, 45.7, 48.3, 48.6, 49.5, 51.9, 52.6, 52.8, 53.1, 53.8, 55.1, 56.1, 58.0, 58.3, 60.0, 61.7, 61.8, 63.1, 63.5, 64.0, 64.0, 70.2, 70.8, 71.0, 76.6, 79.6, 82.6, 86.5, 88.5, 89.0

## Bad rate by threshold (window 0 s)

| threshold | k above | k/n | CP 95% |
| --- | --- | --- | --- |
| 12 MiB | 39 | 39/40 | [0.868, 0.999] |
| 30 MiB | 35 | 35/40 | [0.732, 0.958] |
| 60 MiB | 15 | 15/40 | [0.227, 0.542] |

Driver `bad_mode_0s` (12 MiB) matches the 12 MiB row above in 40/40 invocations.
