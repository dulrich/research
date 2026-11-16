# Sampled-list order and shrinking: order and content together, not order alone, closed the exactly-minimal gap

On the comparison's two URL mutants, neither sorting the sampled lists shortest first (order) nor adding the two entries the minimum needs, host `a` and query key `rEf` (content), made any run exactly minimal: 0/50 in every Hegel and proptest cell that changed only one factor, though sorting alone shortened the median counterexample from 29 to 21 characters (`url-tracking-case`, hand minimum 10) and from 24 to 16 (`url-drop-gclid`, hand minimum 12). With both factors, Hegel was exactly minimal in 50/50 (`url-tracking-case`) and 44/50 (`url-drop-gclid`) runs and proptest in 25/50 and 40/50. The real arXiv defect is rare under every variant (0-3 of 50 detections per cell, intervals overlap), so no order or content effect is claimed there. Measured on one target, with list contents chosen by us knowing the minima (see Validity threats).

## Question and design

The property-testing comparison (a sibling folder) found both libraries 0/50 exactly minimal on the two seeded URL mutants and called it a generator limit: the hand minimum needs a one-letter host the generators cannot produce. A spike showed that a second generator was not the lever, but it changed list order and list content together. This study separates them, in both libraries: Hegel's `sampled_from` and proptest's `sample::select`, over every sampled list in the URL generator (schemes, separators, userinfo, hosts, ports, segments, query keys, fragments, pad).

Four variants (the `SLOS_LISTS` environment variable, one diff per package in `diffs/`):

| variant | lists |
|---|---|
| `committed` | the comparison's lists unchanged |
| `ordered` | the same entries sorted shortest first (stable, by character count) |
| `committed+short` | committed, with host `a` and query key `rEf` appended at the end |
| `ordered+short` | `ordered`, with the same two entries sorted in at their shortest-first positions |

Order contrasts: `ordered` against `committed`, and `ordered+short` against `committed+short`. Content contrasts: `committed+short` against `committed`, and `ordered+short` against `ordered`. A two-factor cell (a comparison between `committed` and `ordered+short`) is never attributed to one factor. 3 defects x 2 libraries x 4 variants = 24 cells, seeds 0-49, 1,000 cases per run, the comparison's budget and debug build. Defects: `url-tracking-case` and `url-drop-gclid` (seeded mutants applied to the target clone) and `url-idempotent-arxiv` (a real defect, no mutant). The action defects are out of scope (their gaps are whitespace and integer sign, not list draws).

"Exactly minimal" is the comparison's measure: the counterexample's character count equals the catalogue minimum (10, 12, and for arXiv 25 as pre-registered, with the errata value 21 reported beside it); an escape counts as one character.

## Results (24 cells)

Rows: `results/runs.jsonl` (1,200 rows). Table: `results/summary.md`, produced by `run.mjs summary`. "Detected" has a Clopper-Pearson 95% interval; "exactly minimal" is among the detecting runs; "min size" is the smallest counterexample in the cell.

| defect | variant | library | detected | 95% CI | errors | exactly minimal | exactly minimal (errata) | median size | min size |
|---|---|---|---|---|---|---|---|---|---|
| url-idempotent-arxiv | committed | hegel | 3/50 | 0.013-0.165 | 0 | 0/3 | 0/3 | 23 | 23 |
| url-idempotent-arxiv | committed | proptest | 0/50 | 0.000-0.071 | 0 | 0/0 | 0/0 |  |  |
| url-idempotent-arxiv | ordered | hegel | 2/50 | 0.005-0.137 | 0 | 1/2 | 1/2 | 23 | 21 |
| url-idempotent-arxiv | ordered | proptest | 3/50 | 0.013-0.165 | 0 | 1/3 | 1/3 | 22 | 21 |
| url-idempotent-arxiv | committed+short | hegel | 2/50 | 0.005-0.137 | 0 | 0/2 | 0/2 | 23 | 23 |
| url-idempotent-arxiv | committed+short | proptest | 0/50 | 0.000-0.071 | 0 | 0/0 | 0/0 |  |  |
| url-idempotent-arxiv | ordered+short | hegel | 1/50 | 0.001-0.106 | 0 | 0/1 | 1/1 | 21 | 21 |
| url-idempotent-arxiv | ordered+short | proptest | 3/50 | 0.013-0.165 | 0 | 1/3 | 1/3 | 22 | 21 |
| url-tracking-case | committed | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 29 | 29 |
| url-tracking-case | committed | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 29 | 29 |
| url-tracking-case | ordered | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 21 | 21 |
| url-tracking-case | ordered | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 21 | 21 |
| url-tracking-case | committed+short | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 29 | 22 |
| url-tracking-case | committed+short | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 29 | 22 |
| url-tracking-case | ordered+short | hegel | 50/50 | 0.929-1.000 | 0 | 50/50 |  | 10 | 10 |
| url-tracking-case | ordered+short | proptest | 50/50 | 0.929-1.000 | 0 | 25/50 |  | 10.5 | 10 |
| url-drop-gclid | committed | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 24 | 24 |
| url-drop-gclid | committed | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 24 | 24 |
| url-drop-gclid | ordered | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 16 | 16 |
| url-drop-gclid | ordered | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 16 | 16 |
| url-drop-gclid | committed+short | hegel | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 24 | 24 |
| url-drop-gclid | committed+short | proptest | 50/50 | 0.929-1.000 | 0 | 0/50 |  | 24 | 24 |
| url-drop-gclid | ordered+short | hegel | 50/50 | 0.929-1.000 | 0 | 44/50 |  | 12 | 12 |
| url-drop-gclid | ordered+short | proptest | 50/50 | 0.929-1.000 | 0 | 40/50 |  | 12 | 12 |

