# Hegel against proptest and fast-check: shrinking separated them, detection did not

We ran Hegel (`hegeltest` 0.52.6 for Rust, `@hegeldev/hegel` 0.5.7 for TypeScript) against proptest 1.12.0 and fast-check 4.10.2 on one target per language: two real Rust defects plus five seeded mutants in two pinned crates, and six seeded mutants of a small statistics module in TypeScript. Every (library, defect) cell was run 50 times (seeds 0-49) at an equal 1,000-case budget. At that budget detection did not separate the libraries: both found six of seven Rust defects in 50/50 runs, the seventh (a rare real URL defect) was found by Hegel 3/50 and proptest 0/50 with overlapping intervals, and every TypeScript cell was 50/50 except Hegel on one mutant at 49/50. Shrinking is what separated them: Hegel's final counterexample was exactly the hand-derived minimum in 50/50 runs where proptest managed 27/50 and 22/50 on two Rust defects, and fast-check's float shrinking leaves denormals (0/50 exactly minimal on two TypeScript mutants, 37/50 on a third) where Hegel was exactly minimal in all but one detecting run. Ergonomics and cost are mixed and all timings are indicative: Hegel's first Rust build took about 2.8x as long as proptest's (10.1 s against 3.6 s), and the generators are not like-for-like, so generator parity is the main validity threat.

This tests the main recommendation of the related investigation [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/), which recommended Hegel for both stacks but never ran the alternatives. It answers two of that guide's open follow-ups: run proptest and fast-check on one target each, and measure Hegel's first-build and run cost against proptest.

## What was compared

- **Rust:** `canonicalize_url` from `crucible-vault` at `49a46372` and `Action` (display and parse) from `crucible-dev-env` at `d02df23`, used as path dependencies and never edited. Seven defects: two real (`url-idempotent-arxiv`, `action-layout-name`) and five one-line mutants. The defect catalogue with each hand-derived minimum was written before any run: `catalogue/rust.md`.
- **TypeScript:** `scripts/lib/measure-stats.mjs` of this repository (`clopperPearson`, `newcombeDiff`, `percentile`) at commit `0384852`. It has no known real defect, so six one-line mutants (M1-M6): `catalogue/ts.md`.
- **Protocol:** each property is written once per library with that library's idiomatic generators (not a port of one library's generators). Per (library, defect) there are 50 independent runs, seeds 0-49, 1,000 test cases each; every run starts a fresh process (Rust) or a fresh seed in one process (TypeScript, 50 seeds per process; a fresh-process run of seed 37 reproduced its row). Hegel's example database and proptest's failure persistence are off, so runs do not replay each other. Each library's own default budget (Hegel 100, proptest 256, fast-check 100) is recorded in the catalogues and not compared.
- **Detection** is k/50 with a Clopper-Pearson 95% interval. **Shrinking** compares the final counterexample with the catalogue minimum: "exactly minimal" means the counterexample's key fields equal a listed minimal input (or, for the integer defects, the value itself), and the size measure is stated per defect in the catalogue. Both are counts, not timings.

## Detection

Source for the Rust table: `results/rust/detection-table.md` (from `bun property-testing-library-comparison/rust/drive.mjs summary`). Source for the TypeScript table: `results/ts/tally.md` (from `bun property-testing-library-comparison/ts/driver.mjs tally`). No run errored in either language.

### Rust (1,000 cases per run, 50 seeds)

| defect | Hegel | 95% CI | proptest | 95% CI |
|---|---|---|---|---|
| `url-idempotent-arxiv` (real) | 3/50 | 0.013-0.165 | 0/50 | 0.000-0.071 |
| `action-layout-name` (real) | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| `url-tracking-case` | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| `url-drop-gclid` | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| `action-delta-i32` | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| `action-kelvin-max-exclusive` | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| `action-slot-nine-rejected` | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |

