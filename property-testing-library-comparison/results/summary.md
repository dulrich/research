# Summary numbers

Median cases to first failure, Rust (detecting runs; test-function invocations counted by the harness). Source: `results/rust/runs.jsonl`.

| defect | library | detecting runs | median cases to first failure | max |
|---|---|---|---|---|
| url-idempotent-arxiv | hegel | 3 | 838 | 920 |
| url-idempotent-arxiv | proptest | 0 |  |  |
| action-layout-name | hegel | 50 | 1 | 1 |
| action-layout-name | proptest | 50 | 33 | 208 |
| url-tracking-case | hegel | 50 | 68.5 | 535 |
| url-tracking-case | proptest | 50 | 55.5 | 292 |
| url-drop-gclid | hegel | 50 | 76 | 342 |
| url-drop-gclid | proptest | 50 | 34 | 260 |
| action-delta-i32 | hegel | 50 | 17.5 | 91 |
| action-delta-i32 | proptest | 50 | 3.5 | 14 |
| action-kelvin-max-exclusive | hegel | 50 | 130.5 | 826 |
| action-kelvin-max-exclusive | proptest | 50 | 100 | 572 |
| action-slot-nine-rejected | hegel | 50 | 88 | 434 |
| action-slot-nine-rejected | proptest | 50 | 81.5 | 435 |

Generator lines (non-blank, non-comment). Sources: `rust/*/src/lib.rs`, `ts/*/props.mjs`.

| harness | lines per item | total |
|---|---|---|
| rust hegel | structured_url 46, any_input 8, direction 3, word 5, trimmed_command 5, action 36 | 103 |
| rust proptest | text 3, structured_url 49, any_input 3, direction 3, word 6, trimmed_command 6, action 36 | 106 |
| ts hegel | shared definitions 10; cp-bounds 1, cp-symmetry 1, cp-narrowing 1, nd-props 5, pct-bounds 1, pct-monotone 1, pct-perm 4 | 24 |
| ts fastcheck | shared definitions 6; cp-bounds 1, cp-symmetry 1, cp-narrowing 1, nd-props 1, pct-bounds 1, pct-monotone 1, pct-perm 3 | 15 |
