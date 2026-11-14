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

## 2026-11-13 — pilot

Two property-test pilots against real fleet code, written and run in this folder. Rigor level for every timing below: *indicative* (single local runs, no repetition protocol).

### Setup

- Toolchain: `rustc 1.99.1 (58cf8f9c3 2026-10-13)`, `cargo 1.99.1 (5f94df478 2026-08-27)`, `bun 1.4.4 (38afee6c8)`. No system packages beyond these were needed.
- Libraries: Hegel for Rust, crate `hegeltest` 0.52.6 (resolved from `hegeltest = "0.52"`); Hegel for TypeScript, `@hegeldev/hegel` 0.5.7 (with its platform package `@hegeldev/hegel-linux-x64` and `koffi`). `bun add` reported one blocked postinstall (a `koffi` script); the library loaded and ran without it.
- Layout: the research repo and the target repos are sibling checkouts in one parent directory. `pilot/rust` is a standalone cargo package with its own `[workspace]` table and relative path dependencies (`../../../../crucible-vault/crates/cv-text`, `../../../../crucible-dev-env/crates/crucible-keys`, `../../../../crucible-dev-env/crates/crucible-layout`). `pilot/bun` imports `../../../scripts/lib/measure-stats.mjs` directly.
- Target commits: `crucible-vault` `86a6069d` when I started (the working tree was dirty in other crates, none under `cv-text`); it moved to `49a46372` during the work through another session's commits, with no diff under `crates/cv-text` between the two, and the final runs used the later tree. `crucible-dev-env` `d02df23`. `inference-engine` `5311920` (the fallback target; not used).
- Each pilot folder carries a `hegel.toml` that disables the example database, so a run leaves no `.hegel/` directory behind (the default database writes one under the working directory, and it replays stored failures on later runs).

Commands, from the research repo root:

```bash
(cd property-based-testing-fleet-guide/pilot/rust && cargo test)
(cd property-based-testing-fleet-guide/pilot/bun && bun install && bun test)
```

### What Hegel needed

- Rust: `cargo test` fetched crates (including `hegeltest-c`) and built the engine as a nested cargo build inside the `hegeltest` build script, producing `libhegel_c.so` and an engine shim under `target/`; the test binary loads it at run time. No server process, no network at test time, no system library. First build from a clean `target/` (crates already in the local cargo cache): about 11 s wall, 64 s CPU, 730 MB of `target/`. The very first build, which also downloaded crates, took about 16 s up to the first compile error. Total effort to get Hegel building and running: one command, no workaround.
- TypeScript: `bun add -d @hegeldev/hegel` took about 1 s; `hegel.test(...)` runs inside a `bun test` test body unchanged from the upstream vitest example, and shrinks and prints the reproduce line. Hegel for TypeScript does run under bun.
- API surprises (all caught by the compiler or on first run): in Rust 0.52 a `#[hegel::composite]` generator takes `tc: &TestCase`, not by value; tests take `tc: TestCase`. `bun test` has a 5 s per-test timeout, which `clopperPearson` exceeded (it bisects 200 times per bound), so each test passes an explicit timeout. In TypeScript the settings go in the second argument of `hegel.test`.

### Rust: `canonicalize_url` (`cv-text`, `url_canon.rs`)

Generator: a mix of three shapes, drawn 1/3 each: free Unicode text; a structured URL assembled from drawn parts (scheme including `ftp`, `mailto`, `javascript` and empty, separator variants, optional userinfo, a host from a list covering upper case, trailing dot, IDN, punycode, IPv4/IPv6 and the YouTube, arXiv and X hosts, optional port including invalid ones, zero to six path segments mixing dot segments, percent escapes, platform words and free text, optional trailing slash, zero to four query pairs with tracking and duplicate keys, optional fragment including `post-123`, surrounding whitespace); and `https://` followed by free text. With 2000 cases, 533 to 547 canonicalised to `Some`, so about a quarter of inputs get past the parser.

| Property | Cases | Wall time (indicative) | Result |
| --- | --- | --- | --- |
| `never_panics`: no panic on any generated input | 20,000 | under 1 s | pass |
| `documented_invariants`: result is http(s), no fragment, lower-case `domain`, no tracking parameter in the query (from the doc comment) | 20,000 | under 1 s | pass |
| `canonical_is_idempotent`: canonicalising `c.canonical` again gives `c.canonical` | 300,000 | about 2 s | **fails**, see below |
| `canonical_is_idempotent_outside_arxiv`: the same, inputs mentioning arXiv set aside | 100,000 | about 1 s | pass |
| `generator_coverage`: counts cases and `Some` results (a check on the generator) | 2,000 | under 1 s | pass |