Six cells are at the ceiling on both sides, so they show that this budget does not separate the libraries; they are not wins for either. On `url-idempotent-arxiv` the two intervals overlap (0.013-0.165 and 0.000-0.071), so there is no claim about which library finds it more often. The defect needs a conjunction of three structured features (an arXiv host, a `/pdf/` or `/abs/` path, and a trailing slash).

### TypeScript (1,000 cases per run, 50 seeds)

| defect | Hegel | 95% CI | fast-check | 95% CI |
|---|---|---|---|---|
| M1-pct-len | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| M2-pct-mutates | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| M3-cp-k0lo | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| M4-nd-swap | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |
| M5-pct-overshoot | 49/50 | 0.894-0.999 | 50/50 | 0.929-1.000 |
| M6-cp-lo-alpha | 50/50 | 0.929-1.000 | 50/50 | 0.929-1.000 |

The TypeScript result is saturated. M5 was designed as the hard defect (the result exceeds the maximum only for `q` within about 0.01 of 1), but neither library found it hard: both bias float draws toward the interval boundary, which is a generator difference showing through, not a property of the defect. The 1,000-case budget did not separate the libraries on detection, and per the pre-registered rule the budget was not re-tuned after seeing the data. The one miss (Hegel M5, 49/50) lies inside the other interval, so it is not a separation either.

## Shrinking

### Rust

Source: `results/rust/detection-table.md`. Size measures are in the catalogue (characters for URLs, absolute step for `action-delta-i32`).

| defect | hand minimum | Hegel exactly minimal | proptest exactly minimal | median final size (Hegel / proptest) |
|---|---|---|---|---|
| `url-idempotent-arxiv` | 25 (pre-registered), 21 (corrected, see below) | 0/3 | 0/0 (no detection) | 23 / none |
| `action-layout-name` | 0 (`SetLayout("")`) | 50/50 | 27/50 (the rest `SetLayout("\t")`, size 1) | 0 / 0 |
| `url-tracking-case` | 10 | 0/50 | 0/50 | 29 / 29 |
| `url-drop-gclid` | 12 | 0/50 | 0/50 | 24 / 24 |
| `action-delta-i32` | 2147483648 | 50/50 | 22/50 (the rest negative, `-2147483649`) | 2147483648 / 2147483649 |
| `action-kelvin-max-exclusive` | 6500 | 50/50 | 50/50 | 6500 / 6500 |
| `action-slot-nine-rejected` | 9 | 50/50 | 50/50 | 9 / 9 |

- Hegel was exactly minimal on `action-layout-name` and `action-delta-i32` (50/50 each) where proptest was 27/50 and 22/50. Both libraries are 50/50 on kelvin and slot, where the failing value is unique.
- On both URL mutants both libraries are 0/50, and this is a generator limit, not a shrinker result: the hand minimum (`http:a?rEf`, `http:a?gclid`) needs a one-letter host that neither package's URL generator can produce (hosts come from a fixed list, or from the `https://` plus free-text branch whose shrink did not cross over). Both libraries shrink to the same list-host form (medians 29 and 24 characters).
- **Catalogue errata.** The pre-registered minimum for `url-idempotent-arxiv` (25 characters, `http:arxiv.org/abs/a.pdf/`) was wrong: the `.pdf` suffix is not needed. The true minimum is 21 characters, `http:arxiv.org/pdf/a/`, checked directly against the unmutated target. The catalogue is kept as written with an errata section, and Hegel's 3 detections (all `http://arxiv.org/pdf/0/`, 23 characters) are exactly minimal against neither value.

### TypeScript

Source: `results/ts/tally.md`. "Exactly minimal" means the key fields equal one of the catalogue's minimal inputs; "size-minimal" means the counterexample's size (`arrSize` and friends, defined in `catalogue/ts.md`) equals the minimum size. In every row of the tally the two columns coincide, so no run was size-minimal without being exactly minimal.

