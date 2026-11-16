//! Per-run bookkeeping and the one-line JSON outcome, included by both harness crates with
//! `#[path]`. A "case" is one generated step sequence. Every failure snapshots the steps run so
//! far in that case and the failed check's message; because the libraries shrink by re-running
//! smaller cases, the last snapshot is the shrunk counterexample.

use std::panic::{AssertUnwindSafe, catch_unwind, resume_unwind};
use std::sync::Mutex;

struct State {
    cases: u64,
    first_fail: Option<u64>,
    log: Vec<String>,
    last_fail: Option<(Vec<String>, String)>,
}

static STATE: Mutex<State> = Mutex::new(State { cases: 0, first_fail: None, log: Vec::new(), last_fail: None });

fn st() -> std::sync::MutexGuard<'static, State> {
    STATE.lock().unwrap_or_else(|e| e.into_inner())
}

/// Marks the start of one case (a generated step sequence, or one shrink re-run of one).
pub fn begin_case() {
    let mut s = st();
    s.cases += 1;
    s.log.clear();
}

fn text(p: &Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = p.downcast_ref::<String>() { s.clone() } else if let Some(s) = p.downcast_ref::<&str>() { s.to_string() } else { "panic".into() }
}

/// Runs `f` (one step: apply it, then check the oracle). `label` is the step's `Debug` form, logged
/// before `f` runs. A panic is recorded as the failure of this case and re-raised.
pub fn guarded<R>(label: String, f: impl FnOnce() -> R) -> R {
    st().log.push(label);
    guarded_check(f)
}

/// Like `guarded` but logs no step (the oracle run after a step belongs to that step).
pub fn guarded_check<R>(f: impl FnOnce() -> R) -> R {
    match catch_unwind(AssertUnwindSafe(f)) {
        Ok(r) => r,
        Err(p) => {
            let mut s = st();
            let n = s.cases;
            s.first_fail.get_or_insert(n);
            let snap = (s.log.clone(), text(&p));
            s.last_fail = Some(snap);
            drop(s);
            resume_unwind(p)
        }
    }
}

fn esc(s: &str) -> String {
    let mut o = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => o.push_str("\\\""),
            '\\' => o.push_str("\\\\"),
            c if (c as u32) < 0x20 => o.push_str(&format!("\\u{:04x}", c as u32)),
            c => o.push(c),
        }
    }
    o.push('"');
    o
}

/// The outcome row: `ok` with `detected` 0 or 1, or `error` when the run aborted without a failing case.
pub fn row(library: &str, seed: u64, cases: u64, aborted: Option<String>, total_ms: f64, sequence: Option<Vec<String>>) -> String {
    let s = st();
    let head = format!("\"library\":{},\"seed\":{},\"cases\":{}", esc(library), seed, cases);
    match (&s.last_fail, aborted) {
        (Some((log0, msg)), _) => { let log = sequence.as_ref().unwrap_or(log0); format!(
            "{{{head},\"status\":\"ok\",\"detected\":1,\"cases_to_first_failure\":{},\"shrunk_steps\":{},\"sequence\":[{}],\"failed_invariant\":{},\"total_ms\":{:.1}}}",
            s.first_fail.unwrap_or(0), log.len(),
            log.iter().map(|l| esc(l)).collect::<Vec<_>>().join(","), esc(msg), total_ms
        ) },
        (None, None) => format!(
            "{{{head},\"status\":\"ok\",\"detected\":0,\"cases_to_first_failure\":null,\"shrunk_steps\":null,\"sequence\":null,\"failed_invariant\":null,\"total_ms\":{:.1}}}",
            total_ms
        ),
        (None, Some(why)) => format!(
            "{{{head},\"status\":\"error\",\"detected\":0,\"cases_to_first_failure\":null,\"shrunk_steps\":null,\"sequence\":null,\"failed_invariant\":null,\"total_ms\":{:.1},\"detail\":{}}}",
            total_ms, esc(&why.chars().take(300).collect::<String>())
        ),
    }
}
