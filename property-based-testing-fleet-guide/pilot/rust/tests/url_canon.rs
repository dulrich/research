//! Property tests for `cv_text::url_canon::canonicalize_url`, using Hegel for Rust.
//! The real function is called through a path dependency; no source is copied.

use cv_text::url_canon::canonicalize_url;
use hegel::TestCase;
use hegel::generators as gs;

const SCHEMES: &[&str] = &["http", "https", "HTTP", "Https", "ftp", "mailto", "javascript", ""];
const HOSTS: &[&str] = &[
    "example.com",
    "EXAMPLE.com",
    "example.com.",
    "www.example.org",
    "xn--bcher-kva.example",
    "bücher.example",
    "BÜCHER.Example.",
    "127.0.0.1",
    "[::1]",
    "0x7f.1",
    "youtube.com",
    "www.youtube.com",
    "m.youtube.com",
    "youtu.be",
    "arxiv.org",
    "www.arxiv.org",
    "x.com",
    "twitter.com",
    "mobile.twitter.com",
    "forum.example",
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

/// (a) Never panics, on free text, URL-shaped text and `https://` plus free text.
#[hegel::test(test_cases = 20000, derandomize = true)]
fn never_panics(tc: TestCase) {
    let s = tc.draw(any_input());
    let _ = canonicalize_url(&s);
}

/// (b) Idempotence: canonicalising the canonical string gives the same canonical string.
///
/// This property finds a real defect (see `known_defect_arxiv_trailing_slash_not_idempotent`), so the
/// expected failure is asserted with `should_panic`; remove the attribute to see the shrunk counterexample.
///
/// The case count is high and the seed fixed (`derandomize`) because the counterexample needs an arXiv
/// host, an abs path ending in `.pdf` and a trailing slash together: at 20000 random cases it was found in
/// 4 of 10 runs, at 100000 in 10 of 10 (then one miss in a later batch of 5), so a fixed seed with a count that
/// reaches it keeps the default run deterministic.
#[hegel::test(test_cases = 300000, derandomize = true)]
#[should_panic(expected = "canonicalised to")]
fn canonical_is_idempotent(tc: TestCase) {
    let s = tc.draw(any_input());
    if let Some(c) = canonicalize_url(&s) {
        let again = canonicalize_url(&c.canonical);
        assert_eq!(
            again.as_ref().map(|a| a.canonical.as_str()),
            Some(c.canonical.as_str()),
            "input {s:?} canonicalised to {:?}",
            c.canonical
        );
    }
}

/// (c) Doc-comment invariants: result is http(s), has no fragment, the host is lower-case,
/// no tracking parameters survive in the query, and `domain` is the canonical host.
#[hegel::test(test_cases = 20000, derandomize = true)]
fn documented_invariants(tc: TestCase) {
    let s = tc.draw(any_input());
    if let Some(c) = canonicalize_url(&s) {
        assert!(
            c.canonical.starts_with("http://") || c.canonical.starts_with("https://"),
            "{s:?} -> {:?}",
            c.canonical
        );
        assert!(!c.canonical.contains('#'), "{s:?} -> {:?}", c.canonical);
        assert_eq!(c.domain, c.domain.to_lowercase(), "{s:?} -> {:?}", c.canonical);
        if let Some(q) = c.canonical.split_once('?').map(|(_, q)| q) {
            for pair in q.split('&') {
                let key = pair.split('=').next().unwrap_or("").to_lowercase();
                for t in ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
                          "fbclid", "gclid", "ref", "ref_src", "mc_cid", "mc_eid"] {
                    assert_ne!(key, t, "{s:?} -> {:?}", c.canonical);
                }
            }
        }
    }
}

#[cfg(test)]
mod meta {
    use super::*;
    use std::sync::atomic::{AtomicUsize, Ordering};
    static N: AtomicUsize = AtomicUsize::new(0);
    static SOME: AtomicUsize = AtomicUsize::new(0);

    /// Reports how many cases the generator really runs and how many canonicalise to `Some`.
    #[hegel::test(test_cases = 2000, derandomize = true)]
    fn generator_coverage(tc: TestCase) {
        let s = tc.draw(any_input());
        N.fetch_add(1, Ordering::Relaxed);
        if canonicalize_url(&s).is_some() {
            SOME.fetch_add(1, Ordering::Relaxed);
        }
        eprintln!("COVERAGE cases={} some={}", N.load(Ordering::Relaxed), SOME.load(Ordering::Relaxed));
    }
}

/// (b2) The same idempotence property, with the arXiv inputs the first run implicated set aside,
/// to look for any second defect hiding behind the first.
#[hegel::test(test_cases = 100000, derandomize = true)]
fn canonical_is_idempotent_outside_arxiv(tc: TestCase) {
    let s = tc.draw(any_input());
    if s.to_lowercase().contains("arxiv") {
        return;
    }
    if let Some(c) = canonicalize_url(&s) {
        let again = canonicalize_url(&c.canonical);
        assert_eq!(
            again.as_ref().map(|a| a.canonical.as_str()),
            Some(c.canonical.as_str()),
            "input {s:?} canonicalised to {:?}",
            c.canonical
        );
    }
}

/// The counterexample Hegel shrank to, asserted explicitly: an arXiv abs URL ending in `.pdf/`
/// canonicalises to a string that still ends in `.pdf`, and a second pass strips it.
#[test]
fn known_defect_arxiv_trailing_slash_not_idempotent() {
    let first = canonicalize_url("http://arxiv.org/abs/2101.00001.pdf/").unwrap();
    assert_eq!(first.canonical, "http://arxiv.org/abs/2101.00001.pdf");
    let second = canonicalize_url(&first.canonical).unwrap();
    assert_eq!(second.canonical, "http://arxiv.org/abs/2101.00001");
    let bare = canonicalize_url("http://arxiv.org/abs/2101.00001.pdf").unwrap();
    assert_ne!(first.canonical, bare.canonical, "slash and no-slash forms of one paper differ");
}
