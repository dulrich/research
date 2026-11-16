//! The Hegel harness: the shared model driven by `hegel::stateful` rules. `run` drives one seeded
//! run (a fixed seed and case budget) and returns the outcome row as one JSON line.

#[path = "../../common/model.rs"]
mod model;
#[path = "../../common/report.rs"]
mod report;

use hegel::generators as gs;
use hegel::{Hegel, Settings, TestCase};
use model::{DIRS, IDX_MAX, Model, Step};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::time::Instant;

pub const LIBRARY: &str = "hegel";

struct Machine {
    m: Model,
}

fn idx(tc: &TestCase) -> usize {
    tc.draw(gs::integers::<usize>().max_value(IDX_MAX))
}
fn dir(tc: &TestCase) -> crucible_layout::Direction {
    tc.draw(gs::sampled_from(DIRS.to_vec()))
}

impl Machine {
    fn step(&mut self, s: Step) {
        let m = &mut self.m;
        report::guarded(format!("{s:?}"), || m.apply(&s));
    }
}

#[hegel::state_machine]
impl Machine {
    #[rule]
    fn open(&mut self, _: TestCase) { self.step(Step::Open) }
    #[rule]
    fn close(&mut self, tc: TestCase) { self.step(Step::Close(idx(&tc))) }
    #[rule]
    fn split(&mut self, tc: TestCase) { self.step(Step::Split(dir(&tc))) }
    #[rule]
    fn close_pane(&mut self, _: TestCase) { self.step(Step::ClosePane) }
    #[rule]
    fn focus(&mut self, tc: TestCase) { self.step(Step::Focus(dir(&tc))) }
    #[rule]
    fn move_(&mut self, tc: TestCase) { self.step(Step::Move(dir(&tc))) }
    #[rule]
    fn new_ws(&mut self, _: TestCase) { self.step(Step::NewWs) }
    #[rule]
    fn switch_ws(&mut self, tc: TestCase) { self.step(Step::SwitchWs(idx(&tc))) }
    #[rule]
    fn remove_ws(&mut self, tc: TestCase) { self.step(Step::RemoveWs(idx(&tc))) }
    #[rule]
    fn move_to_ws(&mut self, tc: TestCase) { let a = idx(&tc); let b = idx(&tc); self.step(Step::MoveToWs(a, b)) }
    #[rule]
    fn add_output(&mut self, _: TestCase) { self.step(Step::AddOutput) }
    #[rule]
    fn remove_output(&mut self, tc: TestCase) { self.step(Step::RemoveOutput(idx(&tc))) }
    #[rule]
    fn focus_output(&mut self, tc: TestCase) { self.step(Step::FocusOutput(idx(&tc))) }
    #[rule]
    fn toggle_fullscreen(&mut self, _: TestCase) { self.step(Step::ToggleFullscreen) }
    #[rule]
    fn set_fullscreen(&mut self, tc: TestCase) { let k = idx(&tc); let on = tc.draw(gs::booleans()); self.step(Step::SetFullscreen(k, on)) }
    #[rule]
    fn mark_window(&mut self, _: TestCase) { self.step(Step::MarkWindow) }
    #[rule]
    fn swap_marked(&mut self, _: TestCase) { self.step(Step::SwapMarked) }
    #[rule]
    fn swap_windows(&mut self, tc: TestCase) { let a = idx(&tc); let b = idx(&tc); self.step(Step::SwapWindows(a, b)) }
    #[rule]
    fn focus_window(&mut self, tc: TestCase) { self.step(Step::FocusWindow(idx(&tc))) }

    #[invariant(always_run)]
    fn oracle(&self, _: TestCase) {
        report::guarded_check(|| self.m.check());
    }
}

/// One seeded run: `cases` cases of up to 50 steps, fixed seed, no example database.
pub fn run(seed: u64, cases: u64) -> String {
    let settings = Settings::new().test_cases(cases).seed(Some(seed)).database(None);
    let t0 = Instant::now();
    let result = catch_unwind(AssertUnwindSafe(|| {
        Hegel::new(|tc: TestCase| {
            report::begin_case();
            let m = Model::new();
            hegel::stateful::machine(Machine { m }).run(tc);
        })
        .settings(settings)
        .run();
    }));
    let total_ms = t0.elapsed().as_secs_f64() * 1000.0;
    let aborted = match result {
        Ok(()) => None,
        Err(p) => Some(p.downcast_ref::<String>().cloned().or_else(|| p.downcast_ref::<&str>().map(|s| s.to_string())).unwrap_or_else(|| "panic".into())),
    };
    report::row(LIBRARY, seed, cases, aborted, total_ms, None)
}
