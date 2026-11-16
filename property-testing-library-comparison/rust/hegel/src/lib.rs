//! The comparison's properties, written for Hegel (`hegeltest` 0.52.6). The real targets are used
//! through path dependencies; no source is copied. Each property is a function of one `TestCase`
//! returning `Err(reason)` on failure; `run` drives it once with a fixed seed and case budget and
//! returns an `Outcome`.

use cv_text::url_canon::canonicalize_url;
use crucible_keys::{Action, NightLightArg};
use crucible_layout::Direction;
use hegel::generators as gs;
use hegel::{Hegel, Settings, TestCase};
use std::panic::{AssertUnwindSafe, catch_unwind};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

pub const LIBRARY: &str = "hegel";

const SCHEMES: &[&str] = &["http", "https", "HTTP", "Https", "ftp", "mailto", "javascript", ""];
const HOSTS: &[&str] = &[
    "example.com", "EXAMPLE.com", "example.com.", "www.example.org", "xn--bcher-kva.example",
    "bücher.example", "BÜCHER.Example.", "127.0.0.1", "[::1]", "0x7f.1", "youtube.com",
    "www.youtube.com", "m.youtube.com", "youtu.be", "arxiv.org", "www.arxiv.org", "x.com",
    "twitter.com", "mobile.twitter.com", "forum.example",
];
const SEGMENTS: &[&str] = &[
    "a", "b", ".", "..", "%2e", "%2E%2e", "%41", "%zz", "%", "a%20b", "ü", "watch", "shorts",
    "embed", "abs", "pdf", "2101.00001.pdf", "2101.00001", "posts", "threads", "123", "status",
    "someone", "12345678901", "dQw4w9WgXcQ", "@handle", "channel", "UCabc", "", "a;b", "%2F",
];
const QUERY_KEYS: &[&str] = &[
    "v", "q", "utm_source", "UTM_MEDIUM", "fbclid", "ref", "gclid", "id", "a", "", "%75tm_term",
    "ü", "a b",
];
const FRAGMENTS: &[&str] = &["", "post-123", "post-", "top", "#", "%", "ü"];
const TRACKING: &[&str] = &[
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid", "ref",
    "ref_src", "mc_cid", "mc_eid",
];

#[hegel::composite]
fn structured_url(tc: &TestCase) -> String {
    let scheme = tc.draw(gs::sampled_from(SCHEMES));
    let sep = tc.draw(gs::sampled_from(&["://", ":/", ":", "//", ""]));
    let userinfo = if tc.draw(gs::booleans()) {
        format!("{}@", tc.draw(gs::sampled_from(&["u", "u:p", "ü:%40", ":", "a@b"])))
    } else {
        String::new()
    };
    let host = tc.draw(gs::sampled_from(HOSTS));
    let port = if tc.draw(gs::booleans()) {
        format!(":{}", tc.draw(gs::sampled_from(&["80", "443", "8080", "0", "65536", "", "x"])))
    } else {
        String::new()
    };
    let nseg = tc.draw(gs::integers::<usize>().max_value(6));
    let mut path = String::new();
    for _ in 0..nseg {
        path.push('/');
        if tc.draw(gs::booleans()) {
            path.push_str(tc.draw(gs::sampled_from(SEGMENTS)));
        } else {
            path.push_str(&tc.draw(gs::text().max_size(6)));
        }
    }
    if tc.draw(gs::booleans()) {
        path.push('/');
    }
    let mut query = String::new();
    let nq = tc.draw(gs::integers::<usize>().max_value(4));
    for i in 0..nq {
        query.push(if i == 0 { '?' } else { '&' });
        query.push_str(tc.draw(gs::sampled_from(QUERY_KEYS)));
        if tc.draw(gs::booleans()) {
            query.push('=');
            query.push_str(&tc.draw(gs::text().max_size(5)));
        }
    }
    let frag = if tc.draw(gs::booleans()) {
        format!("#{}", tc.draw(gs::sampled_from(FRAGMENTS)))
    } else {
        String::new()
    };
    let pad = tc.draw(gs::sampled_from(&["", " ", "\t", "\n "]));
    format!("{pad}{scheme}{sep}{userinfo}{host}{port}{path}{query}{frag}{pad}")
}

#[hegel::composite]
fn any_input(tc: &TestCase) -> String {
    match tc.draw(gs::integers::<u8>().max_value(2)) {
        0 => tc.draw(gs::text()),
        1 => tc.draw(structured_url()),
        _ => format!("https://{}", tc.draw(gs::text().max_size(30))),
    }
}

fn direction(tc: &TestCase) -> Direction {
    tc.draw(gs::sampled_from(vec![Direction::Left, Direction::Right, Direction::Up, Direction::Down]))
}

