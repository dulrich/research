---
created: 2026-11-16
---

# Sampled-list order and shrinking: working notes

A working log. Each step appends an entry: what was tried, what was learned.

## 2026-11-15 — Spike that motivated the study (indicative)

Before this study, a scratch spike measured whether a second, differently shaped Hegel generator was the lever for the two URL mutants the property-testing comparison found 0/50 exactly minimal. Hegel only, release build, seeds 0-49, 1,000 cases. The scratch copy is not kept; the table is the spike's recorded result and is indicative (single build profile, one measurement, not the comparison's debug build).

| Hegel generator | `url-idempotent-arxiv` | `url-drop-gclid` (min 12) | `url-tracking-case` (min 10) |
|---|---|---|---|
| committed structured generator | 2/50 | 50/50, all 24 chars | 50/50, all 29 chars |
| plus a token-sequence arm (one of four) | 1/50 | 49/50, all 24 chars | 50/50, all 29 chars |
| token-sequence generator alone | 0/50 | 0/50 | 0/50 |
| hosts, query keys and separators shortest first, plus host `a` (the other lists unchanged) | 1/50 | 50/50, 46 exactly minimal (4 at 13) | 50/50, 48 at 17 chars, 2 at 18 |

Reading: a second generator is not the lever. The last row changed list order and list content at once, so it does not separate the two; this study does (2 x 2 of order x content, both libraries).

## 2026-11-16 — Variant switch, and a finding that shaped the Hegel diff

Both packages get an environment variable `SLOS_LISTS` (`committed` | `ordered` | `committed+short` | `ordered+short`), read once. `ordered` sorts every sampled string list shortest first (stable, by character count); `+short` adds host `a` and query key `rEf`, appended (`committed+short`) or sorted in (`ordered+short`). An unknown value aborts the run.

First Hegel attempt: edit each `sampled_from(...)` call inside `structured_url` to go through a helper. The `committed` variant then drew a different stream from the committed harness (Hegel `url-tracking-case`, seed 1: first failure at case 23 against 73; seeds 2 and 5: 93 and 88 against 208 and 440), although the lists were identical. Bisecting on a scratch copy: wrapping one argument in an identity function was enough to change the stream; whitespace-only edits did not. The cause is in the library: `#[hegel::composite]` derives its label from the token text of the function body (`hegeltest-macros` 0.52.6, `composite.rs`: `f.block.to_token_stream().to_string()`), so any edit to the body changes the label and the stream even when every generated value is the same.

Fix: leave `structured_url`'s body textually unchanged and put the switch behind the `gs` path, a local module that re-exports `hegel::generators::*` and wraps `sampled_from` (lists of `&'static str` are transformed, other element types and the `committed` variant pass through; the host list is recognised by containing `example.com`, the key list by containing `UTM_MEDIUM`). After the fix the `committed` variant reproduces all 300 committed rows of the comparison on the projected fields (see the README baseline check). proptest's edit needed no such care: its `committed` rows were identical on the first attempt.

Consequence for the README: Hegel's draw stream is sensitive to edits to a composite generator's body; a Hegel baseline therefore only transfers across a generator edit if the body text is unchanged. This is an observation from one bisect, not a systematic study.

## 2026-11-16 — Runs

24 cells x 50 seeds, 1,000 cases, debug build, run in `results/runs.jsonl` (1,200 rows), summary in `results/summary.md`. Both clones clean after the run. Timings are not a claim and are not reported.