The whole `url_canon` test binary takes 2.5 to 4 s.

Counterexample, verbatim from the first run (shrunk by Hegel):

```
let s = "http://arxiv.org/abs/2101.00001.pdf/";
assertion `left == right` failed: input "http://arxiv.org/abs/2101.00001.pdf/" canonicalised to "http://arxiv.org/abs/2101.00001.pdf"
  left: Some("http://arxiv.org/abs/2101.00001")
 right: Some("http://arxiv.org/abs/2101.00001.pdf")
```

Judgement: **real defect** (idempotence and the dedup purpose of a canonical form). In `canonicalize_url` the arXiv rewrite uses `ARXIV_RE = ^/(?:abs|pdf)/([^/]+?)(?:\.pdf)?$` against the path while the trailing slash is still present, so `/abs/2101.00001.pdf/` does not match and the `.pdf` is kept; the trailing-slash trim runs afterwards (`url_canon.rs:230`). A second canonicalisation then sees `/abs/2101.00001.pdf`, matches and strips `.pdf`. Effect: the same paper reached as `.../abs/2101.00001.pdf/` and `.../abs/2101.00001.pdf` gets two different canonical strings (and filenames), which defeats the deduplication the module exists for. It is reported, not fixed. The failing property stays as written, marked `#[should_panic]` so the default run passes and still demonstrates it, and `known_defect_arxiv_trailing_slash_not_idempotent` asserts the counterexample explicitly. Removing the `should_panic` attribute shows the failure.

Detection rate, because it matters for how the guide advises on case counts: the counterexample needs an arXiv host, an abs path ending in `.pdf` and a trailing slash together. With a random seed it was found in 4 of 10 runs at 20,000 cases, 10 of 10 at 100,000 and 10 of 10 at 200,000, then missed once in a later batch of five 100,000-case runs. With `derandomize = true` and 100,000 cases it missed on every run (the fixed seed never reached it); at 300,000 cases and a fixed seed it is found on every run, so that is what the pilot commits. A bug that hides in the conjunction of three structured features is found by volume and by a generator that makes the conjunction likely, not by default settings (default is 100 cases).

### Rust: `Action` `Display` / `FromStr` round trip (`crucible-keys`, `action.rs`)

The crate built as a path dependency with no system libraries (it pulls `xkeysym` and `crucible-layout`, pure Rust). Generator: every printable variant except `vt-switch`; direction, signed-integer, slot (0 to 9) and night-light payloads over their full ranges; a sample of eight nullary verbs (the nullary table is private, so the other nullary verbs are not covered); and string payloads for `SetLayout`, `Run`, `RunInTerminal` and `RunOn` in two modes.

| Property | Cases | Wall time (indicative) | Result |
| --- | --- | --- | --- |
| `display_then_parse_is_identity_in_contract`: payload strings are one word (names) or trimmed non-empty lines (commands); `parse(display(a)) == a` | 20,000 | under 1 s | pass |
| `display_then_parse_is_identity_unrestricted`: free-text payloads | 20,000 | under 1 s | fails; asserted with `#[should_panic]` |

The whole `action_roundtrip` binary takes about 0.17 s. Shrunk counterexample, verbatim:

```
let draw_1 = 0;
let draw_2 = "";
assertion `left == right` failed: text was "set-layout "
  left: Err("ActionParseError(\"expected a layout name\")")
 right: Ok(SetLayout(""))
```

Judgement on the survey's hypothesis, tested by explicit `known_*` tests: confirmed for each case, with different verdicts.

- Commands with leading or trailing whitespace (`Run(" a")` parses back as `Run("a")`): **out-of-contract**, since the `FromStr` doc comment says the command is "the rest of the text verbatim (trimmed)"; the in-contract property is correct to exclude it.
- An empty command (`Run("")` prints `run `, parse says the verb needs a command): **out-of-contract** by the "(non-empty)" wording on the variant docs, but nothing in the type prevents it.
- A layout name with a space, or an empty one (`SetLayout("a b")` prints `set-layout a b`, the parser rejects the second word): a **latent defect in the type's contract**: `Display` is documented as "the exact action grammar" and is infallible, but it is not injective over `String` payloads. Whether a real config can produce such a name I did not check (the code that reads the `layouts` list was not read), so I do not call it a user-visible bug.