### Contrasts

Exactly minimal / detecting runs, with median size, for the two seeded mutants (hand minima 10 and 12):

| defect | library | `committed` | `ordered` | `committed+short` | `ordered+short` |
|---|---|---|---|---|---|
| `url-tracking-case` | Hegel | 0/50, 29 | 0/50, 21 | 0/50, 29 | 50/50, 10 |
| `url-tracking-case` | proptest | 0/50, 29 | 0/50, 21 | 0/50, 29 | 25/50, 10.5 |
| `url-drop-gclid` | Hegel | 0/50, 24 | 0/50, 16 | 0/50, 24 | 44/50, 12 |
| `url-drop-gclid` | proptest | 0/50, 24 | 0/50, 16 | 0/50, 24 | 40/50, 12 |

- **Order only** (`ordered` against `committed`, same content): median size falls 29 to 21 and 24 to 16 in both libraries, exactly minimal stays 0/50. Sorting alone cannot reach the minimum because no one-letter host exists in the list; the shortest host is `[::1]` (5 characters, tied with `x.com`; the stable sort puts `[::1]` first).
- **Content only** (`committed+short` against `committed`, same order): `url-drop-gclid` is unchanged (24, 0/50; host `a` sits at the last index and shrinking, which moves toward index 0, never reaches it). `url-tracking-case`: the median stays 29, but 18 (Hegel) and 20 (proptest) of 50 runs end at `http://example.com?rEf` (22 characters, the minimum 10 is not reached). Appended entries are reachable by generation but not by shrinking.
- **Order inside the extended lists** (`ordered+short` against `committed+short`): the whole gap closes, 0/50 to 44/50 and 50/50 (Hegel), 40/50 and 25/50 (proptest).
- **Content inside sorted lists** (`ordered+short` against `ordered`): the same cells, 0/50 to the same counts. Each factor alone is insufficient in these cells; with both, the minimum is reached. That is an interaction between the two, not a share attributable to either.
- **Hegel against proptest** in `ordered+short`: Hegel 50/50 and 44/50, proptest 25/50 and 40/50. proptest's residual on `url-tracking-case` is 20 runs ending at `http:a?UTM_MEDIUM` (17 characters) and 5 with a leading `@`. Both `rEf` and `UTM_MEDIUM` fail the property, so the failing key set is not a prefix of the sorted list; proptest's `select` shrinker did not move from `UTM_MEDIUM` to `rEf` in those runs, Hegel's did in 50/50. The mechanism is not investigated here.
- **`url-idempotent-arxiv`** (real defect, minimum 25 pre-registered / 21 errata): detections are Hegel 3, 2, 2, 1 and proptest 0, 3, 0, 3 of 50 across `committed`, `ordered`, `committed+short`, `ordered+short`. The counts are too small and the intervals overlap, so no order or content effect on detection is claimed. Among the few detecting runs, ordered variants reached 21 characters (`http:arxiv.org/pdf/a/`) in Hegel (`ordered` 1 of 2, `ordered+short` 1 of 1) and proptest (1 of 3 in both ordered variants); `committed` Hegel's 3 detections are all `http://arxiv.org/pdf/0/` (23 characters).

## Per-defect reading

- **`url-tracking-case` (hand minimum `http:a?rEf`, 10).** Committed: `http://example.com?UTM_MEDIUM` (29), the first host and first separator survive shrinking. Ordered: `http:[::1]?UTM_MEDIUM` (21): the separator `:` and the shortest host are reached, but the only mixed-case key in the list is `UTM_MEDIUM`. Ordered plus `rEf`: `http:a?rEf`. The residual gap is both order (host and separator) and content (host `a`, key `rEf`).
- **`url-drop-gclid` (hand minimum `http:a?gclid`, 12).** Committed `http://example.com?gclid` (24); ordered `http:[::1]?gclid` (16); ordered plus `a`: `http:a?gclid`. The residual gap is order (separator) plus content (host `a`); the key `gclid` is in the list. In `ordered+short` the non-minimal runs (6 Hegel, 10 proptest) carry a leading `@` (`http:@a?gclid`); the `@` was not investigated.
- **`url-idempotent-arxiv`.** Too rare to read; see above.

