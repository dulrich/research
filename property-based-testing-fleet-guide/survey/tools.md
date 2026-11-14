# Property-based testing tools: the three modes, Hegel, Bombadil and the per-stack alternatives

Sources read for this survey: the Antithesis explainer at https://antithesis.com/docs/resources/property_based_testing/ (fetched), the Hegel repository https://github.com/hegeldev/hegel at commit `f5a7c0d29`, and the Bombadil repository https://github.com/antithesishq/bombadil at commit `69a61bc` (both read as local clones). Facts from the repositories are cited as `hegel: <path in upstream repo>` or `bombadil: <path>`. Anything stated from memory rather than from a source read is marked "(from general knowledge, unverified here)". Nothing here was installed or run; the pilot is where install and run claims get measured.

## The three modes

The Antithesis explainer separates three things that are often called by one name:

- **Property-based testing libraries** (QuickCheck, Hypothesis, FsCheck, Hegel): run inside the normal test suite and CI, generate mostly valid inputs, check stated properties and shrink a failure to a minimal case. Fast feedback, small scope: a function or a module.
- **Fuzzers** (AFL and its descendants): long-running, coverage-guided, often generate invalid or hostile inputs, aimed at crashes and security faults, usually against code the tester does not own.
- **Whole-system deterministic simulation testing with fault injection** (Antithesis itself): the property is stated over a whole deployed system, the environment is simulated deterministically, faults such as network partitions and node crashes are injected, and any failure can be replayed exactly.

The explainer lists the strengths of property-based testing as confidence in complex code, discovery of unknown unknowns, coverage of feature interactions, durable tests, and design feedback from having to state properties. Limits: runs are slower than example tests, writing good generators and properties takes skill, exact-output checks fit snapshot tests better, and setup such as mocking dependencies may be needed. Best fits: fiddly domains (timezones, Unicode, floating point), systems with guaranteed properties (databases, queues, key-value stores, financial engines), and rewrites or optimisations that must preserve the original's behaviour. Hegel is introduced as David MacIver's Hypothesis-derived library family meant to work in all three modes.

**Which is in reach for a small self-hosted fleet.** The library mode is fully in reach: it runs under `cargo test`, `bun test` or `pytest` with no infrastructure. A fuzzer is in reach for Rust parsers (see `cargo-fuzz` and `bolero` below) as an occasional long run, not as a gate. Whole-system simulation testing is a hosted product (Antithesis) and is out of reach for a self-hosted fleet; the useful residue is that Hegel and Bombadil are built to run under it later (Hegel ships a `workload` settings profile for it, hegel: `frontends/rust/src/docs/settings.md`), so tests written now are not wasted if that changes. Bombadil sits between modes: it runs locally and in CI as a randomised explorer of a running program, with replay and shrinking of the recorded trace, but without a simulated environment.

## Hegel

### Architecture

- Hegel is "a family of property-based testing libraries inspired by Hypothesis" with a core engine, `libhegel`, and per-language frontends (hegel: `README.md`). The monorepo currently holds the engine and frontends for Rust, Python, TypeScript, C++, Java, C#/F# and OCaml (hegel: `README.md`); a Go frontend directory also exists in the tree.
- The engine is written in Rust and exposes a C ABI; it is published as prebuilt shared and static libraries on GitHub releases (Linux amd64/arm64, macOS arm64, Windows amd64/arm64, plus a WebAssembly module) and as the `hegeltest-c` crate (hegel: `libhegel/README.md`). It does the language-independent work: deciding what to generate, running test phases, shrinking, the example database and report formatting (hegel: `frontends/python/docs/explanation/how-hegel-works.md`).
- The engine never sees the language's values. A generator asks the engine for primitive "choices" (an integer in a range, a boolean, a float, a string from an alphabet) and builds its value from them; a test case is fully described by its choice sequence, which is what makes shrinking, replay and the database language-independent (hegel: `frontends/python/docs/explanation/how-hegel-works.md`).
- Despite older wording in the frontend READMEs ("using the Hegel protocol"), the current frontends run the engine in-process through the C ABI, not through a separate server process: the Rust frontend loads the engine through the `hegel_*` C functions (hegel: `frontends/rust/Cargo.toml`), the TypeScript frontend "runs in-process" as a native library (hegel: `frontends/typescript/README.md`), and the Python frontend "includes the engine in its compiled extension module" (hegel: `frontends/python/docs/explanation/how-hegel-works.md`). No daemon is started and no network is used at test time.

