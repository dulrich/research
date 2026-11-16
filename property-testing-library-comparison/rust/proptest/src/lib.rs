//! The comparison's properties, written for proptest 1.12.0. Same properties and input intent as
//! the Hegel package, with proptest's idiomatic strategies (not a port of the Hegel generators).
//! The real targets are used through path dependencies; no source is copied.

use cv_text::url_canon::canonicalize_url;
use crucible_keys::{Action, NightLightArg};
use crucible_layout::Direction;
use proptest::prelude::*;
use proptest::sample::select;
use proptest::test_runner::{Config, RngSeed, TestCaseError, TestError, TestRunner};
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

pub const LIBRARY: &str = "proptest";

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

/// Arbitrary text of at most `max` characters.
fn text(max: usize) -> impl Strategy<Value = String> {
    prop::collection::vec(any::<char>(), 0..=max).prop_map(|v| v.into_iter().collect())
}

fn structured_url() -> impl Strategy<Value = String> {
    let head = (
        select(SCHEMES),
        select(vec!["://", ":/", ":", "//", ""]),
        prop::option::of(select(vec!["u", "u:p", "ü:%40", ":", "a@b"])),
        select(HOSTS),
        prop::option::of(select(vec!["80", "443", "8080", "0", "65536", "", "x"])),
    );
    let segment = prop_oneof![select(SEGMENTS).prop_map(String::from), text(6)];
    let path = (prop::collection::vec(segment, 0..=6), any::<bool>());
    let query = prop::collection::vec((select(QUERY_KEYS), prop::option::of(text(5))), 0..=4);
    let tail = (prop::option::of(select(FRAGMENTS)), select(vec!["", " ", "\t", "\n "]));
    (head, path, query, tail).prop_map(|((scheme, sep, userinfo, host, port), (segs, slash), query, (frag, pad))| {
        let mut s = String::new();
        s.push_str(pad);
        s.push_str(scheme);
        s.push_str(sep);
        if let Some(u) = userinfo {
            s.push_str(u);
            s.push('@');
        }
        s.push_str(host);
        if let Some(p) = port {
            s.push(':');
            s.push_str(p);
        }
        for seg in segs {
            s.push('/');
            s.push_str(&seg);
        }
        if slash {
            s.push('/');
        }
        for (i, (key, value)) in query.into_iter().enumerate() {
            s.push(if i == 0 { '?' } else { '&' });
            s.push_str(key);
            if let Some(v) = value {
                s.push('=');
                s.push_str(&v);
            }
        }
        if let Some(f) = frag {
            s.push('#');
            s.push_str(f);
        }
        s.push_str(pad);
        s
    })
}

fn any_input() -> impl Strategy<Value = String> {
    prop_oneof![any::<String>(), structured_url(), text(30).prop_map(|s| format!("https://{s}"))]
}

fn direction() -> impl Strategy<Value = Direction> {
    select(vec![Direction::Left, Direction::Right, Direction::Up, Direction::Down])
}

/// A one-word string: arbitrary text with every whitespace character removed, never empty.
fn word() -> impl Strategy<Value = String> {
    text(12).prop_map(|mut s| {
        s.retain(|c| !c.is_whitespace());
        if s.is_empty() { "x".to_string() } else { s }
    })
}

/// A command line in the documented grammar: non-empty, trimmed, interior whitespace allowed.
fn trimmed_command() -> impl Strategy<Value = String> {
    text(20).prop_map(|s| {
        let t = s.trim();
        if t.is_empty() { "x".to_string() } else { t.to_string() }
    })
}