## Baseline check

The `committed` rows, run under the comparison driver's build profile (debug, `cargo build --example run`), compared with the comparison's rows for the same cells on `defect, library, variant, seed, status, detected, cases_to_first_failure, counterexample` (never `total_ms`/`shrink_ms`, which are wall-clock):

| defect | library | committed rows | mismatching rows | seeds (fields) |
|---|---|---|---|---|
| url-idempotent-arxiv | hegel | 50 | 0 |  |
| url-idempotent-arxiv | proptest | 50 | 0 |  |
| url-tracking-case | hegel | 50 | 0 |  |
| url-tracking-case | proptest | 50 | 0 |  |
| url-drop-gclid | hegel | 50 | 0 |  |
| url-drop-gclid | proptest | 50 | 0 |  |

total: 0 of 300 committed rows differ on the projected fields

All 300 committed rows reproduce the comparison on every projected field. Getting there needed a care in the Hegel diff: `#[hegel::composite]` derives its label from the token text of the generator's body, so editing `structured_url`'s calls changed Hegel's draw stream even for identical lists (a first attempt gave `url-tracking-case` seed 1 first failure at case 23 against the comparison's 73). The final diff leaves the body text unchanged and puts the switch behind the `gs` path (see `notes.md`). A same-build replay (`run.mjs run --out FILE`, all 1,200 rows) matched `results/runs.jsonl` on the projected fields in 0 of 1,200 rows differing.

## Validity threats

- **One target.** Two URL mutants and one real defect in one canonicaliser, two libraries; nothing here says how other generators or defects behave.
- **List contents were chosen by us.** The two added entries (`a`, `rEf`) were picked knowing the hand minima; an unseen minimum would not come with its entry. The result is about the mechanism (index-0 shrinking plus order), not about finding minima unaided.
- **Order is by character count, ties stable.** Other orders (bytes, a deliberate "simplest first" ranking) were not tried; the tie between `[::1]` and `x.com` is broken by position.
- **Hegel variant transform is content-keyed.** The host and key lists are recognised by an entry (`example.com`, `UTM_MEDIUM`), a deliberate trade to keep the generator body text unchanged (above); the other string lists are sorted, and lists of other element types are not touched.
- **Hegel's draw stream depends on generator body text** (observed once by bisect, not a systematic study), so a baseline transfers across an edit only if the body text is unchanged.
- **Debug build, 1,000 cases, seeds 0-49.** The comparison's budget, not Hegel's or proptest's default budget. Small counts (arXiv) carry wide intervals. Timings are not reported.
- **Mutants are applied to a clone and always reverted; both clones were clean after the run** (`git status --porcelain` empty).

## Setup and dependencies

Run from the repository root: `bun sampled-list-order-shrinking/run.mjs setup` (clones the two targets at their pins from `--src DIR`, default the directory holding this repository, into the git-ignored `var/slos/`, copies the comparison's two harness packages there, applies the diffs), then `run`, `summary`, `baseline`. The first cargo build needs crates.io access. Nothing fetched is committed; this folder holds the diffs, driver, notes and results.

| component | version | where |
|---|---|---|
| rustc / cargo | 1.99.1 | both harness packages (edition 2024) |
| bun | 1.4.4 | `run.mjs`, `bun test` |
| `hegeltest` | =0.52.6 | the comparison's `rust/hegel` manifest and lockfile |
| `proptest` | =1.12.0 | the comparison's `rust/proptest` manifest and lockfile |
| `crucible-vault` | commit `49a46372` | target clone (`cv-text`) |
| `crucible-dev-env` | commit `d02df23` | target clone (`crucible-keys`, `crucible-layout`) |
| `git` | 2.47.3 | clones, mutant apply and revert |
| GNU `patch` | 2.8 | applies `diffs/*.diff` to the scratch harness copies |
| C toolchain | host's | Hegel builds a nested engine from source |

No container: two toolchains and no system libraries beyond the C toolchain, as in the comparison. `diffs/hegel.diff` and `diffs/proptest.diff` apply to the comparison's `src/lib.rs` of each package; the mutant diffs are the comparison's.

## Credits

- Hegel: https://hegel.dev and https://github.com/hegeldev/hegel (`hegeltest` 0.52.6).
- proptest: https://github.com/proptest-rs/proptest (1.12.0).
- The harness, catalogue, mutants and baseline rows are the [property-testing-library-comparison](../property-testing-library-comparison/) investigation's; this folder reuses them unchanged apart from the two diffs.
- Statistics (`clopperPearson`, `median`) come from this repository's `scripts/lib/measure-stats.mjs`.