### Frontends that match the fleet stacks

| Fleet stack | Frontend | Package | Version read | Notes |
| --- | --- | --- | --- | --- |
| Rust | Hegel for Rust | crate `hegeltest` (imported as `hegel`) | 0.52.6, edition 2024, MSRV 1.86 | hegel: `frontends/rust/Cargo.toml` |
| TypeScript under bun | Hegel for TypeScript | npm `@hegeldev/hegel` | 0.5.7 | needs Node 20.11+, Bun 1.2.5+ or Deno 2+; uses `koffi` for FFI (hegel: `frontends/typescript/package.json`, `frontends/typescript/README.md`) |
| Python | Hegel for Python | PyPI `hegeltest` (imported as `hegel`) | classified "Development Status :: 3 - Alpha" | needs Python 3.11+, builds with maturin (hegel: `frontends/python/pyproject.toml`) |

### How a test is written

Original snippets in the upstream API's style (see the upstream READMEs for the canonical examples). Rust, a property that a hypothetical normaliser is idempotent:

```rust
use hegel::generators as gs;
use hegel::TestCase;

#[hegel::test]
fn normalise_is_idempotent(tc: TestCase) {
    let s = tc.draw(gs::text());
    let once = normalise(&s);
    assert_eq!(normalise(&once), once);
}
```

(`#[hegel::test]` and `tc.draw(gs::...)` are the API shown in hegel: `frontends/rust/README.md`; `gs::text()` is assumed from the generator set and was not checked against the generator list.)

TypeScript, run under a test runner (the upstream README uses vitest; whether the same body works under `bun test` is unverified and is a pilot question):

```typescript
import { test } from "vitest";
import * as hegel from "@hegeldev/hegel";
import * as gs from "@hegeldev/hegel/generators";

test("normalise is idempotent", () =>
  hegel.test((tc) => {
    const s = tc.draw(gs.text());
    const once = normalise(s);
    if (normalise(once) !== once) throw new Error("not idempotent");
  }));
```

(API shape from hegel: `frontends/typescript/README.md`; `gs.text()` assumed.)

Python:

```python
import hegel
from hegel import generators as gs

@hegel.test
def test_normalise_is_idempotent(tc):
    s = tc.draw(gs.text())
    assert normalise(normalise(s)) == normalise(s)
```

(API shape from hegel: `frontends/python/README.md`; `gs.text()` assumed.)

Stateful (model-based) tests are first class in all three: Rust uses `#[hegel::state_machine]` with `#[rule]` methods driven by `hegel::stateful::machine(...).run(tc)` (hegel: `frontends/rust/examples/stack.rs`), TypeScript a `rules`/`invariants` object run with `hegel.stateful.run` (hegel: `frontends/typescript/README.md`), Python `hegel.StateMachine` (hegel: `frontends/python/docs/explanation/comparison-with-hypothesis.md`). Async tests exist in TypeScript (`hegel.testAsync`).

### Shrinking, replay, database, seeds and CI determinism

- Shrinking works on the choice sequence, so every generator shrinks for free; a failing run prints the minimal example and a copy-pasteable reproduce attribute (Rust `#[hegel::reproduce_failure("...")]`, Python `@hegel.reproduce_failure("...")`, TypeScript `.reproduceFailure("...")`) (hegel: `frontends/rust/README.md`, `frontends/python/README.md`, `frontends/typescript/README.md`). The "blob" is the replay token; `print_blob` controls printing (hegel: `frontends/rust/src/docs/settings.md`).
- Failing examples are stored in an example database, by default `.hegel/examples` under the working directory, keyed by module path and test name, and replayed first on the next run (hegel: `frontends/rust/src/runner.rs`, `frontends/rust/src/docs/settings.md`). The database can be moved, disabled, or keyed by hand.
- Seeds: a fixed `seed` setting gives reproducibility; `derandomize` derives a fixed seed from the test name; a fixed seed wins over `derandomize` (hegel: `frontends/rust/src/docs/settings.md`). The default case count is 100 (`test_cases`), overridable by `HEGEL_TEST_CASES`.
- CI determinism: the engine detects common CI services (`CI`, `GITHUB_ACTIONS`, `GITLAB_CI`, `BUILDKITE`, `CIRCLECI` and others) and selects the shipped `ci` profile, which sets `derandomize = true`, disables the database and suppresses the `too_slow` health check; the same commit therefore gets the same cases on every CI run (hegel: `frontends/python/docs/how-to/ci.md`, `frontends/rust/src/docs/settings.md`). The fleet has no hosted CI, so the equivalent is setting `HEGEL_DERANDOMIZE=true` (and a case count) in the repo's gate commands; settings come from a profile, a `hegel.toml` file, `HEGEL_*` environment variables, the test's own attributes and, for binaries, flags, in increasing priority (hegel: `frontends/rust/src/docs/settings.md`).
- Other settings worth knowing: health checks (`filter_too_much`, `too_slow`, `test_cases_too_large`, `large_initial_test_case`), phases (`explicit`, `reuse`, `generate`, `target`, `shrink`), `report_multiple_failures`, `stop_on_first_failure`, `show_statistics` (hegel: `frontends/rust/src/docs/settings.md`). Targeted search (`target`) lets a test steer toward larger metric values.
- Nondeterministic tests (races, outside services) do not abort as flaky by default: the engine detects them, confirms a failure by repeated replay and reports it with a caveat about how reliably it reproduced; `nondeterminism_strictness = error` restores strict behaviour (hegel: `libhegel/docs/nondeterminism.md`). For deterministic pure functions this is irrelevant.