/// A one-word string: arbitrary text with every whitespace character removed, never empty.
fn word(tc: &TestCase) -> String {
    let mut s: String = tc.draw(gs::text().max_size(12));
    s.retain(|c| !c.is_whitespace());
    if s.is_empty() { "x".to_string() } else { s }
}

/// A command line in the documented grammar: non-empty, trimmed, interior whitespace allowed.
fn trimmed_command(tc: &TestCase) -> String {
    let s: String = tc.draw(gs::text().max_size(20));
    let t = s.trim();
    if t.is_empty() { "x".to_string() } else { t.to_string() }
}

/// Every printable action except `vt-switch`. String payloads stay inside the grammar, except the
/// `set-layout` name when `free_layout_name` is set (arbitrary text, empty and spaces included).
fn action(tc: &TestCase, free_layout_name: bool) -> Action {
    match tc.draw(gs::integers::<u8>().max_value(19)) {
        0 if free_layout_name => Action::SetLayout(tc.draw(gs::text().max_size(8))),
        0 => Action::SetLayout(word(tc)),
        1 => Action::Run(trimmed_command(tc)),
        2 => Action::RunInTerminal(trimmed_command(tc)),
        3 => Action::RunOn { workspace: word(tc), command: trimmed_command(tc) },
        4 => Action::Focus(direction(tc)),
        5 => Action::Move(direction(tc)),
        6 => Action::Split(direction(tc)),
        7 => Action::Resize(direction(tc)),
        8 => Action::CycleStack(tc.draw(gs::integers::<i64>())),
        9 => Action::CycleWorkspace(tc.draw(gs::integers::<i64>())),
        10 => Action::ReorderWorkspace(tc.draw(gs::integers::<i64>())),
        11 => Action::MoveWindowToWorkspace(tc.draw(gs::integers::<i64>())),
        12 => Action::MoveWorkspaceToOutput(tc.draw(gs::integers::<i64>())),
        13 => Action::Slot(tc.draw(gs::integers::<u8>().max_value(9))),
        14 => Action::PinSlot(tc.draw(gs::integers::<u8>().max_value(9))),
        15 => Action::NightLight(tc.draw(gs::sampled_from(vec![
            NightLightArg::On,
            NightLightArg::Off,
            NightLightArg::Toggle,
            NightLightArg::Auto,
            NightLightArg::Kelvin(NightLightArg::MIN_KELVIN),
            NightLightArg::Kelvin(4000),
            NightLightArg::Kelvin(NightLightArg::MAX_KELVIN),
        ]))),
        16 => Action::NightLight(NightLightArg::Kelvin(
            tc.draw(gs::integers::<u32>().min_value(NightLightArg::MIN_KELVIN).max_value(NightLightArg::MAX_KELVIN)),
        )),
        _ => tc.draw(gs::sampled_from(vec![
            Action::Quit, Action::ClosePane, Action::CloseWindow, Action::RunTerminal,
            Action::NewWorkspace, Action::MarkWindow, Action::Lock, Action::Snip,
        ])),
    }
}

/// The properties. Mirrored one to one in the proptest package.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Prop {
    UrlNeverPanics,
    UrlIdempotent,
    UrlInvariants,
    ActionRoundtrip,
    ActionLayoutName,
}

impl Prop {
    pub const ALL: [Prop; 5] =
        [Prop::UrlNeverPanics, Prop::UrlIdempotent, Prop::UrlInvariants, Prop::ActionRoundtrip, Prop::ActionLayoutName];
    pub fn name(self) -> &'static str {
        match self {
            Prop::UrlNeverPanics => "url_never_panics",
            Prop::UrlIdempotent => "url_idempotent",
            Prop::UrlInvariants => "url_invariants",
            Prop::ActionRoundtrip => "action_roundtrip",
            Prop::ActionLayoutName => "action_layout_name",
        }
    }
    pub fn parse(s: &str) -> Option<Prop> {
        Prop::ALL.into_iter().find(|p| p.name() == s)
    }
}

pub fn check_idempotent(s: &str) -> Result<(), String> {
    if let Some(c) = canonicalize_url(s) {
        let again = canonicalize_url(&c.canonical);
        if again.as_ref().map(|a| a.canonical.as_str()) != Some(c.canonical.as_str()) {
            return Err(format!("canonicalised to {:?}, again to {:?}", c.canonical, again.map(|a| a.canonical)));
        }
    }
    Ok(())
}

