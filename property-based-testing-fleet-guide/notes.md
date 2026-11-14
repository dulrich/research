---
created: 2026-11-13
---

# Property-based testing in the fleet: working notes

A working log for the investigation. Each step appends a dated entry: what was tried, what was learned.

## 2026-11-13 — survey of the crucible repos

Read-only survey of `crucible-dev-env`, `crucible-term`, `crucible-tui` and `crucible-vault`. No code was built or run; nothing in the surveyed repos was touched. Every claim below is from reading source, so "likely counterexample" means "the code reads as if this input breaks the property", not "a test failed".

What I read: each repo's README and agent contract for stack and gates; `git ls-files` plus line counts to find the big, pure files; then the public functions (and, for the strongest candidates, the bodies) of the parsers, codecs, normalisers, state machines and numeric helpers. For `crucible-vault` (about 560 Rust files) I sampled by crate and skipped the editor, the daemon, the providers and the watcher; the pure crates (`cv-text`, `cv-note`, `cv-index`, `cv-state`, `cv-protocol`, `cv-vault`'s path code) carry nearly all the candidates. Anchors were verified by grepping the signature line; line numbers are as of the surveyed checkouts.

How I chose candidates: a function qualifies when its contract can be said as one falsifiable sentence over generated inputs, it is callable in-process without I/O, and a hand-written example test would plausibly miss the corners. I ranked by (blast radius if wrong) x (likelihood the examples miss it) / (generator cost).

What surprised me:

- Every Rust repo is already close to property-based in spirit. `crucible-term-core` has a seeded xorshift corpus generator driving snapshot and delta round trips, `crucible-dev-env` has a hidden-invariants checker (`check_invariants`) called after hand-written layout operations, and `crucible-vault` has a "round trip every request variant" test. What is missing is generation with shrinking and arbitrary (not hand-picked) values; the invariants and oracles mostly exist already. Adoption cost is therefore lower than expected: many properties are an existing assertion function waiting for a generator.
- No surveyed repo has a dev-dependency on any generator or fuzzing library. Test helpers are hand-rolled.
- Several modules are ports of a JavaScript original (`path.posix.normalize`, `string-width`, regex-defined grammars) and carry the original's behaviour as their spec. That is a ready-made differential oracle: run the JS function under bun and compare.
- Reading alone turned up probable counterexamples: an IPC request whose argument is the literal `-` does not survive `to_line`/`parse`, the action grammar cannot round-trip a command with surrounding whitespace, and a width-list option parser appears to accept non-integers. These are hypotheses to confirm with a run, not findings.
- Real subprocess oracles exist on the host for free: `git` for gitignore matching (`crucible-vault` hand-rolls a glob matcher), `chrono` for calendar arithmetic, the previous release binary for render differentials.