### What "beta" means for adoption

Every README carries the same notice: Hegel is in beta, "we may make breaking changes if it makes Hegel a better property-based testing library", and the compatibility page is at https://hegel.dev/compatibility (hegel: `README.md`, `frontends/rust/README.md`, `frontends/typescript/README.md`, `frontends/python/README.md`). Versions are 0.x and released independently per component (hegel: `README.md`). The Python frontend's own guidance is blunt: for a project that only wants property tests in CI and already has Hypothesis tests, "keep using Hypothesis"; for a project that wants Antithesis workloads, use Hegel (hegel: `frontends/python/README.md`). Practical consequence for a fleet that pins exact dependency versions: pin the exact Hegel version, expect API churn on upgrade, and keep property tests small and few so a break is cheap to repair. The engine and the Rust and TypeScript frontends carry their own test suites; a Hypothesis test-suite port exists for the Python frontend (hegel: `frontends/python/docs/explanation/comparison-with-hypothesis.md`).

### Install and runtime requirements

- **Rust:** `cargo add --dev hegeltest` (hegel: `frontends/rust/README.md`). By default the frontend's `build.rs` builds the engine as a shared library with a nested cargo build (from the monorepo's `libhegel` directory, or from the pinned `hegeltest-c` crate release when building the published crate), bakes the library directory into the binary, and loads it at run time; setting `HEGEL_C_LIB_DIR` points it at a prebuilt library instead, and the `static-engine` feature links the engine into the test binary (hegel: `frontends/rust/build.rs`, `frontends/rust/Cargo.toml`). The pinned engine version is checked against the loaded library's reported version. Consequences: the first build needs the crates.io download of `hegeltest-c` (or an offline vendor of it), the build compiles the engine (extra build time on first use), and the test binary needs the shared library on disk at run time unless `static-engine` is used. Optional features add support for `serde_json`, `rand`, `chrono` and `jiff` generators (hegel: `frontends/rust/Cargo.toml`).
- **TypeScript:** `npm install --save-dev @hegeldev/hegel` (or `bun add`); each supported platform's prebuilt `libhegel` ships as its own npm package listed in `optionalDependencies`, resolved synchronously at load, with `HEGEL_LIBHEGEL_PATH` as an override (hegel: `frontends/typescript/src/locate.ts`). The only runtime dependency is `koffi` (native FFI) (hegel: `frontends/typescript/package.json`). No network at test time; the install fetches the platform package. Deno needs `--allow-ffi --allow-read --allow-env` (hegel: `frontends/typescript/README.md`). The browser build uses WebAssembly and is irrelevant here.
- **Python:** `pip install hegeltest` (3.11+); the engine is inside the compiled extension, so nothing else is needed (hegel: `frontends/python/docs/explanation/how-hegel-works.md`). Building from source needs maturin and a Rust toolchain (hegel: `frontends/python/pyproject.toml`). A pytest plugin is registered.
- None of the three needs a server process or network access at test time.

## Bombadil

### What it tests

Bombadil is "property-based testing for web and terminal UIs, autonomously exploring and validating correctness properties" (bombadil: `README.md`). It runs locally, in CI, and inside Antithesis. It has two drivers, `bombadil browser` and `bombadil terminal`; the terminal driver is marked experimental in its command-line help (bombadil: `lib/bombadil-cli/src/terminal.rs`). It is not a unit-level library: it launches the program under test, explores it as a user would, and checks temporal properties over the sequence of observed states.

