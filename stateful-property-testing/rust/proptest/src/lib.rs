//! The proptest harness: the shared model driven by `proptest-state-machine`. `run` drives one
//! seeded run and returns the outcome row as one JSON line. Every case runs through
//! `StateMachineTest::test_sequential`, which counts each applied transition (without that count
//! the library's shrinker deletes every transition and reports an empty sequence).

#[path = "../../common/model.rs"]
mod model;
#[path = "../../common/report.rs"]
mod report;

use model::{DIRS, IDX_MAX, KINDS, MAX_STEPS, Model, Step};
use proptest::prelude::*;
use proptest::test_runner::{Config, RngAlgorithm, TestError, TestRng, TestRunner};
use proptest_state_machine::{ReferenceStateMachine, StateMachineTest};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::time::Instant;

pub const LIBRARY: &str = "proptest";

/// The reference side carries no state: choices are indices resolved against the target when applied.
#[derive(Clone, Debug)]
pub struct Reference;

fn dir() -> impl Strategy<Value = crucible_layout::Direction> {
    proptest::sample::select(DIRS.to_vec())
}
fn idx() -> impl Strategy<Value = usize> {
    0..=IDX_MAX
}

/// One step kind, uniform over the 19 kinds (the order mirrors the Hegel rules).
fn step() -> BoxedStrategy<Step> {
    (0..KINDS)
        .prop_flat_map(|k| -> BoxedStrategy<Step> {
            match k {
                0 => Just(Step::Open).boxed(),
                1 => idx().prop_map(Step::Close).boxed(),
                2 => dir().prop_map(Step::Split).boxed(),
                3 => Just(Step::ClosePane).boxed(),
                4 => dir().prop_map(Step::Focus).boxed(),
                5 => dir().prop_map(Step::Move).boxed(),
                6 => Just(Step::NewWs).boxed(),
                7 => idx().prop_map(Step::SwitchWs).boxed(),
                8 => idx().prop_map(Step::RemoveWs).boxed(),
                9 => (idx(), idx()).prop_map(|(a, b)| Step::MoveToWs(a, b)).boxed(),
                10 => Just(Step::AddOutput).boxed(),
                11 => idx().prop_map(Step::RemoveOutput).boxed(),
                12 => idx().prop_map(Step::FocusOutput).boxed(),
                13 => Just(Step::ToggleFullscreen).boxed(),
                14 => (idx(), any::<bool>()).prop_map(|(k, on)| Step::SetFullscreen(k, on)).boxed(),
                15 => Just(Step::MarkWindow).boxed(),
                16 => Just(Step::SwapMarked).boxed(),
                17 => (idx(), idx()).prop_map(|(a, b)| Step::SwapWindows(a, b)).boxed(),
                _ => idx().prop_map(Step::FocusWindow).boxed(),
            }
        })
        .boxed()
}

impl ReferenceStateMachine for Reference {
    type State = Reference;
    type Transition = Step;

    fn init_state() -> BoxedStrategy<Self::State> {
        Just(Reference).boxed()
    }
    fn transitions(_: &Self::State) -> BoxedStrategy<Self::Transition> {
        step()
    }
    fn apply(state: Self::State, _: &Self::Transition) -> Self::State {
        state
    }
}

struct Harness;

impl StateMachineTest for Harness {
    type SystemUnderTest = Model;
    type Reference = Reference;

    fn init_test(_: &Reference) -> Model {
        report::begin_case();
        Model::new()
    }
    fn apply(mut m: Model, _: &Reference, step: Step) -> Model {
        report::guarded(format!("{step:?}"), || {
            m.apply(&step);
            m.check();
        });
        m
    }
}

/// One seeded run: `cases` cases of 1 to 50 steps, a fixed ChaCha seed, no failure persistence.
pub fn run(seed: u64, cases: u64) -> String {
    let cases = u32::try_from(cases).expect("cases fits u32");
    let mut key = [0u8; 32];
    key[..8].copy_from_slice(&seed.to_le_bytes());
    let config = Config { cases, failure_persistence: None, ..Config::default() };
    let mut runner = TestRunner::new_with_rng(config.clone(), TestRng::from_seed(RngAlgorithm::ChaCha, &key));
    let t0 = Instant::now();
    let result = catch_unwind(AssertUnwindSafe(|| {
        runner.run(&Reference::sequential_strategy(1..=MAX_STEPS), |(init, steps, seen)| {
            Harness::test_sequential(config.clone(), init, steps, seen);
            Ok(())
        })
    }));
    let total_ms = t0.elapsed().as_secs_f64() * 1000.0;
    let mut sequence = None;
    let aborted = match result {
        Ok(Ok(())) => None,
        Ok(Err(TestError::Fail(r, (_, steps, _)))) => { sequence = Some(steps.iter().map(|s| format!("{s:?}")).collect()); Some(r.message().to_string()) }
        Ok(Err(e)) => Some(format!("{e}")),
        Err(p) => Some(p.downcast_ref::<String>().cloned().or_else(|| p.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_else(|| "panic".into())),
    };
    report::row(LIBRARY, seed, cases as u64, aborted, total_ms, sequence)
}
