# Summary

100 runs. Rates are descriptive per arm; no arm-versus-arm rate claim is made. Times are indicative.

## Violations per arm and property

| arm | property | runs with a violation | 95% Clopper-Pearson | median first violation (s) |
|---|---|---|---|---|
| less | exitSuccess | 20/20 | 83%-100% | 0.0 |
| less | noReplacementChars | 0/20 | 0%-17% | n/a |
| vi | exitSuccess | 2/20 | 1%-32% | 10.3 |
| vi | noReplacementChars | 0/20 | 0%-17% | n/a |
| jsonedit | exitSuccess | 1/20 | 0%-25% | 10.2 |
| jsonedit | noReplacementChars | 0/20 | 0%-17% | n/a |
| less-R | exitSuccess | 0/20 | 0%-17% | n/a |
| less-R | noReplacementChars | 0/20 | 0%-17% | n/a |
| mdview | exitSuccess | 0/20 | 0%-17% | n/a |
| mdview | noReplacementChars | 0/20 | 0%-17% | n/a |

## Exit reasons and throughput

| arm | runs | exit reasons | median duration (s) | median states | median states/s |
|---|---|---|---|---|---|
| less | 20 | program-exit 20 | 0.0 | 2 | 2.0 |
| vi | 20 | time-limit 18, program-exit 2 | 59.0 | 9068 | 151.0 |
| jsonedit | 20 | time-limit 19, program-exit 1 | 59.0 | 9062 | 150.9 |
| less-R | 20 | time-limit 9, program-exit 11 | 7.5 | 1137 | 131.8 |
| mdview | 20 | time-limit 11, program-exit 9 | 59.0 | 8914 | 148.4 |

## Program exit codes at early exits

- less exit 1: 20
- less-R exit 0: 11
- vi exit 1: 2
- mdview exit 0: 9
- jsonedit exit 1: 1
