---
created: 2026-11-16
---

# Notes: stateful property testing on a layout model

## Spike (2026-11-16, indicative, release build)

Scratch harness, Hegel 0.52.6 `#[hegel::state_machine]`, target at commit `d02df23`, release build. Rigor level: indicative (one run each, no repetition protocol).

| check | result |
|---|---|
| Hegel's stateful API drives `World` | yes: 12 rules, an `always_run` invariant (`check_invariants` plus window, output and workspace counts against a model, visible windows live) |
| steps per case | 1,000 cases, 55,731 invariant checks (about 50 steps per case, default step count 50) |
| clean code | passes 1,000 cases (0.14 s) and 50,000 cases (7.2 s) |
| mutant: `remove_workspace` keeps the removed windows in the arena | detected; shrunk to 3 steps (`open`, `new_ws`, `remove_ws(0)`) in 3 of 3 runs (hand minimum 3) |
| mutant: `close_pane` does not move focus to the survivor | detected; shrunk to 2 steps (`split(Left)`, `close_pane`) (hand minimum 2) |

## proptest-state-machine probe (2026-11-16, indicative)

Probe crate: `proptest` 1.12.0 + `proptest-state-machine` 0.9.0, a stack model with a seeded defect ("never 3 or more items whose first is above 200"), runner `TestRunner::new_with_rng(Config { cases: 1000, failure_persistence: None, .. }, TestRng::from_seed(RngAlgorithm::ChaCha, &key))` with `key[..8] = seed.to_le_bytes()`.

- Seeding works: seed 7 run twice gave the same shrunk sequence, a 3-step minimum.
- Trap, measured: the library's shrinker first deletes every transition that was not counted as applied. A case function that applies the transitions itself without incrementing the per-case `seen_counter` makes the reported counterexample `([], [], None)`, an empty and false sequence. The harnesses here run every case through `StateMachineTest::test_sequential`, which increments the counter once per applied transition.

## Pre-registration

`catalogue.md` and the six `mutants/*.diff` files were written at 2026-11-16 01:34 CST (epoch 1794814453), before the first harness build and before any seeded-defect run. Nothing in them was chosen after a result.

## Working notes

### Build and first runs (2026-11-16)

- The model and rules live in `rust/common/model.rs`, shared by both harness crates via `#[path]`, so the two libraries cannot drift apart on rules or oracle. Each rule is a `Step` value with index choices (modulo the live list); Hegel draws the step's parameters inside `#[rule]` methods, proptest generates `Step` with a uniform kind choice then the kind's parameters.
- Both libraries record every failing run's step list and message (`rust/common/report.rs`); the last failure recorded is the shrunk counterexample. For proptest the row's sequence is taken from the `TestError::Fail` value (authoritative) and matched the recorded log length in the smoke runs.
- Hegel smoke run first logged an invariant entry after every step (`(check)`); that was a harness-side bug (the oracle run was being counted as a step), fixed by logging only rule steps before any result was kept.
- Clean run, 1,000 cases each, passed in both libraries before the real run. Geometry candidate (tiles inside the output rect, pairwise non-overlapping at zero gaps) held on clean code in both libraries over 50,000 cases; no clean failure occurred, so no hand-classification and no oracle correction.
- Release build: 1,000 cases of up to 50 steps took about 0.12 s (Hegel) and 0.02 s (proptest) per run, indicative. The 50,000-case clean runs took 5.5 s and 1.1 s. Proptest sequences average about 25 steps per case (1.277 million steps in 50,000 cases, measured with a scratch counter, not committed), Hegel about 50.
- A second full run (`run --out` to a scratch file) matched `results/runs.jsonl` on defect, library, seed, detected, cases to first failure, shrunk steps and sequence for all 602 rows: both libraries are deterministic under these seeds.
- No shrunk sequence was shorter than the pre-registered hand minimum for any defect; every failing check was the one the catalogue predicted (`swap-windows-duplicates` trips "window in one pane" with the left value 0 or 2 depending on which duplicate is counted first).
- Mutant 2 (`close-pane-keeps-stale-focus`) builds with an unused-variable warning (the diff removes the only use of `survivor`); harmless.
- Proptest's non-minimal shrinks (for example seed 0 on `close-pane-keeps-stale-focus`: 8 steps, `NewWs, NewWs, AddOutput, Split(Down), RemoveOutput(14), NewWs, RemoveWs(14), ClosePane`) are real library output, not a harness artifact: the same failing sequence minimised by hand is `Split(Left), ClosePane`, and the shrinker stops at a single-deletion local optimum because the index-selected steps change meaning when earlier steps are removed.
- Step counts measured with a scratch counter on seed 0, 50,000 clean cases: Hegel 2,454,516 steps (about 49 per case), proptest 1,277,054 (about 25 per case).