The run loop is: extract the current state, check all properties against it recording violations, select the next action from the action generators and perform it, wait for the next event (for the terminal, a chunk of output bytes or a timeout), repeat (bombadil: `docs/manual/src/01-introduction.md`).

### Specification language

A specification is an ES module (TypeScript or JavaScript) that exports properties and action generators; everything exported by the top-level module is used (bombadil: `docs/manual/src/03-specification-language.md`).

- **Extractors** turn the observed state into JSON-serialisable values held in cells; `cell.current` gives the value in the current state. For the terminal the state exposes the screen grid (`grid.rowText(i)`, per-cell contents and styling), scrollback, cursor position and style, the process exit status, and the last action taken (bombadil: `lib/bombadil/src/specification/terminal/index.ts`).
- **Formulas** are a flavour of linear temporal logic: `always`, `eventually` (with a deadline such as `.within(5, "seconds")`), `next`, `now`, and the connectives `and`, `or`, `implies`, `not` (bombadil: `docs/manual/src/03-specification-language.md`). Typical shapes from the manual: an invariant (`always(...)`), a guarantee (`eventually`), a state machine over consecutive states (`always(unchanged.or(increment).or(decrement))` using `next`), and a sliding-window property.
- **Action generators** are built with `actions(() => [...])`, combined with `weighted([[weight, gen], ...])`, `branch`, `leaf`, and adapted with `map`, `filter`, `flatMap` and `when` (bombadil: `docs/manual/src/03-specification-language.md`). Generators must only return actions valid in the current state, so they usually read cells.
- **Defaults** for the terminal are deliberately small: the program must exit with code 0 (`exitSuccess`), must not print byte sequences the terminal renders as the Unicode replacement character (`noReplacementChars`), and an input generator that types Unicode-safe characters and common control characters (`typeBasicInput`) (bombadil: `docs/manual/src/03-specification-language.md`, `lib/bombadil/src/specification/terminal/defaults.ts`). The manual says directly that a custom specification is expected for real use.

### What the terminal driver can observe and do

- **Does:** spawn the program in a pseudo-terminal with `TERM=xterm-256color`, at a starting size (default 100 columns by 40 rows, 100 lines of scrollback), emulate the terminal with a Ghostty-derived VT library, and send actions: `TypeText` (text, a character set, or a regular-expression generator, which covers arrows, control keys, and escape sequences), `Resize` (ranges for rows and columns), `Click` (row and column), `ScrollUp` and `ScrollDown` (bombadil: `lib/bombadil-terminal/src/driver.rs`, `lib/bombadil-terminal/src/pty.rs`, `lib/bombadil-cli/src/terminal.rs`). Custom actions (arbitrary functions) are not supported by the terminal driver (bombadil: `docs/manual/src/03-specification-language.md`).
- **Observes:** the rendered screen as text and per-cell styling, the cursor, the scrollback, the exit status and the last action; it samples state when output quiesces (default 5 ms of silence, configurable) (bombadil: `lib/bombadil/src/specification/terminal/index.ts`, `lib/bombadil-cli/src/terminal.rs`). It does not observe the program's internals, files, network or timing beyond the screen.
- **Replay and shrinking:** a run writes a trace file; `--reproduce <trace>` replays the same action sequence (best effort; divergence is an error), and `bombadil terminal shrink --trace <trace>` searches for a shorter trace that violates the same property, after a calibration phase for flakiness; shrinking is documented as experimental (bombadil: `docs/manual/src/04-workflows.md`). `bombadil trace <file> --screen` shows each state's screen in the terminal. I found no seed flag for the terminal subcommand in the CLI source I read (bombadil: `lib/bombadil-cli/src/terminal.rs`); replay is by trace file.

### What a spec for a terminal app looks like

The shipped examples are the best evidence (bombadil: `examples/nano.ts`, `examples/tetris.ts`, `examples/cat.ts`, `examples/claude.ts`, `examples/text_editor.ts`, `examples/btop.ts`, `examples/tb.ts`):