pub fn check_invariants(s: &str) -> Result<(), String> {
    let Some(c) = canonicalize_url(s) else { return Ok(()) };
    let bad = |what: &str| Err(format!("{what}: {:?}", c.canonical));
    if !(c.canonical.starts_with("http://") || c.canonical.starts_with("https://")) {
        return bad("not http(s)");
    }
    if c.canonical.contains('#') {
        return bad("fragment survives");
    }
    if c.domain != c.domain.to_lowercase() {
        return bad("domain not lower-case");
    }
    if let Some((_, q)) = c.canonical.split_once('?') {
        for pair in q.split('&') {
            let key = pair.split('=').next().unwrap_or("").to_lowercase();
            if TRACKING.contains(&key.as_str()) {
                return bad("tracking parameter survives");
            }
        }
    }
    Ok(())
}

pub fn check_roundtrip(a: &Action) -> Result<(), String> {
    let text = a.to_string();
    match text.parse::<Action>() {
        Ok(b) if &b == a => Ok(()),
        other => Err(format!("text {text:?} parsed to {:?}", other.map_err(|e| e.0))),
    }
}

/// Result of one seeded run.
#[derive(Debug)]
pub struct Outcome {
    /// `pass`, `fail` (a counterexample was found) or `error` (the run aborted without one).
    pub status: &'static str,
    /// Test-function invocations up to and including the first failing one.
    pub cases_to_first_failure: Option<u64>,
    /// Debug form of the input of the last failing invocation (the shrunk counterexample).
    pub counterexample: Option<String>,
    /// Wall time from the first failing invocation to the end of the run, in milliseconds.
    pub shrink_ms: Option<f64>,
    pub total_ms: f64,
    pub detail: String,
}

struct Rec {
    calls: AtomicU64,
    first: Mutex<Option<(u64, Instant)>>,
    last: Mutex<Option<String>>,
}

fn record(rec: &Rec, input: String) {
    let n = rec.calls.load(Ordering::SeqCst);
    rec.first.lock().unwrap().get_or_insert((n, Instant::now()));
    *rec.last.lock().unwrap() = Some(input);
}

fn body(prop: Prop, tc: &TestCase, rec: &Rec) {
    rec.calls.fetch_add(1, Ordering::SeqCst);
    let (input, verdict) = match prop {
        Prop::UrlNeverPanics => {
            let s = tc.draw(any_input());
            let _ = canonicalize_url(&s);
            (String::new(), Ok(()))
        }
        Prop::UrlIdempotent => {
            let s = tc.draw(any_input());
            let v = check_idempotent(&s);
            (format!("{s:?}"), v)
        }
        Prop::UrlInvariants => {
            let s = tc.draw(any_input());
            let v = check_invariants(&s);
            (format!("{s:?}"), v)
        }
        Prop::ActionRoundtrip | Prop::ActionLayoutName => {
            let a = action(tc, prop == Prop::ActionLayoutName);
            let v = check_roundtrip(&a);
            (format!("{a:?}"), v)
        }
    };
    if let Err(reason) = verdict {
        record(rec, input);
        panic!("{reason}");
    }
}

/// Runs `prop` once with `cases` test cases and a fixed `seed`; the example database is off.
pub fn run(prop: Prop, seed: u64, cases: u64) -> Outcome {
    let rec = Rec { calls: AtomicU64::new(0), first: Mutex::new(None), last: Mutex::new(None) };
    let settings = Settings::new().test_cases(cases).seed(Some(seed)).database(None);
    let t0 = Instant::now();
    let result = catch_unwind(AssertUnwindSafe(|| {
        Hegel::new(|tc: TestCase| body(prop, &tc, &rec)).settings(settings).run();
    }));
    let end = Instant::now();
    let total_ms = end.duration_since(t0).as_secs_f64() * 1000.0;
    let first = *rec.first.lock().unwrap();
    let last = rec.last.lock().unwrap().clone();
    match (result, first) {
        (Ok(()), None) => Outcome { status: "pass", cases_to_first_failure: None, counterexample: None, shrink_ms: None, total_ms, detail: String::new() },
        (Err(p), Some((n, at))) => Outcome {
            status: "fail",
            cases_to_first_failure: Some(n),
            counterexample: last,
            shrink_ms: Some(end.duration_since(at).as_secs_f64() * 1000.0),
            total_ms,
            detail: panic_text(&p),
        },
        (Err(p), None) => Outcome { status: "error", cases_to_first_failure: None, counterexample: None, shrink_ms: None, total_ms, detail: panic_text(&p) },
        (Ok(()), Some(_)) => Outcome { status: "error", cases_to_first_failure: None, counterexample: None, shrink_ms: None, total_ms, detail: "failure recorded but run passed".into() },
    }
}

fn panic_text(p: &Box<dyn std::any::Any + Send>) -> String {
    if let Some(s) = p.downcast_ref::<String>() { s.clone() } else if let Some(s) = p.downcast_ref::<&str>() { s.to_string() } else { "panic".into() }
}