/// Every printable action except `vt-switch`. String payloads stay inside the grammar, except the
/// `set-layout` name when `free_layout_name` is set (arbitrary text, empty and spaces included).
fn action(free_layout_name: bool) -> impl Strategy<Value = Action> {
    let layout = if free_layout_name { text(8).boxed() } else { word().boxed() };
    let night_light_arg = select(vec![
        NightLightArg::On,
        NightLightArg::Off,
        NightLightArg::Toggle,
        NightLightArg::Auto,
        NightLightArg::Kelvin(NightLightArg::MIN_KELVIN),
        NightLightArg::Kelvin(4000),
        NightLightArg::Kelvin(NightLightArg::MAX_KELVIN),
    ])
    .prop_map(Action::NightLight);
    prop_oneof![
        1 => layout.prop_map(Action::SetLayout),
        1 => trimmed_command().prop_map(Action::Run),
        1 => trimmed_command().prop_map(Action::RunInTerminal),
        1 => (word(), trimmed_command()).prop_map(|(workspace, command)| Action::RunOn { workspace, command }),
        1 => direction().prop_map(Action::Focus),
        1 => direction().prop_map(Action::Move),
        1 => direction().prop_map(Action::Split),
        1 => direction().prop_map(Action::Resize),
        1 => any::<i64>().prop_map(Action::CycleStack),
        1 => any::<i64>().prop_map(Action::CycleWorkspace),
        1 => any::<i64>().prop_map(Action::ReorderWorkspace),
        1 => any::<i64>().prop_map(Action::MoveWindowToWorkspace),
        1 => any::<i64>().prop_map(Action::MoveWorkspaceToOutput),
        1 => (0u8..=9).prop_map(Action::Slot),
        1 => (0u8..=9).prop_map(Action::PinSlot),
        1 => night_light_arg,
        1 => (NightLightArg::MIN_KELVIN..=NightLightArg::MAX_KELVIN).prop_map(|k| Action::NightLight(NightLightArg::Kelvin(k))),
        3 => select(vec![
            Action::Quit, Action::ClosePane, Action::CloseWindow, Action::RunTerminal,
            Action::NewWorkspace, Action::MarkWindow, Action::Lock, Action::Snip,
        ]),
    ]
}

/// The properties. Mirrored one to one in the Hegel package.
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
    /// Debug form of the minimal failing input reported by the runner.
    pub counterexample: Option<String>,
    /// Wall time from the first failing invocation to the end of the run, in milliseconds.
    pub shrink_ms: Option<f64>,
    pub total_ms: f64,
    pub detail: String,
}

struct Rec {
    calls: AtomicU64,
    first: Mutex<Option<(u64, Instant)>>,
}

fn drive<S: Strategy>(strategy: S, seed: u64, cases: u32, check: impl Fn(&S::Value) -> Result<(), String>) -> Outcome {
    let rec = Rec { calls: AtomicU64::new(0), first: Mutex::new(None) };
    let config = Config {
        cases,
        rng_seed: RngSeed::Fixed(seed),
        failure_persistence: None,
        ..Config::default()
    };
    let mut runner = TestRunner::new(config);
    let t0 = Instant::now();
    let result = runner.run(&strategy, |v| {
        let n = rec.calls.fetch_add(1, Ordering::SeqCst) + 1;
        match check(&v) {
            Ok(()) => Ok(()),
            Err(reason) => {
                rec.first.lock().unwrap().get_or_insert((n, Instant::now()));
                Err(TestCaseError::fail(reason))
            }
        }
    });
    let end = Instant::now();
    let total_ms = end.duration_since(t0).as_secs_f64() * 1000.0;
    let first = *rec.first.lock().unwrap();
    match result {
        Ok(()) => Outcome { status: "pass", cases_to_first_failure: None, counterexample: None, shrink_ms: None, total_ms, detail: String::new() },
        Err(TestError::Fail(reason, value)) => Outcome {
            status: "fail",
            cases_to_first_failure: first.map(|f| f.0),
            counterexample: Some(format!("{value:?}")),
            shrink_ms: first.map(|f| end.duration_since(f.1).as_secs_f64() * 1000.0),
            total_ms,
            detail: reason.message().to_string(),
        },
        Err(TestError::Abort(reason)) => Outcome { status: "error", cases_to_first_failure: None, counterexample: None, shrink_ms: None, total_ms, detail: reason.message().to_string() },
    }
}

/// Runs `prop` once with `cases` test cases and a fixed `seed`; failure persistence is off.
pub fn run(prop: Prop, seed: u64, cases: u64) -> Outcome {
    let cases = u32::try_from(cases).expect("cases fits u32");
    match prop {
        Prop::UrlNeverPanics => drive(any_input(), seed, cases, |s| {
            let _ = canonicalize_url(s);
            Ok(())
        }),
        Prop::UrlIdempotent => drive(any_input(), seed, cases, |s| check_idempotent(s)),
        Prop::UrlInvariants => drive(any_input(), seed, cases, |s| check_invariants(s)),
        Prop::ActionRoundtrip => drive(action(false), seed, cases, check_roundtrip),
        Prop::ActionLayoutName => drive(action(true), seed, cases, check_roundtrip),
    }
}