- A structural property read from the screen: the editor `nano` always shows its standard key bindings in the bottom two rows except right after exit or in a prompt mode (`always(next(...))` over a cell built from `rowText` of the last two rows) (bombadil: `examples/nano.ts`).
- A state-conditional action generator: for a terminal game, send game keys while "Score" is on screen and not "GAME OVER", other input otherwise (bombadil: `examples/tetris.ts`).
- A liveness property: `eventually(...)` that "hello world" appears on more than five lines within five seconds, paired with a generator that mixes that literal into the input (bombadil: `examples/cat.ts`).
- A spec for a coding-agent TUI that detects a "working" indicator from a coloured ellipsis in the last rows and weights input accordingly, mixing typed text, control characters, scrolling and resizing (bombadil: `examples/claude.ts`).

### Runtime requirements

- Install: an npm package (`@antithesishq/bombadil`, which also supplies the TypeScript types), release binaries for Linux x86-64 and macOS arm64, a Nix flake, a Docker image or a GitHub Action (bombadil: `docs/manual/src/02-getting-started.md`). It runs on macOS or Linux.
- It is a self-contained Rust binary. Specifications are bundled by an embedded TypeScript transformer and evaluated in an embedded JavaScript engine (Boa), so running a spec needs no separate Node or bun process; type-checking a spec in an editor does need the npm types (bombadil: `Cargo.toml`, `lib/bombadil-terminal/Cargo.toml`; the no-Node conclusion is my reading of those dependency lists, not a tested claim).
- No network at test time for the terminal driver. Output is a trace file; it is run as a timed command (`--time-limit`, `--exit-on-violation`).
- Bombadil's own crates use Hegel as a dev-dependency for their temporal-logic equivalence tests (bombadil: `lib/bombadil-ltl/src/ltl_equivalences.rs`, `lib/bombadil-terminal/Cargo.toml`), which is a small signal that the two projects are developed together.

### Frank read on fit for crucible-term and crucible-tui

This is a judgement from the docs and examples; I did not run Bombadil, nor read the two repos' code in this survey, so treat the assessment of those repos as conditional on what they are (terminal emulator and terminal UI programs).

- **Where it fits well.** A terminal UI program is exactly the target: whole-program, screen-observable, keyboard-driven, with resize and scroll as first-class events. Good properties are the ones the examples show: no crash or non-zero exit under arbitrary input; no malformed UTF-8 on screen; the status bar or key hints are always present outside prompt modes; the screen never goes blank; after a resize the layout recovers within a deadline; a visible spinner is eventually replaced. It finds the "unexpected sequences of actions, weird timings, strange inputs" class that example tests do not reach (bombadil: `docs/manual/src/01-introduction.md`).
- **Where it fits poorly.** Properties that need the program's internal data (a model of the document, a database state) are out of reach, because the only observable is the screen and the exit status. A terminal emulator (as opposed to a TUI program) is a poor target: Bombadil is itself the terminal in this arrangement, so it observes the emulator only as a program running inside Bombadil's own pseudo-terminal, and an emulator that draws to a window rather than a pty cannot be observed at all; the emulator's own parsing and screen model are better tested as functions with a property-test library. Programs that need credentials, network services or a real home directory need a sandbox wrapper first.
- **Cost and maturity.** The terminal driver is labelled experimental, shrinking is labelled experimental, there is no custom-action support for the terminal, and I found no seed option; runs are timing-dependent (quiescence sampling), so reproduction is "best effort". It is a different animal from a library: slower, flakier, and a gate that is hard to make deterministic. It suits an occasional long run or a nightly exploration, not a per-commit gate.
- **Suggested use.** Start with the default specification against the program's non-interactive and interactive modes (the manual's own first test is a one-liner), then add three or four screen properties. Do not rely on it for logic that can be tested as a function; use a property-test library for that.

## Established alternatives per stack

