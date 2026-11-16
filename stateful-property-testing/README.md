# Stateful property testing found all six seeded layout defects in 50/50 runs, and Hegel shrank to the minimal sequence more often than proptest

We wrote one model and oracle for the layout model `World` of the `crucible-layout` crate (target `crucible-dev-env` at commit `d02df23`) and drove it with Hegel's state machine (`hegeltest` 0.52.6) and proptest's (`proptest` 1.12.0 with `proptest-state-machine` 0.9.0), both at 1,000 cases of up to 50 steps. Against six seeded defects, 50 seeds each, both libraries detected every defect in 50/50 runs (95% CI 0.929-1.000 each), so detection did not separate them; shrinking did. Hegel's final sequence had exactly the hand-derived minimal step count in 274 of 300 runs (91%) against proptest's 189 of 300 (63%), and proptest's non-minimal results ran up to 13 steps against a 4-step minimum. The unmutated target passed 50,000 cases per library (seed 0): "no failure in 50,000 cases of up to 50 steps", which bounds what this model-based test can see and is not evidence that the model is correct. We did not find a real defect in the target. The model, the mutants and the oracle are ours, so the results measure these libraries on this seam, not stateful testing in general.

## Question and design

On a real stateful module, (a) does a model-based test find a real defect, and (b) on seeded defects how often does each library detect them and shrink to the hand-minimal step sequence? Every earlier property in the fleet guide and the comparison was stateless: one generated input, one check.

