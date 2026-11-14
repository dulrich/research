# Class S truth checks: settle-window bias

Source: `results/s/raw.jsonl`, warm-up excluded; `late10` n=30 (bad mode always present, late free at a delay uniform in [0, 10 s]), `nolate` n=30 (control). Truth per invocation: bad at window S iff the emitted `release_actual_s` > S (the program's monotonic clock; -1 means no release, always bad). Ambiguous: |release_actual_s - S| <= 0.25 s (boundary-detection lag 0.04-0.17 s plus one 0.1 s sampling interval). Rigor: standard for rates (M7), indicative for the timing margin.

Emitted delays (s, sorted): 0.03, 0.13, 0.26, 0.39, 0.89, 1.13, 1.55, 2.16, 2.40, 2.46, 2.85, 3.95, 4.12, 4.74, 4.88, 5.08, 5.26, 5.80, 6.54, 6.59, 6.94, 6.99, 7.05, 7.28, 7.42, 7.44, 7.73, 7.90, 9.02, 9.06

## late10 per window

| window | n | observed bad k/n | observed rate | truth share (delay > S) | ambiguous (n) | ambiguous observed bad | outside band n | outside band agree | outside band mismatches |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 s | 30 | 29/30 | 0.967 | 30/30 = 1.000 | 2 | 1 | 28 | 28/28 | 0 |
| 2 s | 30 | 23/30 | 0.767 | 23/30 = 0.767 | 1 | 1 | 29 | 29/29 | 0 |
| 4 s | 30 | 17/30 | 0.567 | 18/30 = 0.600 | 2 | 0 | 28 | 28/28 | 0 |
| 6 s | 30 | 12/30 | 0.400 | 12/30 = 0.400 | 1 | 0 | 29 | 29/29 | 0 |
| 8 s | 30 | 2/30 | 0.067 | 2/30 = 0.067 | 1 | 0 | 29 | 29/29 | 0 |
| 10 s | 30 | 0/30 | 0.000 | 0/30 = 0.000 | 0 | 0 | 30 | 30/30 | 0 |
| 12 s | 30 | 0/30 | 0.000 | 0/30 = 0.000 | 0 | 0 | 30 | 30/30 | 0 |

Mismatches outside the ambiguous band: none.
Largest |release_actual_s - release_delay_s| over late10: 0.003 s.

## nolate control per window (expected all bad)

| window | n | bad k/n | CP 95% |
| --- | --- | --- | --- |
| 0 s | 30 | 30/30 | [0.884, 1.000] |
| 2 s | 30 | 30/30 | [0.884, 1.000] |
| 4 s | 30 | 30/30 | [0.884, 1.000] |
| 6 s | 30 | 30/30 | [0.884, 1.000] |
| 8 s | 30 | 30/30 | [0.884, 1.000] |
| 10 s | 30 | 30/30 | [0.884, 1.000] |
| 12 s | 30 | 30/30 | [0.884, 1.000] |