| Stack | Library | Notes |
| --- | --- | --- |
| Rust | `proptest` | Strategy-based generators with shrinking, regression-file persistence of failing seeds, a `proptest!` macro; the de facto standard for property tests in Rust (from general knowledge, unverified here). |
| Rust | `quickcheck` | Older, simpler QuickCheck port: `Arbitrary` trait, shrinking via `Arbitrary::shrink`, less control over generation than proptest (from general knowledge, unverified here). |
| Rust | `bolero` | One harness that runs as a property test under `cargo test` and as a fuzz target under libFuzzer, AFL or honggfuzz; the bridge between the library and fuzzer modes (from general knowledge, unverified here). |
| Rust | `cargo-fuzz` | libFuzzer driver for coverage-guided fuzzing of Rust code; needs a nightly toolchain and a separate fuzz crate (from general knowledge, unverified here). |
| TypeScript / bun | `fast-check` | Mature property-based library for JavaScript and TypeScript: arbitraries, shrinking, async properties, model-based testing, seeds and replay by `{ seed, path }`; runs under any test runner including `bun test` because a property is an ordinary function (from general knowledge, unverified here). |
| Python | Hypothesis | The reference implementation for the whole family: strategies, shrinking, example database, stateful testing, `pytest` integration; mature, large ecosystem; the Hegel Python frontend itself recommends it for plain CI use (hegel: `frontends/python/README.md`; the maturity description is from general knowledge, unverified here). |
| POSIX shell | none worth using | (from general knowledge, unverified here) There is no mainstream property-based framework for POSIX shell. Workaround: treat the script as a black box and drive it from a host-language property test (fast-check under bun, Hypothesis, or proptest) that generates arguments and input files, runs the script in a temporary directory with a controlled `PATH` of fakes, and asserts on stdout, exit status and files. Prefer moving pure text logic out of shell into a tested module. |
| Perl | `Test::LectroTest` | (from general knowledge, unverified here) A QuickCheck-style module on CPAN; old and lightly maintained. Safer fallback: write the property as a plain loop with a seeded `rand` inside the existing unit script, which gives generation but no shrinking, or drive the module from a host-language test through a small stub script that reads cases on stdin. |
| C | `theft` (and `RapidCheck` for C++) | (from general knowledge, unverified here) `theft` is a small QuickCheck-style C library with shrinking; `RapidCheck` is the C++ equivalent. For a small number of C functions, the lowest-cost route is to compile them into a shared object and call them through a host-language property test (`ctypes` with Hypothesis, `koffi` with fast-check, or Rust FFI with proptest), with AddressSanitizer on. Hegel also has a C++ frontend and a C ABI (hegel: `libhegel/README.md`, `README.md`). |

## Comparison

| Stack | Recommended tool | Maturity | Runtime needs |
| --- | --- | --- | --- |
| Rust (library, in `cargo test`) | `proptest` as the safe default; Hegel (`hegeltest`) when the team accepts beta churn and wants the shared engine, stateful machines and CI derandomisation | proptest: mature (general knowledge, unverified here); Hegel: beta, 0.x, breaking changes allowed | proptest: pure Rust, no extras; Hegel: engine built or loaded as a shared library (`build.rs` nested build, or `HEGEL_C_LIB_DIR`, or the `static-engine` feature), crates.io download on first build |
| Rust (fuzzer mode) | `cargo-fuzz` or `bolero` | mature (general knowledge, unverified here) | nightly toolchain for `cargo-fuzz`; no network |
| TypeScript under bun | `fast-check` as the safe default; Hegel TypeScript as the beta alternative | fast-check: mature (general knowledge, unverified here); Hegel TS 0.5.x: beta | fast-check: none; Hegel: `koffi` plus a platform package carrying the engine, Bun 1.2.5+; whether it runs under `bun test` is unverified |
| Python | Hypothesis | mature, the reference (general knowledge, unverified here) | none beyond pip; Hegel for Python is alpha and recommends Hypothesis for plain CI |
| POSIX shell | black-box property tests from a host language | no native option | a host-language runner plus fakes on `PATH` and a temp directory |
| Perl | seeded loop in the existing unit script, or a host-language driver; `Test::LectroTest` if a library is wanted | thin ecosystem (general knowledge, unverified here) | none (core Perl) or a CPAN install |
| C | compile to a shared object and drive from a host-language property test, with ASan | n/a | compiler, sanitizer, host-language runner |
| Terminal UI programs | Bombadil terminal driver for whole-program exploration | experimental driver and experimental shrinking | a Linux x86-64 or macOS arm64 binary or npm package; a pty; no network |
| Whole-system with faults | Antithesis (hosted) | commercial product | out of reach for a self-hosted fleet; Hegel and Bombadil are designed to run there later |

## Open questions for the pilot

- Does the Hegel Rust frontend build offline from a vendored `hegeltest-c`, and how long does the first build take versus `proptest`?
- Does a Hegel TypeScript property run under `bun test` (the upstream examples use vitest), and does `koffi` load under bun on this host?
- Does the `ci`-profile behaviour (derandomised, database off) reproduce with `HEGEL_DERANDOMIZE=true` outside a detected CI?
- Is `cargo-fuzz`/`bolero` worth a separate run for the parsers, or is the library mode enough?
