# Contract verification tools: Verus, how `jpeg2000_rs` uses it, and the alternatives by family

Sources read for this survey: the Microsoft Edge article "From Bug Hunting to Bug Prevention with Rust and Verus" (published 2026-11-09, https://microsoftedge.github.io/edgevr/posts/From-Bug-Hunting-to-Bug-Prevention-with-Rust-and-Verus/), and the repository https://github.com/microsoft/jpeg2000_rs at commit `cb2c54a0e3b11e8952c0cf8fcad1fecf417ea26c`, read as a local checkout. Facts from that repository are cited as `jpeg2000_rs/<path>:<line>`. A feasibility check run in a container (Verus release `0.2026.10.04.426d8b0`, Rust `1.98.1`) is recorded in `../notes.md`; its results are cited here as "the feasibility check". Everything else is marked either "from documentation" (the tool's published documentation, recalled, not re-fetched in this step) or "from general knowledge, unverified here". Nothing was installed or run to write this file.

## The article's layer model and the limits it states itself

The article places Verus in a pipeline of layers, each answering a different question and each with something left outside its guarantee:

| Layer | What it helps establish | What remains outside its guarantee (article's wording, condensed) |
| --- | --- | --- |
| Safe Rust | Memory and lifetime safety under Rust's rules | Algorithmic correctness and application-specific invariants |
| Verus | Explicitly specified properties of verified code, under stated assumptions | Whether the specification is the right one, and unverified components |
| Tests | Observed behaviour on known inputs and integration paths | Exhaustive coverage of inputs and states |
| Fuzzing | Discovery of failures by automated exploration of the input space | Exhaustive coverage of inputs and states |

The article's own illustration is a `count_positive` function over `&[i32]` with a `>= 0` where `> 0` was meant: the compiler passes it, example tests miss a zero, a differential test catches the zero, a fuzzer still misses `i32::MIN`, and the verifier rejects the comparison against the stated sum.

Limits the article states about itself, which this survey carries forward:

- A proof "establishes that the claim holds for every input covered by the proof's assumptions" and "is only as meaningful as the contract and assumptions we choose".
- A verification twin "is useful evidence about a *modeled slice* of code, not proof that the production code behaves identically"; the twin has to be shown faithful to the real implementation and its assumptions to match the real callers, and that correspondence gets harder to keep as production code changes. Embedding contracts next to the executable code "where practical" reduces that one source of drift.
- A proof is "relative to the stated specification and assumptions". It does not show the specification reflects a standard, nor that locally verified stages compose: proving a transform for supplied coefficients does not prove the parser and entropy decoder produced the right coefficients.
- If specification and implementation share a mistaken assumption a proof can establish the wrong thing, and the article flags this as a particular risk when AI helps write both.
- Failure behaviour belongs in the contract (the error result and the state left behind), not only the success path; the PLM packet-length parser is the article's example.
- Fuzzing, tests and integration validation stay: "prove selected invariants, fuzz the implementation, test known behavior, and validate the integrated system."

The article does not give proof effort, verification time or the share of the code covered for the JPEG 2000 decoder; its three Brotli examples are each a single small function. Whatever the cost of the full-source approach is, the article leaves it to the repository, read below.

## Verus

Verus (https://github.com/verus-lang/verus) is a verifier for a subset of Rust. The following is from documentation and general knowledge, unverified here, except where tagged with a `jpeg2000_rs` anchor or the feasibility check.

- **Contract language.** Functions carry `requires` (precondition), `ensures` (postcondition), and for loops `invariant` and `decreases` (termination measure). Specifications are written in Rust syntax with extra operators (`==>`, `<==>`, mathematical `int` and `nat`, `Seq`, `Set`, `Map`). The article's contracts use exactly these forms. Specifications over `&mut` parameters name the final value; this release requires `final(x)` or `old(x)` there (the feasibility check; migration note upstream in `source/docs/migration-mut-ref.md` of the Verus repository).
- **Modes and ghost code.** Code is `exec` (compiled and run), `spec` (mathematical functions, erased) or `proof` (lemmas and proof steps, erased). Ghost values and proof blocks exist only for the verifier and compile away, so the shipped binary is the ordinary Rust one. `jpeg2000_rs` uses all three: `spec fn` models in a separate tree, `proof fn` lemmas, `proof!` blocks inside executable functions (`jpeg2000_rs/src/magnitude.rs:51`).
- **How checking works.** Verus translates the function and its contracts to verification conditions and discharges them with an SMT solver (Z3 is the back end, from documentation; the feasibility check used the solver bundled with the release). A failed obligation is reported with the failing line. Properties the solver cannot find by itself are helped with `assert` statements and lemmas, which is where authoring effort goes.
- **What it needs from the source.** Code must stay inside the supported Rust subset and use library types that have specifications. Contracts either sit in a `verus!` macro block or, as `jpeg2000_rs` does, as `verus_spec` attributes on ordinary function items (`jpeg2000_rs/src/codestream/packet_headers.rs:583`). Loops need invariants and a decreases clause. Verus lifts Rust's aliasing rules into the verification, so `&mut` reasoning is comparatively cheap. Unsafe code, raw pointers, I/O and operating-system calls have to be wrapped behind a trusted specification (`external_body`, `assume_specification`) or left outside the verified region (from documentation). The greeter-style code in the fleet is mostly in that second category.
- **Standard-library coverage.** The `vstd` library supplies specifications for part of the standard library: `Option`, `Result`, `Vec`, slices, some iterators, some integer operations (from documentation; the exact set is release dependent and was not enumerated). Where a standard function has no specification, Verus cannot reason about its result. The feasibility check hit the shape of this: `Vec<String>::clone` carried no `==` specification in this release, so a postcondition equating the cloned list with the original failed to verify. The cause was not investigated, so this is a symptom, not a diagnosis.
- **Trusted base.** What a Verus result trusts: the verifier, the SMT solver, the `vstd` specifications of the standard library, any `external_body` / `assume` / `admit` in the source, and the Rust compiler. `jpeg2000_rs/THREAT_MODEL.md` says this in so many words: "Rust, Verus, the solver, their standard-library contracts, and the build environment remain part of the trusted computing base."
- **Toolchain pin.** A Verus release is built against one exact Rust toolchain and is used with it, not with the project's own toolchain. The pinned release here is `0.2026.10.04.426d8b0`, which needs Rust `1.98.1` (`jpeg2000_rs/.github/workflows/verus.yml:23-35`; the feasibility check confirmed the toolchain). `jpeg2000_rs/PROOFS.md` ("Reproduce verification") states the consequence: the proof toolchain is separate from the ordinary decoder toolchain, and "Do not substitute a rolling compiler without revalidating the source and standard-library specifications". The crate's own development toolchain is `1.93.1` (`jpeg2000_rs/rust-toolchain.toml`) and its runtime minimum is `1.88.0` (`jpeg2000_rs/Cargo.toml:11`): three Rust versions in one repository.
- **Release form.** The CI downloads a release zip by tag from the Verus repository's release page and checks its SHA-256 before use (`jpeg2000_rs/.github/workflows/verus.yml:23-31`). The version string is a date plus a commit hash, which suggests a rolling release scheme. Release cadence beyond that was not measured. The surface syntax changes between releases (the feasibility check's `final(self)` requirement; the project's own `vstd` pin is a dated pre-release string, `=0.0.0-2026-10-04-0306`, `jpeg2000_rs/Cargo.toml:43`). Budget for migration work at each bump.
- **Known tool limits seen in the project's documents.** The released verifier needs `--no-lifetime` because of an upstream initialisation error with a proposed upstream fix (`jpeg2000_rs/PROOFS.md`, section "Current lifetime-analysis limitation", which cites verus-lang/verus#3266). The flag disables Verus lifetime analysis only; Rust's borrow checker still runs.

## How `jpeg2000_rs` uses Verus, measured

`jpeg2000_rs` (package `jpeg2000-decoder`, https://github.com/microsoft/jpeg2000_rs, commit `cb2c54a`) is an experimental JPEG 2000 decoder with contracts attached to the production implementation.

### Layout

- `jpeg2000_rs/src/` is the production crate and carries the in-source contracts, proof blocks and the `#[cfg]` plumbing. `jpeg2000_rs/src/**/tests*.rs` are the native unit tests (the tests live inside `src/`, not in a separate directory).
- `jpeg2000_rs/specs/` holds mathematical models: `spec fn` definitions and lemmas, one `verus!` block per file, mounted into the crate with `#[path = "../specs/mod.rs"]` only when `verus_keep_ghost` is set (`jpeg2000_rs/src/lib.rs:80-82`).
- `jpeg2000_rs/proofs/` holds proof support: algebra, representation lemmas, a shared module, `internal_specs.rs`, `production_impl`, `spec_properties`; mounted the same way (`jpeg2000_rs/src/lib.rs:84-86`).
- `jpeg2000_rs/validation/` is Python tooling: the proof-coverage collector (`generate-proof-coverage.py`), the source-inventory extractor, oracle comparison against other decoders, and the `normative-coverage.json` index that maps implementation, model, contract, proof and tests. `jpeg2000_rs/fuzz/` is a separate fuzz package with 7 targets (`arbitrary_codestream`, `arbitrary_jp2`, `arbitrary_jpip`, `arbitrary_mq`, `arbitrary_packet`, `arbitrary_tier1`, `structured_framing`).

### Counts (what each is a count of)

Measured over `*.rs` files with `find` and `grep -c`. Line counts are physical lines, blank and comment lines included. Occurrence counts are **lines containing the token**, not clause or function counts (an `ensures` block with several clauses is one line; a `proof fn` signature spanning lines is one).

| Tree | `.rs` files | Lines | Lines with `requires` | Lines with `ensures` | Lines with `proof fn` | Lines with `spec fn` |
| --- | --- | --- | --- | --- | --- | --- |
| `src/` (all, including tests) | 196 | 185,583 | 155 | 2,215 | 135 | 708 |
| `src/` non-test files only | 184 | 110,470 | 155 | 2,215 | 135 | 708 |
| `specs/` | 160 | 74,361 | 1,073 | 1,641 | 1,641 | 3,589 |
| `proofs/` | 5 | 8,685 | 384 | 618 | 618 | 28 |

Reading these: the 12 test files under `src/` hold 75,113 lines and none of the contract tokens, so the non-test row has the same token counts as the whole row. The `ensures` and `proof fn` counts for `specs/` are equal (1,641) and so are the two counts for `proofs/` (618), which is consistent with every lemma carrying an `ensures` line but was not checked item by item. Lines with `requires` in `src/` are few relative to `ensures` (155 against 2,215), consistent with the project's stated aim of contracts with no preconditions: result contracts total over raw malformed input (reading; `jpeg2000_rs/PROOFS.md` uses the phrase "complete no-requires full-native Result contract").

Other measured tokens, in `src/` unless stated:

- `verus_spec(` appears on 2,525 lines across 124 files; `verus_keep_ghost` appears on 7,513 lines across 154 of 196 files; `proof!` on 3,228 lines; `proof_decl!` on 752 lines; `verifier::spinoff_prover` on 104 lines (a fresh solver context for a heavy function).
- `external_body`, `assume(`, `admit(`, `assume_specification`, `external_fn_specification`, `#[verifier::external` and `unsafe` code: 0 occurrences in `src/`, `specs/` and `proofs/` (the one `unsafe` match in `src/` is the `forbid(unsafe_code)` attribute at `jpeg2000_rs/src/lib.rs:1`). A search for the whole word `assume` in `src/` finds no line.
- `axiom_` appears on 3 lines in `src/` and `broadcast use` on 3 lines; the `axiom_` ones are calls to library lemmas, for example `vstd::std_specs::bits::axiom_u32_leading_zeros` at `jpeg2000_rs/src/packet/contributions.rs:742`. Library axioms are part of the trusted base; they are not new project axioms.
- The project's coverage collector rejects, as source text, `external_body`, `external_fn_specification`, `assume_specification`, `axiom`, `assume(`, `admit(`, `assume_termination(` and `verifier::external` (`jpeg2000_rs/validation/generate-proof-coverage.py:120-127`). The word-boundary pattern for `axiom` does not match `axiom_u32_leading_zeros`, so library-lemma calls pass; that is a reading of the regular expression, not a run.

The ratio the counts support: the models and proof support are of the same order as the production code, and the in-source contracts and proof blocks inside `src/` are not separable from executable lines by these counts. A real proof-to-code ratio would need a tool that separates erased lines; this survey does not claim one.

### How Cargo and Verus share one source

- The same `src/` compiles under both. Under Cargo, `verus_keep_ghost` is unset, so `#[cfg_attr(verus_keep_ghost, verus_spec(...))]` expands to nothing, `#[cfg(verus_keep_ghost)]` items and `proof!` blocks are dropped, and the crate has no dependencies and forbids `unsafe` (`jpeg2000_rs/Cargo.toml:49`, `jpeg2000_rs/README.md`, "Build"). Under the Verus frontend the flag is set, the ghost trees are mounted and the contracts are active.
- The optional `verus` Cargo feature supplies the pinned `vstd` dependency (`jpeg2000_rs/Cargo.toml:37,43`). A verifier run without it fails with a `compile_error!` (`jpeg2000_rs/src/lib.rs:6-9`); native-only profiles (`cooperative-deadlines`, `pdf-mq-recovery`, `incremental-input`) fail to compile under Verus on purpose so that a green proof cannot silently omit code (`jpeg2000_rs/src/lib.rs:11-31`).
- A few types compile differently under the two builds, for example derive lists gated by `cfg_attr(not(verus_keep_ghost), ...)` (`jpeg2000_rs/src/magnitude.rs:10`). That is a place the "same source" claim has a seam; how many such seams exist was not counted.
- The command (from `jpeg2000_rs/PROOFS.md`, "Reproduce verification", and `jpeg2000_rs/.github/workflows/verus.yml:77-79`): `cargo verus verify --features verus --locked --fwd-verus-args-to roots -- --no-lifetime`, run under `RUSTUP_TOOLCHAIN=1.98.1-x86_64-unknown-linux-gnu`. CI also checks that a run without the feature is rejected, that a module-only run is rejected as evidence, and that the proof-coverage collector accepts exactly one whole-crate root result (`jpeg2000_rs/.github/workflows/verus.yml:36-72`).
- A concrete shape, `parse_plm` (`jpeg2000_rs/src/codestream/packet_headers.rs:583-588`): a `verus_spec` attribute with one `ensures` equating the result, the parser's final state, the final index and the final groups to the model function `part1_parse_plm` over the old state, then the unchanged executable body with `proof!` blocks and loop invariants inside it. The model is in `specs/`; the contract is "the function returns what the model says", including the error result and the state left behind. This is the article's PLM example.

### What its own documents say is not proved

- `jpeg2000_rs/README.md`: "experimental software, not a certified JPEG 2000 implementation"; official conformance testing and broader independent validation are required before a conformance claim.
- `jpeg2000_rs/PROOFS.md`, "Reading this document": the sections "are not a chronological progress board, a release attestation, or a claim that the entire public decoder is proved from raw bytes through frame output"; a complete relation for parsed layouts or supplied samples "does not prove the parsing or normalization that produced those inputs".
- `jpeg2000_rs/specs/README.md`: the models and implementation "were developed together, not from an independently audited, frozen translation of the standard. Independent model-to-standard review remains outstanding." It names the two questions to keep apart: does the code do what the model says (a proof answers this), and does the model say what the standard requires (needs separate review).
- `jpeg2000_rs/specs/README.md` and `jpeg2000_rs/PROOFS.md`: function counts are not a completeness percentage; source-function coverage is recorded as "not-measured".
- `jpeg2000_rs/PROOFS.md`, "Concrete contract boundaries": a table with a "Not established by that relation alone" column for each contract family (for example, the accepted syntax having the intended pixel meaning, or callers choosing the normative context).
- `jpeg2000_rs/PROOFS.md`: the optional native profiles (cooperative deadlines, and the two named above) are outside the proof profile; one feature's documentation says it keeps "five existing Rust-only adapter boundaries" in the default profile (what those five are was not traced).
- `jpeg2000_rs/THREAT_MODEL.md`: decoded content is not authenticated; the verifier, solver, library contracts and build environment are trusted; the policy does not audit unsafe internals of the standard library, libFuzzer or the native oracles. The threat model's own validation list keeps unit, malformed-prefix, metamorphic, differential, resource and fuzz tests alongside the proofs.

`jpeg2000_rs/CONTRIBUTING.md` also records that proof work is dispatched to a coding-agent profile with a pinned model (a profile file under `jpeg2000_rs/.github/agents/`) under a human coordinator; the article likewise describes an "agentic authoring harness". The effect on authoring cost was not measured and no effort figure for the repository was found in the documents read.

## Twins versus in-source contracts

| | Verification twin (article's Brotli work) | In-source contracts (`jpeg2000_rs`) |
| --- | --- | --- |
| What is verified | A separate simplified Rust model of the logic, with a contract | The shipped function, with a contract on it |
| Touches production code | No | Yes: attributes, ghost blocks, loop invariants, verifier-only items |
| Subset restrictions on production code | None: the twin is written to fit the verifier | The production code must fit the verifier's Rust subset, or be left unverified |
| Drift between proof and code | Yes, and nothing catches it unless the twin is checked against the real code | Contracts fail to verify when the code changes incompatibly; drift moves to the specification (is the contract still the right one) |
| Adoption cost | Low and local, no change to the target repository | High and structural; the toolchain pin, a second build mode and a coverage collector come with it |
| What the result is evidence about | A modelled slice; how faithful the twin is stays a human judgement | The executable code, under the contract and the trusted base |
| Fit | A retrofit around one known defect class in a codebase one does not own | New code written to the contract, or code the team will maintain for years |

A twin is cheap to start (the feasibility check's login-state-machine twin verified a contract about when a session start is emitted), but the answer is about the twin. The article states this and names embedding as the remedy. In-source contracts remove the correspondence question and add the cost of writing the code in the verifier's subset and keeping two build configurations alive. The `jpeg2000_rs` repository is an example of the second at the scale shown in the counts table; it also shows that the project then needs extra machinery (the coverage collector, the escape-rejecting regular expression, fail-closed CI steps) to stay honest about what the green run covers. A middle path the article does not describe, from general knowledge: twin plus a check that ties the twin to the real code (differential tests of twin versus real function over generated inputs). That links to the property-testing investigations below.

## Alternatives by family

Everything in this section is from documentation or general knowledge, unverified here, because none of these tools was read from a local source or run. Treat the maturity statements as pointers to check, not findings. A later step in this investigation may measure Kani; this file does not.

### Bounded model checking: Kani

- **What it checks.** Kani (https://github.com/model-checking/kani, from AWS) is a bounded model checker for Rust built on CBMC. You write a proof harness (`#[kani::proof]`) that builds symbolic inputs (`kani::any()`), constrains them (`kani::assume`), calls the real function and asserts. Kani explores every input within the bound and reports a counterexample trace. It checks panics, arithmetic overflow, out-of-bounds access, and for `unsafe` code, memory-safety properties, plus any assertion you write.
- **What it needs from the code.** No annotation on the production function and no twin: harnesses live beside the unmodified code or depend on it by path. Loops and recursion need an unwinding bound; unbounded data (long strings, large vectors) is bounded by harness size. Heavy standard-library use, trait objects, concurrency and I/O are poorly supported or need stubs. Function contracts (`requires` / `ensures` with contract-based verification) exist as an unstable feature, to be checked against its current documentation.
- **Result.** A bounded proof: for every input within the harness bounds, no violation. Beyond the bound there is no claim. Unwinding too small is reported when the loop bound is insufficient; a harness that over-constrains its inputs (`assume`) can pass vacuously.
- **Maturity.** From general knowledge, unverified here: actively developed, used on AWS code and in a public effort to verify parts of the Rust standard library; installed as a Cargo subcommand with its own toolchain download. Check the repository before depending on it.

### Deductive verifiers: Creusot and Prusti

- **Creusot** (https://github.com/creusot-rs/creusot): from documentation, deductive verification of Rust through translation to Why3, with attribute contracts (`#[requires]`, `#[ensures]`), a ghost/logic layer and a prophecy encoding for mutable borrows, discharged by SMT solvers or an interactive prover. Needs its own pinned toolchain and the Why3 stack. Result: unbounded, relative to the contract. Needs annotations on the code under verification; unsafe and heavy trait use are limited.
- **Prusti** (https://github.com/viperproject/prusti-dev): from documentation, a Rust verifier from ETH Zurich on the Viper infrastructure with attribute contracts and ownership-based reasoning. From general knowledge, unverified here: its development activity has been lower than the other tools in this section; check the repository's recent commits and supported Rust version before a trial.
- **Compared with Verus:** same family (SMT-based, contracts, unbounded), different encodings, spec languages and trust bases. This survey does not rank them; it only notes that Verus is the tool the article and the fleet's user request name.

### Refinement types: Flux

- **What it checks.** Flux (https://github.com/flux-rs/flux, from documentation) adds refinement types to Rust: a type like an integer carries a predicate (`i32{v: v > 0}`), written in signature attributes and checked with an SMT solver as part of a compiler-plugin pass. It is lighter-weight than full contracts: properties are expressed in types, loop invariants are inferred in many cases, and there is less proof code.
- **What it needs from the code.** Signature annotations, a nightly toolchain tied to the plugin. Strong on bounds, indices, lengths and arithmetic ranges; weaker where the property is a relation over complex state. Unbounded, relative to the annotations.
- **Maturity.** From general knowledge, unverified here: research-grade, active, a smaller library of verified standard-library specifications than Verus. Check before a trial.

### Translation to a proof assistant: Aeneas and hax

- **Aeneas** (https://github.com/AeneasVerif/aeneas, from documentation): translates safe Rust, through the Charon MIR extractor, into pure functional code for a proof assistant (Lean, Coq, F* or HOL4), where properties are stated and proved interactively. Restricted to safe Rust with limited trait and closure support; the proof effort is that of a proof assistant. Unbounded, strongest on the trust story (a small checked kernel) and highest on authoring cost.
- **hax** (https://github.com/hacspec/hax, from documentation): extracts a Rust subset to F*, Coq, Lean and others for use with those tools; in use for verified cryptographic libraries (from general knowledge, unverified here). Same cost class as Aeneas.
- **For this fleet:** both fit best a small, safe, pure core that matters enough to justify a proof-assistant skill set. From general knowledge, unverified here, no fleet repo has such a core today; the per-repo survey is where that is judged.

## Adjacent non-proof layers

- **Miri** (https://github.com/rust-lang/miri, from documentation): an interpreter for Rust's MIR that reports undefined behaviour (invalid pointers, aliasing violations, uninitialised reads) on the executions it is given. It is not a verifier: it checks only the paths a test exercises, and it needs a nightly toolchain. Its value is on `unsafe` code. `jpeg2000_rs/` forbids `unsafe`; none of the five documents grepped mentions Miri, Kani, Creusot or Prusti.
- **Fuzzing** (`cargo-fuzz`, `bolero`, from the earlier survey): coverage-guided input generation for crashes and panics; the article's position is "fuzz the implementation" as a complement. `jpeg2000_rs/fuzz/` is such a package. The earlier survey covers the tools and the fleet-fit: `../../property-based-testing-fleet-guide/survey/tools.md` (see the sections "The three modes" and "Established alternatives per stack").
- **Property-based testing and the other property-testing investigations** are covered and not repeated here:
  - `../../property-based-testing-fleet-guide/` (the guide, the per-repo survey and a pilot);
  - `../../property-testing-library-comparison/` (Hegel against proptest and fast-check);
  - `../../stateful-property-testing/` (model-based state-machine properties on a layout model);
  - `../../property-testing-guide-suspicions/` (confirmation runs of reading-only suspicions).
  
  The relevant link to contract verification: a stated contract is the same artefact as a property. A property test runs it on generated inputs and finds a counterexample or none in the budget; a verifier proves it over all inputs in the modelled domain or reports it cannot. The article's own `count_positive` example puts both on one ladder.

## Non-Rust code in these repos: C, POSIX shell, Perl, TypeScript, Python

From general knowledge, unverified here, unless stated. Which fleet files fall in each category is the per-repo survey's job; this section judges what exists.

- **C.** Frama-C with its WP plugin and ACSL contracts is the established deductive route for C; CBMC (the engine under Kani) is the bounded route and runs on unmodified C with harnesses. Both are practical for small, self-contained, pointer-using functions; neither is a light addition to a build. If a fleet C function is small and pure, a CBMC harness comes closest to Kani's cost. AddressSanitizer and fuzzing, covered in the earlier survey, are the cheaper layers.
- **POSIX shell.** Nothing practical. Shell semantics (word splitting, globbing, environment, external commands) have no verifier in common use; research tools exist but were not examined. Linting (ShellCheck) is static analysis of known pitfalls, not verification. The honest answer is: move logic that matters into a language with a verifier or a test harness, and test the shell as a black box as the earlier survey describes.
- **Perl.** Nothing practical. No verifier for Perl is known to me; runtime assertions and tests are the layer available.
- **TypeScript.** No mainstream contract verifier for TypeScript is known to me. The type system is the lightweight layer; runtime schema validation checks untrusted input at the boundary; property tests (fast-check, covered in the earlier survey) are the practical layer for stated properties. Dafny can compile verified code to JavaScript (from general knowledge), but that means writing the logic in Dafny, not verifying existing TypeScript.
- **Python.** Runtime contract libraries (for example `icontract`, `deal`) check pre- and postconditions on every call, which is design by contract and not proof. Symbolic-execution-based checkers that read type hints and contracts exist (CrossHair), and a Viper-based verifier for a typed Python subset (Nagini); both are research or niche tools, maturity unverified. Hypothesis (earlier survey) is the practical layer.

## Comparison

| Approach (tool) | What it establishes | Needs a twin, annotations or harnesses | Bounded or unbounded | Basis for this row |
| --- | --- | --- | --- | --- |
| Deductive, SMT-based (Verus) | The stated contract holds for all inputs the contract covers, relative to its assumptions and the trusted base | Annotations in source (in-source), or a separate twin; ghost and proof code for anything the solver does not find itself | Unbounded over the stated domain | Local source (`jpeg2000_rs` at `cb2c54a`), the article, and the feasibility check |
| Bounded model checking (Kani) | No violation of the harness assertions for every input within the bound | Harnesses only; unmodified production code, no twin | Bounded (input sizes, loop unwinding) | Documentation and general knowledge; not installed here |
| Deductive, Why3 or Viper (Creusot, Prusti) | Same shape as Verus, different encodings and trust bases | Annotations in source | Unbounded over the stated domain | Documentation; not installed here |
| Refinement types (Flux) | Type-level predicates (ranges, lengths, indices) hold | Signature annotations | Unbounded | Documentation; not installed here |
| Translation to a proof assistant (Aeneas, hax) | Properties proved interactively on a pure translation of the code | A proof written in the assistant; the Rust subset is restricted | Unbounded | Documentation; not installed here |
| Miri | No UB on the executions exercised | Tests to execute | Bounded by the tests run | Documentation |
| Fuzzing (`cargo-fuzz`, `bolero`) | No crash found in the explored input space | A fuzz target | Bounded by the run | Earlier survey and the repository's `fuzz/` layout |
| Property testing (proptest, Hegel, fast-check, Hypothesis) | The property held for the generated cases, with shrunk counterexamples | A generator and a property | Bounded by the case budget | The earlier investigations in this repository |
| C (Frama-C/WP, CBMC) | As the Rust rows, for C | ACSL annotations, or harnesses | Unbounded (Frama-C/WP), bounded (CBMC) | General knowledge |
| Shell, Perl, TypeScript, Python | Nothing practical at the proof level; runtime contracts and property tests only | n/a | n/a | General knowledge |