| defect | Hegel exactly minimal | fast-check exactly minimal | median final size (Hegel / fast-check) |
|---|---|---|---|
| M1-pct-len | 50/50 | 50/50 | 1 / 1 |
| M2-pct-mutates | 50/50 | 0/50 | 3 / 4 |
| M3-cp-k0lo | 50/50 | 37/50 | 1 / 1 |
| M4-nd-swap | 50/50 | 50/50 | 2 / 2 |
| M5-pct-overshoot | 48/49 | 0/50 | 3 / 4 |
| M6-cp-lo-alpha | 50/50 | 50/50 | 1 / 1 |

Hegel is exactly minimal in all but one detecting run. fast-check's `double` shrinking leaves denormals (for example `xs = [0, -5e-324]` in `results/ts/fastcheck__M2-pct-mutates.jsonl`), which count as a non-zero, non-integer element and push the size from 3 to 4: M2 and M5 are 0/50 exactly minimal and M3 is 37/50. M3 shows the same effect on a smaller scale; its median size is 1 on both sides, so the exactly-minimal column separates what the median hides.

## Cases to first failure

Neither library exposes this directly, so both harnesses count it themselves: in Rust, the number of test-function invocations up to and including the first failing one; in TypeScript, Hegel's body calls up to the first throwing call, and fast-check's `numRuns` (which includes the failing run). Hegel tries a minimal-choices case first, so it often fails at invocation 1 (every `action-layout-name` run in Rust; the median for M1, M3, M4 and M6 in TypeScript). That is generation order, not search power, and the medians below should be read with that in mind.

Rust (detecting runs; source `results/summary.md`, from `analysis/summarize.mjs` over `results/rust/runs.jsonl`):

| defect | Hegel median (max) | proptest median (max) |
|---|---|---|
| `url-idempotent-arxiv` | 838 (920), 3 runs | none |
| `action-layout-name` | 1 (1) | 33 (208) |
| `url-tracking-case` | 68.5 (535) | 55.5 (292) |
| `url-drop-gclid` | 76 (342) | 34 (260) |
| `action-delta-i32` | 17.5 (91) | 3.5 (14) |
| `action-kelvin-max-exclusive` | 130.5 (826) | 100 (572) |
| `action-slot-nine-rejected` | 88 (434) | 81.5 (435) |

TypeScript (medians, source `results/ts/tally.md`), Hegel / fast-check: M1 1 / 1, M2 2 / 1, M3 1 / 5, M4 1 / 1, M5 95 / 7, M6 1 / 1.

No claim is made from these: the numbers mix generation order, case distributions and the harness's counting, and the libraries' generators are not the same. They are reported so a reader can see that neither library is uniformly earlier.

## Ergonomics

**Generator lines per property.** Counted by `analysis/summarize.mjs` (output in `results/summary.md`) as the non-blank, non-comment lines of the generator definitions. For Rust, the items from the first generator function up to the property enum in `rust/hegel/src/lib.rs` and `rust/proptest/src/lib.rs`, per function (the shared constant tables are excluded; the URL properties share `any_input` and the action properties share `action`). For TypeScript, the definitions between the file header and `DEFAULT_CASES` in `ts/hegel/props.mjs` and `ts/fastcheck/props.mjs`, split into shared definitions and one entry per property.

| harness | generator lines |
|---|---|
| Rust Hegel | 103 total: `structured_url` 46, `any_input` 8, `direction` 3, `word` 5, `trimmed_command` 5, `action` 36 |
| Rust proptest | 106 total: `text` 3, `structured_url` 49, `any_input` 3, `direction` 3, `word` 6, `trimmed_command` 6, `action` 36 |
| TypeScript Hegel | 24 total: shared 10; `cp-bounds`, `cp-symmetry`, `cp-narrowing`, `pct-bounds`, `pct-monotone` 1 each; `nd-props` 5; `pct-perm` 4 |
| TypeScript fast-check | 15 total: shared 6; the same five 1 each; `nd-props` 1; `pct-perm` 3 |