- **Target:** `crucible-layout`, the `World` of windows, panes, workspaces and outputs, at a pinned commit, cloned into a git-ignored directory and never edited except by applying one mutant diff at a time and reverting it.
- **One model, two harnesses:** `rust/common/model.rs` holds the model, the 19 rules (as `Step` values) and the oracle; both harness crates include that one file, so the rules, weights (uniform over the 19 kinds) and oracle are identical. Only generation differs: `rust/hegel` uses `#[hegel::state_machine]` rules, `rust/proptest` uses a `ReferenceStateMachine` strategy run through `StateMachineTest::test_sequential`. Step cap 50 in both (Hegel's default step count; `sequential_strategy(1..=50)`).
- **Rules:** open, close, split, close-pane, focus, move, new workspace, switch workspace, remove workspace, move window to workspace, add output, remove output, focus output, toggle fullscreen, set fullscreen, mark window, swap marked window, swap windows, focus window. Windows, workspaces and outputs are chosen by index into the live list (modulo its length), never by raw id, so a step carries only values both libraries can generate and shrink.
- **Oracle, after every step:** the target's own `check_invariants`; window, output and workspace counts against the model; visible, fullscreen and marked windows are live; each output's tiled rects (zero gaps) lie inside the output rect and do not overlap. Rules also assert documented post-conditions (a refusal is one of the documented errors; a successful move puts the window on the target workspace; a toggle flips the focused window).
- **Defects, pre-registered:** `catalogue.md` and `mutants/*.diff` (six, one hunk each) were written before the first seeded-defect run; each entry names the invariant expected to trip and the hand-minimal step count. The first two mutants come from a spike; the others cover outputs, fullscreen, mark/swap and window moves.
- **Protocol:** seeds 0-49 x 1,000 cases per (defect, library); one clean run per library at 50,000 cases (seed 0). Hegel runs with `Settings::new().test_cases(n).seed(Some(seed)).database(None)`; proptest with a ChaCha runner seeded from `seed.to_le_bytes()` and failure persistence off. Each run is a fresh process; the driver is `run.mjs`.

## Results

Detection k/50 with the Clopper-Pearson 95% interval, "exactly minimal" (shrunk step count equals the hand minimum) and the median shrunk step count (`results/summary.md`, rows in `results/runs.jsonl`):

| defect | library | detected | exactly minimal | hand min | median steps | median cases to first failure |
|---|---|---|---|---|---|---|
| remove-workspace-keeps-windows | Hegel | 50/50 | 44/50 | 3 | 3 | 6 |
| remove-workspace-keeps-windows | proptest | 50/50 | 14/50 | 3 | 4 | 6 |
| close-pane-keeps-stale-focus | Hegel | 50/50 | 50/50 | 2 | 2 | 5 |
| close-pane-keeps-stale-focus | proptest | 50/50 | 40/50 | 2 | 2 | 3.5 |
| remove-output-drops-workspace | Hegel | 50/50 | 50/50 | 2 | 2 | 2.5 |
| remove-output-drops-workspace | proptest | 50/50 | 50/50 | 2 | 2 | 2 |
| close-window-keeps-fullscreen | Hegel | 50/50 | 50/50 | 3 | 3 | 14 |
| close-window-keeps-fullscreen | proptest | 50/50 | 37/50 | 3 | 3 | 14 |
| swap-windows-duplicates | Hegel | 50/50 | 30/50 | 4 | 4 | 7 |
| swap-windows-duplicates | proptest | 50/50 | 20/50 | 4 | 5 | 15.5 |
| move-window-to-workspace-noop | Hegel | 50/50 | 50/50 | 3 | 3 | 4 |
| move-window-to-workspace-noop | proptest | 50/50 | 28/50 | 3 | 3 | 3 |

All twelve cells have 95% CI 0.929-1.000 for detection and 0 error rows (602 rows: 600 seeded, 2 clean). No shrunk sequence was shorter than the hand minimum. Distribution of shrunk steps (steps: runs), from the rows:

| defect | Hegel | proptest |
|---|---|---|
| remove-workspace-keeps-windows | 3: 44, 4: 6 | 3: 14, 4: 15, 5: 8, 6: 4, 7: 4, 8: 2, 9: 2, 10: 1 |
| close-pane-keeps-stale-focus | 2: 50 | 2: 40, 3: 6, 4: 2, 5: 1, 8: 1 |
| remove-output-drops-workspace | 2: 50 | 2: 50 |
| close-window-keeps-fullscreen | 3: 50 | 3: 37, 4: 7, 5: 4, 7: 2 |
| swap-windows-duplicates | 4: 30, 5: 17, 6: 3 | 4: 20, 5: 10, 6: 7, 7: 2, 8: 4, 9: 2, 10: 3, 12: 1, 13: 1 |
| move-window-to-workspace-noop | 3: 50 | 3: 28, 4: 14, 5: 6, 6: 1, 8: 1 |

**Clean-run bound.** The unmutated target passed 50,000 cases per library: no failure in 50,000 cases of up to 50 steps (Hegel about 2.45 million steps at about 49 per case, proptest about 1.28 million at about 25 per case, both counted with a scratch counter, so the two budgets differ in steps, not only in cases). That says these 19 rules, this oracle and these generators did not reach a counterexample; it is not a correctness claim. The geometry check was added as a candidate and held on clean code. Timings in the rows are incidental and indicative (release build, one host, no repetition protocol); they are not a claim.

**Hand-classification.** No clean-code failure occurred, so nothing was classified as a target defect and no oracle correction was needed.

## Reading of the non-minimal shrinks

Per defect, from the sequences in `results/runs.jsonl`:

- **`remove-workspace-keeps-windows`, `close-window-keeps-fullscreen`, `move-window-to-workspace-noop`.** Proptest leaves extra steps that are mostly workspace and output churn before the one needed verb (for example `NewWs, NewWs, Open, AddOutput, NewWs, RemoveWs(14), RemoveWs(4), MoveToWs(2, 15)`). The mechanism is the index encoding: deleting an earlier step changes the live list that a later index selects from (modulo its length), so a deletion that looks harmless changes what a later step does and the failure disappears. Every such sequence is a local optimum for single-step deletion. Hegel reached the minimum in 44/50, 50/50 and 50/50 of these; its 4-step leftovers on `remove-workspace-keeps-windows` are valid alternative routes (for example `AddOutput, RemoveOutput(0), Open, RemoveWs(0)`), not leftover noise.
- **`close-pane-keeps-stale-focus`.** Only two steps are needed, with no index: proptest reached them in 40/50 runs; the other 10 kept extra steps (up to 8) that the shrinker could not delete one at a time.
- **`swap-windows-duplicates`.** The hardest case for both: it needs two windows in different panes (or workspaces) plus a swap that picks two different windows by index, so the shortest sequence is the one where index values happen to select the two windows. Hegel was minimal in 30/50 (the rest were 5 or 6 steps: mostly the mark-and-swap route, for example `Open, MarkWindow, Split(Left), Open, SwapMarked`, which needs five steps, or an extra `Open`; the shrinker does not switch from one route to the shorter one); proptest in 20/50 with a tail to 13 steps.
- **`remove-output-drops-workspace`.** Both libraries were minimal in 50/50: two steps (`AddOutput`, `RemoveOutput`) with a failure that occurs for any index.

We did not test whether a different step encoding (explicit ids from the reference state, or a custom shrink step) would close proptest's gap; that is a design choice, not a property of the library, and is left open.

## Validity threats

- **One target, one model written by us, mutants chosen by us.** Six defects, one crate, one author of the model and the catalogue. The mutants were chosen to be visible to the declared oracle (hand-minimal counts were set before the runs), which flatters detection.
- **The oracle checks structure and counts, not whether every valid move or toggle took effect.** `check_invariants` and the counts catch five of the six mutants; only `move-window-to-workspace-noop`, a structurally valid wrong move, is caught by a rule's own post-condition. A defect that is structurally valid and for which no post-condition was written escapes. This is a limit of the oracle written here, not of either library.
- **Models, rules and weights are equal, generators are not identical.** Hegel draws an index with `integers().max_value(15)` and a direction with `sampled_from`; proptest uses `0..=15` and `select`. Rule order, Hegel's rule selection and proptest's sequence-size distribution (about 25 steps per case against Hegel's roughly 50) differ, so cases-to-first-failure are not like-for-like.
- **Release build.** The harnesses and the target are built in release mode; the target's `debug_assert!` checks are therefore off (a debug build could fail earlier on some defects).
- **Step count includes no-op steps.** A step whose index finds nothing to act on still counts; a minimal sequence has none, so the hand minima are unaffected.
- **Seeding is per library.** The two libraries use different generators and random streams, so the same seed is not the same sequence; the 50 seeds are replicates, not paired.
- **Reproducibility.** A second full run produced identical rows on the fields detected, cases to first failure, shrunk step count and sequence in all 602 rows (the timing field differs).

## Setup and dependencies

- Host toolchains: Rust 1.99.1 (`rustc`, `cargo`; edition 2024), a C toolchain (GCC 14.2 here; Hegel's engine is built from source), bun 1.4.4 for the driver, git 2.47.3, `patch` not needed (mutants apply with `git apply`). First build needs network for crates.io; the committed `Cargo.lock` files pin the dependency graphs and the driver builds with `--locked`.
- Crates: `hegeltest` =0.52.6 (`rust/hegel`), `proptest` =1.12.0 and `proptest-state-machine` =0.9.0 (`rust/proptest`), the target's `crucible-layout` as a path dependency.
- No container: two Rust crates, one host C toolchain, no system libraries beyond a default Debian base.

```bash
bun run.mjs setup        # clone the target at its pin into the git-ignored scratch directory named in `bun run.mjs --help`, copy the harness crates
bun run.mjs run          # 2 clean runs + 6 mutants x 2 libraries x 50 seeds -> results/runs.jsonl (about a minute)
bun run.mjs summary      # results/summary.md
```

`setup` clones from a sibling checkout of the target (`--src` names another directory). `run` refuses a dirty clone and reverts each mutant in a `finally`, also on SIGINT and SIGTERM. Every harness binary takes `<seed> <cases>` and prints one JSON row.

## Files

- `catalogue.md`, `mutants/*.diff`: the pre-registered defects (one-hunk diffs against the target).
- `rust/common/model.rs`, `rust/common/report.rs`: shared model, oracle and outcome bookkeeping; `rust/hegel`, `rust/proptest`: the two harnesses.
- `run.mjs`: driver. `results/runs.jsonl`, `results/summary.md`: rows and table. `notes.md`: working notes, the spike and the probe.

## Credits

Built on [Hegel](https://crates.io/crates/hegeltest) (`hegeltest`), [proptest](https://crates.io/crates/proptest) and [proptest-state-machine](https://crates.io/crates/proptest-state-machine). Follows [property-testing-library-comparison](../property-testing-library-comparison/) (same libraries, same pinned target, same seed and budget protocol, stateless properties) and [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/), which rated model-based testing high-value without running one.