No defect was found in the in-contract space across 20,000 cases.

### bun: `measure-stats.mjs`

Library: Hegel for TypeScript worked under `bun test`, so fast-check was not needed. Ten tests, 500 cases each for the property tests, a 60 s per-test timeout. Generators: `(k, n)` with `1 <= n <= 200`, `0 <= k <= n`; alpha in `[0.001, 0.5]`; samples of 1 to 40 finite floats in `[-1e6, 1e6]`; q in `[0, 1]`. Whole file: about 14 to 16 s, almost all of it in `clopperPearson` (the symmetry test alone about 6 s). Tolerance for floating point comparisons is `1e-7`.

| Property | Result |
| --- | --- |
| `clopperPearson`: `0 <= lo <= k/n <= hi <= 1`, `k = 0` gives `lo = 0`, `k = n` gives `hi = 1`, no NaN | pass |
| `clopperPearson`: symmetry `CP(k,n) = 1 - CP(n-k,n)` reversed | pass |
| `clopperPearson`: interval narrows weakly as alpha grows | pass |
| `clopperPearson(0, 0)` | returns `[0, 1]` (an explicit guard at the top of the function); asserted |
| `newcombeDiff`: contains the point difference, antisymmetric under swapping groups, within `[-1, 1]`, no NaN, for `n1, n2 >= 1` | pass |
| `newcombeDiff` with `n = 0` (either group) | returns NaN in `d`, `lo` and `hi`; asserted as a probe |
| `percentile`: within min and max, exact at `q = 0` and `q = 1`, no NaN | pass |
| `percentile`: monotone in q | pass |
| `percentile`: permutation-invariant and does not mutate its input | pass |
| `percentile([], q)` | NaN (documented guard); asserted |

On `n = 0` for `newcombeDiff`: confirmed NaN (`p1 = k1 / n1` is `0 / 0`; `wilson` guards `n <= 0` itself and returns `[0, 1]`, but the difference is computed from the NaN point estimate). Per the code's own callers, `measure-report.mjs` passes `kn(xs)` where `n = xs.length`, so `n = 0` only occurs for an empty group, which the grouping code never builds from observed values (not exhaustively checked); `clopperPearson` guards `n <= 0` and `newcombeDiff` does not, an inconsistency rather than a reachable bug. Judgement: **out-of-contract input**, no defect. No property failed on valid input, so this pilot found nothing in the statistics code; that is a real result, not a missing one, and the properties are the kind a hand-written example test would not state (symmetry, antisymmetry, monotonicity in alpha and q, permutation invariance).

### Effort and experience

- Authoring: about 200 lines for `url_canon.rs` (about 60 of them the URL generator), 120 for `action_roundtrip.rs`, 115 for `measure-stats.test.mjs`. The hard part was not the properties but the generators: a URL generator that reaches the interesting branches (hosts with special handling, dot segments, tracking keys, trailing slashes) is most of the work, and the one defect found needed a conjunction the generator makes only occasionally. Stating the properties took minutes each; deciding whether a failure was a defect or an out-of-contract input took the longest and needed reading the doc comments.
- Hegel versus the fallback: Hegel needed no fallback in either language. Positives: shrinking worked on first use in both (`"http://arxiv.org/abs/2101.00001.pdf/"`, `SetLayout("")`), the failure output includes a copy-pasteable reproduce attribute, `derandomize` and a per-test `test_cases` are one attribute each. Frictions: breaking API changes in the beta line (the `&TestCase` composite signature), a nested engine build (11 s and 730 MB the first time), an example database written to the working directory by default, `bun test`'s 5 s timeout against slow property bodies. `proptest` was not tried, so no comparison beyond the survey is claimed.
- What the pilot does not show: only three Rust functions and three TypeScript functions, all pure and small. It does not show Hegel's stateful testing, performance on large inputs, the flakiness of `should_panic` style tests across Hegel upgrades, behaviour on a CI machine, or that Hegel finds bugs `proptest` would miss (or the reverse). The defect search was bounded by my generators; "found nothing" for the statistics code means nothing within the generated ranges (`n <= 200`, samples of finite floats), not a proof. The nullary `Action` verbs are only sampled.