In Rust the two are the same size: Hegel's imperative `#[hegel::composite]` and `tc.draw` against proptest's combinators (`prop_oneof!`, `prop_map`, `select`) cost the same lines. In TypeScript fast-check is shorter (15 against 24): its `chain`/`record`/`map` combinators express a dependent pair or a record in one line where Hegel's `composite` takes a block of `tc.draw` calls. These are line counts, not a readability study.

**API friction.**
- Reading the result: proptest's `TestRunner::run` and fast-check's `fc.check` return structured results (the minimal value, and for fast-check `numRuns` and the seed). Hegel panics (Rust) or throws (TypeScript) on failure and exposes neither the case count nor the shrunk input as data, so both Hegel harnesses record the last failing draw and the invocation count themselves (a mutex-guarded record in Rust; a closure counter and the oracle's JSON error message in TypeScript).
- Seeding: all four libraries take a per-run seed (`Settings::seed`, `Config::rng_seed`, the `seed` setting, the `seed` parameter). Hegel needs its database disabled explicitly (`database(None)` in Rust, `Database.disabled` and a `hegel.toml` in TypeScript) so a run cannot replay an earlier failure.
- Unicode text: proptest's `any::<char>()` and `any::<String>()` are unrestricted and Hegel's `text()` is its own distribution, so the two do not generate the same strings (see validity threats).
- Branching types: proptest needs `.boxed()` where a generator differs by a runtime flag (`layout` in `action`); Hegel's imperative style does not.

**Failure-report readability.** The harnesses capture failures programmatically (Hegel's stderr report with the shrunk draws and a replay blob is discarded by the TypeScript driver, and the Rust driver catches the panic), so the excerpts below are the harness-formatted failure details stored in the result rows, not the libraries' native console output. The native console reports were not saved and are not compared here.

Hegel, Rust (`results/rust/runs.jsonl`, `action-layout-name`, seed 0):

```
counterexample: SetLayout("")
detail: text "set-layout " parsed to Err("expected a layout name")
```

proptest, Rust (same file, seed 0):

```
counterexample: SetLayout("\t")
detail: text "set-layout \t" parsed to Err("expected a layout name")
```

Hegel, TypeScript (`results/ts/hegel__M3-cp-k0lo.jsonl`, seed 0):

```
{"tag":"containment","inputs":{"k":0,"n":1,"alpha":0.5},"lo":0.001,"hi":0.75}
```

fast-check, TypeScript (`results/ts/fastcheck__M3-cp-k0lo.jsonl`, seed 0):

```
{"k":0,"n":1,"alpha":0.001}
```

In both Rust rows the failure detail is the oracle's message, so the readability difference is the counterexample itself: proptest's final `"\t"` is a whitespace name of size 1, one step from the empty minimum that Hegel reached.

**Setup steps.**
- Rust: add `hegeltest = "=0.52.6"` or `proptest = "=1.12.0"` to a standalone package. Hegel builds a nested engine from source on first build and needs the host C toolchain; proptest is pure Rust.
- TypeScript: `bun install` in each package. Hegel's install reports one blocked postinstall (a `koffi` script, listed by `bun pm untrusted`) and the library still loads and runs. fast-check's install showed no such report in the runs recorded here.

## Cost

All timings are *indicative* (the repository's timing standard, "rigor follows use": quick and local, one build layout, no host tuning, no A/A floor, the host shared with other work). None supports a strong claim about a small separation.

- **Rust first build** (`cargo test --no-run` after deleting the package's `target/`, crate registry cache warm, debug profile, 5 timed invocations after 1 warm-up; `results/rust/cost/first-build/report.md`): Hegel median 10.1 s (95% CI 9.77-10.16), proptest 3.6 s (3.55-3.63), about 2.8x. Both include compiling the three target crates; Hegel also builds its engine. Indicative; the figure moves with the host and the cache state.
- **Rust warm run** of one seeded 1,000-case run (the built example, debug profile, 15 timed invocations after 3 warm-up; `results/rust/cost/warm-run/report.md`): `url_invariants` Hegel 27 ms against proptest 97.3 ms; `action_roundtrip` 8.6 ms against 110.3 ms; failing `action_layout_name` including shrinking 10.7 ms against 3.7 ms (proptest stops at about the 29th invocation and shrinks almost instantly). Indicative. This is a debug build with different generators and different case distributions, so it is not like-for-like throughput.
- **TypeScript install with a warm package cache** (`node_modules` deleted first, 10 invocations; `results/ts/cost/install-report.md`): Hegel 3.5 ms, fast-check 2.9 ms, both at the process-start noise floor (no build step exists for either). A single cold-cache install, one run each (n=1, recorded in the TypeScript section of `notes.md`, not in a results file): Hegel 0.70 s, fast-check 0.06 s. Indicative; one run supports no interval.
- **TypeScript first property run after a clean install:** Hegel about 51 ms, fast-check about 29 ms (`results/ts/cost/install-report.md`, `first_run_ms`).
- **TypeScript warm run per property** (1,000 cases, whole process, 10 invocations; `results/ts/cost/warm-report.md`): the three `clopperPearson` properties dominate and are the target's cost times the generated `n`, not library overhead. `cp-bounds` / `cp-symmetry` / `cp-narrowing`: Hegel 5.3 s / 12.6 s / 11.1 s, fast-check 7.1 s / 15.7 s / 14.0 s (about 1.3x). The cheap properties took 42-63 ms on Hegel and 22-30 ms on fast-check in the whole process (`process_ms`, about 2x), and the in-process `run_ms` medians differ by a larger factor (for example `nd-props` 26.9 ms against 6.8 ms). A separation of about 2x is at the claim rule's threshold, no A/A floor was run, and the host was shared (load average about 4), so no strong claim is made about them.

## Validity threats

1. **Generator parity (the main one).** Each library uses its own idiomatic generators. In Rust, proptest's `any::<char>()` and `any::<String>()` against Hegel's `text()` produce different string distributions; the `url_idempotent` detection of 3/50 against 0/50 may reflect that, not search power. In TypeScript the two libraries bias floats and integers toward different boundaries, and the M5 result shows it directly: a defect designed to be hard was found in 50/50 by one library and 49/50 by the other, because both draw boundary floats often. Results are about each library with its idiomatic generators, not about the shrink or search algorithm in isolation.
2. **One host.** Everything ran on one desktop-class machine with no tuning, shared with other jobs during the TypeScript cost runs (load average about 4).
3. **One target per language.** One pair of Rust crates and one small TypeScript module; results may not transfer to other code shapes (stateful systems, parsers over bytes).
4. **Hand-picked mutants.** The mutants are one-line edits chosen by the experimenter, and the TypeScript target has no real defect. Detection rates depend on the mutants, which were not sampled from a model of real bugs.
5. **TypeScript seeds share a process.** The 50 seeds per (library, defect) run in one process. A fresh-process run of seed 37 reproduced its row, and a rerun of M5 over seeds 0-49 for both libraries matched all 100 rows, but the seeds are not independent processes.
6. **Narrowed Rust property.** The `action_layout_name` property restricts the `set-layout` name to free text and keeps every other string inside the documented grammar, to isolate the real defect; a broader free-text property also trips on out-of-contract command whitespace, which is not counted as a defect.
7. **Budget not tuned.** Every detection cell is at a ceiling or floor except one, so the budget was too generous to separate the libraries on detection; it was not re-tuned after seeing the data.
8. **Pre-registration error.** The pre-registered minimum for `url-idempotent-arxiv` was wrong (25, true minimum 21). It is reported against both values and left as written.

## How to reproduce

Run from the repository root. The two Rust targets are gitignored clones of the public `crucible-vault` and `crucible-dev-env` repositories under `var/pbt-cmp/`, with `crucible-vault` checked out at `49a46372` and `crucible-dev-env` at `d02df23`; the harness packages reach them by relative path. The TypeScript target is `scripts/lib/measure-stats.mjs` at commit `0384852`, copied into `var/ptlc-ts/` by `ts/driver.mjs setup`.

```bash
# Rust
bun property-testing-library-comparison/rust/drive.mjs run          # 7 defects x 2 libraries x 50 seeds -> results/rust/runs.jsonl
bun property-testing-library-comparison/rust/drive.mjs summary      # detection table
bun scripts/measure.mjs run --config property-testing-library-comparison/results/rust/cost/first-build.config.json --out <dir>
bun scripts/measure.mjs run --config property-testing-library-comparison/results/rust/cost/warm-run.config.json --out <dir>

# TypeScript
(cd property-testing-library-comparison/ts/hegel && bun install)
(cd property-testing-library-comparison/ts/fastcheck && bun install)
bun property-testing-library-comparison/ts/driver.mjs setup         # copy the target, apply each mutant with patch
bun property-testing-library-comparison/ts/driver.mjs run           # 2 libraries x 6 defects x 50 seeds -> results/ts/
bun property-testing-library-comparison/ts/driver.mjs tally         # detection and shrink table
bun scripts/measure.mjs run --config property-testing-library-comparison/ts/measure-install.json --out <dir>
bun scripts/measure.mjs run --config property-testing-library-comparison/ts/measure-warm.json --out <dir>

# numbers not in the tables above
bun property-testing-library-comparison/analysis/summarize.mjs write   # results/summary.md
```

The Rust driver applies each mutant diff to the clone with `git apply`, reverts it after, and refuses to start if a clone is dirty. The cost configs may need their `argv` paths adjusted if the folder is moved.

## Setup and dependencies

Every version below was checked against the lockfiles and manifests (the host already had the toolchains and tools).

| component | version | where |
|---|---|---|
| rustc / cargo | 1.99.1 | Rust harness (edition 2024) |
| bun | 1.4.4 | TypeScript harness, all drivers, `bun test` |
| `hegeltest` | =0.52.6 | `rust/hegel/Cargo.toml` and `Cargo.lock` |
| `proptest` | =1.12.0 | `rust/proptest/Cargo.toml` and `Cargo.lock` |
| `@hegeldev/hegel` | 0.5.7 (with its platform package and `koffi`) | `ts/hegel/package.json` and `bun.lock` |
| `fast-check` | 4.10.2 (with `pure-rand` ^8) | `ts/fastcheck/package.json` and `bun.lock` |
| `patch` (GNU) | 2.8 | used by `ts/driver.mjs setup` to apply mutants |
| `git` | 2.47.3 | used by the Rust driver (`git apply`) and by `setup` (`git show`) to read the target |
| C toolchain | host's | Hegel (Rust) builds a nested engine from source |

Network: the first Rust build needs crates.io access and the first `bun install` needs the npm registry; neither is needed at test time. No container is used: two single-toolchain harnesses with no system libraries beyond the C toolchain. Nothing outside this folder depends on the libraries.

## Credits

- Hegel, a family of Hypothesis-inspired property-based testing libraries: https://hegel.dev and https://github.com/hegeldev/hegel (`hegeltest` 0.52.6, `@hegeldev/hegel` 0.5.7 used here).
- proptest: https://github.com/proptest-rs/proptest (1.12.0 used here).
- fast-check: https://github.com/dubzzz/fast-check (4.10.2 used here).
- The related investigation [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/) supplied the Hegel pilot pattern and the follow-ups this investigation answers.
- Statistics (`clopperPearson`, `newcombeDiff`, bootstrap) come from this repository's `scripts/lib/measure-stats.mjs`; the timing method is the repository's timing standard.
