# Where machine-checked contracts would pay off across the fleet's repos, and a Verus and Kani pilot on the login greeter

This investigation asked where machine-checked contracts (a stated precondition, postcondition or state invariant that a tool proves for every input, or for every input up to a stated bound) would add value over tests and property tests in nine of the fleet's public repos, and ran a pilot to see what it takes. The survey is from reading source only and covers the security-sensitive code in `crucible-dev-env`, `crucible-term`, `crucible-tui`, `crucible-vault`, `crucible-datapad`, `inference-engine`, `scripts`, `semsearch` and `research`. The pilot stated four contracts about the login greeter in `crucible-dev-env` (a frame-length bound, a login state machine, a file-descriptor range computation, and the PAM worker's request ordering) and checked them with Verus (a deductive verifier for Rust, unbounded) and with Kani (a bounded model checker for Rust). Short answer: contracts pay on small, pure, numeric or state-machine code where a bound or an ordering must hold for every input, and not on I/O, FFI, process-state, string-heavy or non-Rust code. In the pilot Verus verified two of the four on the real source and the other two only on hand-written twins, Kani reached the real code for three of them (bounded for two) and `teardown_for` only for the fourth, every seeded defect was rejected by both tools, and the pilot also confirmed a writer/reader length disagreement in the greeter's codec (reported, not fixed).

## Short answer

- **Where contracts pay:** hand-written length and bound checks in decoders (`read_message`, the HTTP chunk decoder, the framebuffer geometry check), small closed state machines whose payload-level statements matter (the login machine), pure arithmetic over integer ranges (`close_ranges`), and cross-function obligations where a check in one function justifies an unchecked operation or an `unsafe` block in another. These are short, mostly pure Rust, and their statements are exact.
- **Where they do not:** code whose behaviour is a trace of system calls (privilege drop, socket creation order, symlink confinement), FFI and raw-pointer code (PAM marshalling, `recvmsg`), anything inside an async runtime, string and iterator heavy code, and everything that is not Rust (Perl, shell, JavaScript, Python have no practical verifier). The surveys call most of the fleet's security-relevant code in these groups "not worth a verifier" and name the cheaper check for each.
- **What the pilot measured:** on the greeter at one pinned commit, two of four contracts were verified by Verus on the real source (the state machine, and the descriptor ranges), the other two (the frame bound and the worker's ordering) only on twins, because the real functions use generic `Read`, `io::Error` and a `libpam` handle that Verus has no specifications for. Kani reached the real `read_message` and the real login machine by path, within bounds (the machine over every sequence of at most 3 events), proved `close_ranges` for every input through a small harness module added in the source file, and reached only `teardown_for` of the worker (not `serve`, which calls a foreign function Kani does not support).
- **What it costs:** a pinned toolchain per tool (Verus needs one exact Rust version; Kani downloads its own nightly), a second build mode for in-source contracts, a human review of each specification (a proof is only as good as the statement), and for twins a fidelity check by reading that nothing mechanical enforces. Numbers are in [What adoption would cost](#what-adoption-would-cost-a-repo).
- **The writer/reader disagreement:** `write_message` accepts any body whose length fits a `u32`, `read_message` refuses lengths above 65,536. This was proved on the Verus twin and reproduced by Kani on the real `read_message`. Whether the greeter can produce such a message was not determined.
- **Relation to property tests:** a contract and a property are the same statement; a property test samples it, a verifier covers all inputs in its domain. Prefer the property test where it is as strong in practice, and use a verifier for the all-inputs corner (width-sensitive overflow, "for every prefix"). See [How this relates to the property-testing investigations](#how-this-relates-to-the-property-testing-investigations).

## A primer for a reader who knows tests

- **Contract.** A function's `requires` clause is its precondition (what callers must establish) and its `ensures` clause is its postcondition (what the function guarantees, including the error result and the state it leaves behind). A property test states the same thing as an assertion over generated inputs; a verifier checks it over all inputs.
- **Ghost code.** Code that exists only for the verifier and is erased from the shipped program: specification functions (mathematical models), proof lemmas, and proof steps inside ordinary functions. In Verus these are `spec fn`, `proof fn` and `proof!` blocks. The shipped binary is the ordinary Rust one.
- **Twin versus in-source contract.** A twin is a separate, simplified copy of the logic written to fit the verifier, with the contract on the copy; the result is evidence about the copy, and its fidelity to the real code is a human judgement. An in-source contract is attached to the shipped function (attributes, ghost blocks), so the result is about the real code, at the price of keeping the source inside the verifier's Rust subset and keeping two build configurations. The Microsoft Edge article and the `jpeg2000_rs` repository it describes show one of each (see the credits).
- **Bounded model checking.** Kani runs the real code on symbolic inputs (`kani::any()`), constrained by `kani::assume`, and reports either "no violation for every input within the bound" or a counterexample. Loops need an unwinding bound; data size is bounded by the harness. A result beyond the bound is not a claim. A harness that over-constrains its inputs can pass vacuously.
- **The trusted base.** What a proof assumes without proving: the verifier and its solver, the library specifications it is given for the standard library, any statement marked as assumed in the source (`assume_specification`, `external_body`), and the Rust compiler. For Kani, CBMC and the stubs and bounds in the harness. `jpeg2000_rs/THREAT_MODEL.md` says so in its own words and its coverage gate rejects such escapes in verified source.

The same property, the descriptor ranges that `close_ranges` returns, stated for each tool. The Verus contract (twin; the in-source diff applies the same contract to the real function, whose body is unchanged):

```rust
#[cfg_attr(verus_keep_ghost, verus_spec(r =>
    ensures r@ == ranges_model(keep),
))]
pub fn close_ranges(keep: Option<RawFd>) -> Vec<(u32, u32)> {
    match keep {
        Some(t) if t > 3 => vec![(3, t as u32 - 1), (t as u32 + 1, u32::MAX)],
        Some(3) => vec![(4, u32::MAX)],
        _ => vec![(3, u32::MAX)],
    }
}
```

`ranges_model` is a `spec fn` in the same file, and a lemma proves, for every descriptor, that no range contains 0, 1, 2 or the kept descriptor and every other descriptor from 3 up is in exactly one range. The Kani harness for the same function, appended to the source file under `#[cfg(kani)]` (no non-test code changes):

```rust
#[kani::proof]
#[kani::unwind(3)]
fn c3_close_ranges() {
    let keep: Option<i32> = kani::any();
    let fd: u32 = kani::any();
    let ranges = close_ranges(keep);
    assert!(ranges.len() <= 2, "C3 at most two ranges");
    let mut hits = 0u32;
    for &(lo, hi) in ranges.iter() {
        assert!(lo <= hi, "C3 each range is ordered");
        if lo <= fd && fd <= hi {
            hits += 1;
        }
    }
    let kept = matches!(keep, Some(t) if t >= 3 && t as u32 == fd);
    if fd < 3 || kept {
        assert!(hits == 0, "C3 stdio and the kept descriptor are never closed");
    } else {
        assert!(hits == 1, "C3 every other descriptor is closed by exactly one range");
    }
}
```

Both state the property for every `Option<i32>` and every descriptor. Verus states it as a lemma about a model plus equality of the result with the model; Kani states it as assertions over the real function's output. Neither tool needed a bound on the inputs here; Kani's unwinding bound (3) covers the loop over at most two ranges in full.

## The approaches compared

The Verus row and the Kani row are measured in the pilot. Every other row is documentation-only: from the tool's published documentation or general knowledge, none was installed or run here, so treat them as pointers to check. The labels follow [survey/tools.md](survey/tools.md).

| Approach (tool) | What it establishes | Needs a twin, annotations or harnesses | Bounded or unbounded | Basis |
| --- | --- | --- | --- | --- |
| Deductive, SMT-based (Verus) | The stated contract for all inputs the contract covers, relative to its assumptions and the trusted base | Annotations in source (in-source), or a separate twin; ghost and proof code for what the solver does not find itself | Unbounded over the stated domain | Measured in the pilot, plus the article and `jpeg2000_rs` |
| Bounded model checking (Kani) | No violation of the harness assertions for every input within the bound | Harnesses only; the real crate by path, or a `cfg(kani)` module where the code is private; stubs for unsupported calls | Bounded (input shapes, unwinding), except where no bound was needed (`close_ranges`, `teardown_for`) | Measured in the pilot |
| Deductive, Why3 or Viper (Creusot, Prusti) | Same shape as Verus, different encodings and trust bases | Annotations in source | Unbounded over the stated domain | Documentation only; not installed |
| Refinement types (Flux) | Type-level predicates (ranges, lengths, indices) | Signature annotations | Unbounded | Documentation only; not installed |
| Translation to a proof assistant (Aeneas, hax) | Properties proved interactively on a pure translation | A proof in the assistant; restricted Rust subset | Unbounded | Documentation only; not installed |
| Miri | No undefined behaviour on the executions exercised | Tests to execute | Bounded by the tests run | Documentation only |
| Fuzzing (`cargo-fuzz`, `bolero`) | No crash found in the explored input space | A fuzz target | Bounded by the run | Earlier survey |
| Property testing (proptest, Hegel, fast-check, Hypothesis) | The property held for the generated cases, with shrunk counterexamples | A generator and a property | Bounded by the case budget | The property-testing investigations |
| C (Frama-C/WP, CBMC) | As the Rust rows, for C | ACSL annotations, or harnesses | Unbounded (Frama-C/WP), bounded (CBMC) | General knowledge |
| Shell, Perl, TypeScript, Python | Nothing practical at the proof level; runtime contracts and property tests only | n/a | n/a | General knowledge |

Twins versus in-source contracts, in one table (from the survey's reading of the article and `jpeg2000_rs`, and the pilot):

| | Twin | In-source contract |
| --- | --- | --- |
| What is verified | A separate simplified model of the logic | The shipped function |
| Touches production code | No | Yes: attributes, ghost blocks, verifier-only items |
| Subset restrictions on production code | None | Production code must fit the verifier's Rust subset or be cut out |
| Drift | Twin and code can diverge; nothing catches it unless checked | Contract stops verifying when the code changes incompatibly |
| Pilot examples | `twins/c1_codec.rs`, `twins/c2_machine.rs`, `twins/c3_close_ranges.rs`, `twins/c4_worker.rs` | `in-source/c2-machine.diff` (117 lines added, 10 removed), `in-source/c3-close-ranges.diff` (53 added) |

## Contract classes, each with a fleet example

Anchors are `repo/path:line` of the function under test as surveyed; each was read by the surveys at the commit they name and none was re-checked by running anything. Examples marked *pilot* were run.

| Class | What it states | Fleet example |
| --- | --- | --- |
| Bounds and framing | A length field is checked, then used in an index or an allocation; the check holds for every value | `crucible-dev-env/crates/crucible-greetd/src/codec.rs:152` (`read_message`): `TooLarge` without allocating the body when the prefix exceeds 65,536, otherwise exactly that many bytes. *Pilot*, twin (Verus) and real crate (Kani, bounded). `crucible-datapad/crates/feeds/src/http.rs:199` (`decode_chunked`) and `crucible-term/crates/crucible-term/src/wire.rs:283` (`decode`) are the same shape |
| State machines | Which event may emit which request, from which state | `crucible-dev-env/crates/crucible-greetd/src/machine.rs:109` (`LoginMachine::handle`) and `:142` (`on_auth_response`): `StartSession` only from `Authenticating` on `Success`. *Pilot*, real source (both tools). `crucible-dev-env/crates/crucible-login/src/daemon/session.rs:65` (`start_session`) is the daemon-level gate, not piloted |
| Arithmetic and ranges | Results lie in a range, no overflow, a partition of a range | `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:103` (`close_ranges`). *Pilot*, real source (both tools). `crucible-datapad/crates/screen/src/abi.rs:209` (`check_geometry`) and `inference-engine/sidecar/rs/src/protocol.rs:550` (`clamp_usage`) are candidates |
| Ordering of effects | Effect B happens only after effect A, modelled as a ghost log | `crucible-dev-env/crates/crucible-login/src/worker/process.rs:125` (`serve`), `:181` (`serve_open`), `:61` (`teardown_for`): a spawn only after a successful `pam_open_session`. *Pilot*: twin (Verus), `teardown_for` only on the real code (Kani). `crucible-term/crates/crucible-term/src/identity.rs:80` (`open_in_order`) is the cleanest trait-ordering example, not piloted |
| A check that justifies an `unsafe` block or an unchecked operation elsewhere | A cross-function obligation | `crucible-datapad/crates/screen/src/abi.rs:209` (`check_geometry`) justifies `crucible-datapad/crates/screen/src/fb.rs:85` (`from_raw_parts_mut`); `crucible-datapad/crates/ui/src/reader/pgm.rs:13` (`parse_pgm`) justifies the unchecked product in `:29` (`draw_image`). A property test cannot record such an obligation |
| `unsafe` preconditions | A guard before an FFI call bounds what the kernel may write | `crucible-datapad/crates/evdev/src/lib.rs:51` (`ioctl_read`): statable on the real source with the `ioctl` as an assumed external; the assumption is the part that cannot be checked |
| Data-structure invariants across operations | A layout invariant holds after every operation | `semsearch/crates/semsearch/src/vector.rs:91` (`Codes`), `:111` (`insert`), `:122` (`remove`): `bits.len() == rowids.len() * words`. A stateful property test first, a verifier second |
| Confinement predicates | An accepted path or key cannot leave a directory | `crucible-vault/crates/cv-vault/src/path.rs:11` (`validate_rel_path`), `crucible-term/crates/crucible-term/src/daemon/store.rs:89` (`valid_key`): lexical only; the survey judges a property test or an exhaustive check enough |
| Secret handling and information flow | A secret never reaches an output it should not | `inference-engine/router/gateway/src/relay/upstream.rs:161` (`upstream_headers`): neither tool states information flow directly; a differential property test with marker values is the proportionate check |

## Per repo

For each repo: the top candidates, and a concrete first step. The first step is the survey's recommendation restated; none was run unless marked pilot. Full ranked lists with what blocks a verifier are in [survey/crucible.md](survey/crucible.md) and [survey/others.md](survey/others.md). A statement about what a verifier would handle for code that was not piloted is from general knowledge, unverified here.

- **`crucible-dev-env`** (surveyed at `cd2df19`). Top candidates: `crucible-dev-env/crates/crucible-greetd/src/codec.rs:152` (`read_message`), `crucible-dev-env/crates/crucible-greetd/src/machine.rs:109` (`handle`), `crucible-dev-env/crates/crucible-login/src/worker/process.rs:125` (`serve`), `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:103` (`close_ranges`), `crucible-dev-env/crates/crucible-login/src/daemon/session.rs:65` (`start_session`). First step: decide the writer/reader length disagreement (cap the writer at the reader's limit, or raise the reader's), then keep the Kani harnesses for `read_message` and the login machine as a gate, since they needed no change to the target. The survey ranks `start_session` high value, high cost as a proof, and low-to-medium as a sequence test against the repo's existing fake `Backend` and `Vt`; start there. Not worth a contract: `crucible-dev-env/crates/crucible-compositor/src/persist/ipc/mod.rs:42` (`admit_request`, the type system already gives the guarantee), the IPC line and field codecs (property tests), the privilege drop at `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:137` (`spawn_user`, an integration test under the real privilege).
- **`crucible-term`** (`c6513f4`). Top candidate: `crucible-term/crates/crucible-term/src/wire.rs:283` (`decode`), `:235` (`decode_body`), `:225` (`R::count`), `:192` (`R::take`), rated medium-high; a reader over a byte slice is a good verifier shape and "never allocates more than the input can hold" is hard to test and easy to state. First step: the property test of round-trip and totality, then a Kani harness on `R::take` and `R::count` if the allocation bound is wanted for every input. `crucible-term/crates/crucible-term/src/identity.rs:80` (`open_in_order`) is the learning example for trait specifications.
- **`crucible-tui`** (`d77259e`). A poor fit: no `unsafe`, ports of JavaScript functions where differential oracles apply. The one lesson is `crucible-tui/crates/mdview/src/ansi.rs:231` (`sanitize_href`): a proof checks the code against its stated list of stripped characters, not that the list is enough, so review of the specification is the cost. First step: settle by reading `crucible-tui/crates/mdview/src/render.rs:303` (`render`) whether raw escape bytes in document text reach the terminal, before writing any contract.
- **`crucible-vault`** (`e8ff9395`). Best contract-shaped candidate is `crucible-vault/crates/cv-vault/src/path.rs:11` (`validate_rel_path`), and it is lexical only. First step: the property test the earlier survey proposes; a symlink integration test for `crucible-vault/crates/cv-vault/src/fs.rs:135` (`write_target`) and `:168` (`read`), which no source-level verifier sees.
- **`crucible-datapad`** (`15cc126`). The best arithmetic contracts in the fleet. First step: state `crucible-datapad/crates/screen/src/abi.rs:209` (`check_geometry`) with `crucible-datapad/crates/screen/src/surface.rs:70` (`copy_rect`), modelling `usize` at the device width (32 bits), with the `mmap` result as an assumption; and a unit test of `crucible-datapad/crates/feeds/src/http.rs:199` (`decode_chunked`) at a `u32`-width build for the two largest chunk sizes (see the hypothesis below). Also candidates: `crucible-datapad/crates/feed/src/books/zip.rs:39` (`Zip::open`) and `:101` (`Zip::read`) as a twin or a byte-flip property test, `crucible-datapad/crates/evdev/src/lib.rs:51` (`ioctl_read`), `crucible-datapad/crates/ui/src/reader/pgm.rs:13` (`parse_pgm`).
- **`inference-engine`** (`db65a1e`). If one contract is attempted, `inference-engine/sidecar/rs/src/protocol.rs:550` (`clamp_usage`): pure and numeric; the verifier's extra value is "no overflow for every `u64`", with a medium call (a property test covers it to sampled depth; the `u128` multiply-and-divide is costly for a bit-level solver, which was not measured). First step: the property test, then a Kani harness. The most security-relevant contract, `inference-engine/router/gateway/src/relay/upstream.rs:161` (`upstream_headers`), is a test target, not a verifier target.
- **`scripts`** (`dbf1d9d`). Mostly Perl and shell, where nothing practical exists. First step: a bounded model check of `scripts/tools/build_system/parts/string.c:266` (`path_join_`) in C with CBMC, the only candidate where a verifier family fits and the function is small and pure (the vendored code is third-party, so the output is a report). For `scripts/util/debian-maintenance/debian-maintenance.pl:255` (`select_protected_kernels`) and `scripts/util/cache-prune/perl/CachePrune/Actions.pm:119` (`guarded_remove`): a runtime assertion plus the property tests the earlier guide proposes.
- **`semsearch`** (`17b39b5`). Best candidate: `semsearch/crates/semsearch/src/vector.rs:91` (`Codes`), the layout invariant. First step: promote the `debug_assert_eq!` at `semsearch/crates/semsearch/src/vector.rs:112` to a returned error, add `checked_mul` and a bound on the embedding dimension at `semsearch/crates/semsearch/src/store.rs:235`, then a model-based test, with a verifier second.
- **`research`** (`09c9740`). No verifier target. If anything is touched: the representation change in `research/scripts/lib/measure-run.mjs:82` (`parseProtocol`, below).

## The greeter pilot

The target is `crucible-dev-env` at commit `cd2df19e6eca85b282db8fddd29882abd83d78d1`, crates `crucible-greetd` and `crucible-login`, staged from git objects into a disposable directory; the checkout is mounted read-only. Four contracts, in plain words:

- **C1, frame bound** (`crucible-greetd/src/codec.rs:152` `read_message`). A 4-byte length prefix is read; the length is accepted exactly when it is at most `MAX_MESSAGE_LEN` (65,536); an accepted length is exactly the number of body bytes requested next; on rejection only the header was read and no body buffer was allocated. Also: "anything `write_message` accepts, `read_message` accepts".
- **C2, login state machine** (`crucible-greetd/src/machine.rs:109` `handle`, `:142` `on_auth_response`). `StartSession` is emitted only from `Authenticating` on a `Success` reply, followed by `Starting`, carrying the configured command; `Done` only from `Starting` on `Success`; an answer leaves only from `Prompt` on `Submit`, carrying exactly the submitted secret; an event with no match arm emits nothing and changes nothing.
- **C3, descriptor ranges** (`crucible-login/src/worker/spawn.rs:103` `close_ranges`). No range contains 0, 1, 2 or the kept descriptor, every other descriptor from 3 up is in exactly one range, no arithmetic overflow.
- **C4, worker request ordering** (`crucible-login/src/worker/process.rs:125` `serve`, `:181` `serve_open`, `:61` `teardown_for`). A spawn only after a successful `pam_open_session`; at most one spawned process; the phase never moves backwards; `teardown_for` closes the session only if it deletes credentials, and each exactly when the phase says so.

A fifth contract from the survey (the datagram truncation check in `crucible-login/src/worker/proto.rs:151` `recv_flags`) was not attempted.

### Per-property outcomes

| Contract | Verus (unbounded) | Kani (bounded where stated) |
| --- | --- | --- |
| C1 | Twin verified (`9 verified, 0 errors`). Real source: not accepted by Verus (`std::io::Read::read_exact` is not supported), no real-source artifact | Real `read_message`, no twin. Above-cap refusal proved for every 4-byte prefix above 65,536 on a reader holding the prefix plus one byte; within-cap acceptance proved for every prefix from 1 to 65,536 on a stream that ends after the header; decoding of one concrete frame proved with the real `serde_json`; `serde_json::from_slice` stubbed as unreachable on the symbolic paths |
| C2 | Twin verified (`6 verified, 0 errors`); real source verified with an in-source diff (`16 verified, 0 errors`), assuming the derived `Clone` of the state returns an equal value | Real crate by public API, no twin, no source change. Proved for every sequence of 3 events from the initial state, with fixed strings (secret `"u"` or `"pw"`, text `"p"`, description `"d"`); did not finish at 4 events within 300 s in a trial run |
| C3 | Twin verified (`2 verified, 0 errors`); real source verified with an in-source diff (`2 verified, 0 errors`) | Proved for every `Option<i32>` and every `u32` descriptor, unwind 3, through a `cfg(kani)` module appended to the private source file (28 lines added) |
| C4 | Twin verified (`6 verified, 0 errors`). Real `serve`: not attempted (needs specifications for every `Pam` method and the socket calls) | `teardown_for` proved for every phase through a `cfg(kani)` module (33 lines added). Real `serve`: Kani reports `call to foreign "C" function \`pam_start\` is not currently supported by Kani`; the twin is in Verus syntax and was not run under Kani |

Seeded defects: each tool rejected every mutant it was given, after reaching its result line, by a property failure and not a build or tool failure. Verus (9): the cap removed and the cap off by one (C1 twin), the machine moving to `Starting` on an auth message and emitting `StartSession` from `Prompt` (twin and real source each), the first range ending at `t` instead of `t - 1` (twin and real source), a spawn accepted before `pam_open_session` (C4 twin). Kani (6): the same C1 pair, the same two C2 defects (real crate), the same C3 off-by-one, and credentials no longer deleted for `CredEstablished` in `teardown_for`. The statement "anything the writer accepts, the reader accepts" was rejected by both tools (it is false, see Findings).

### Obstacles

Each has a reproduction in `pilot/obstacles/`, run by the pilot command, which checks that the named error still appears.

- **Generic I/O (C1, Verus).** `read_message` is generic over `R: Read`, calls `Read::read_exact`, decodes with `u32::from_ne_bytes`, and wraps `io::Error`; `vstd` (Verus's standard library specification crate) specifies none of them. Stating C1 on the real function needs assumed specifications for all three plus `serde_json::from_slice`, making the proof conditional on them; it was not done, so C1 has a twin only.
- **Derived `Clone` without a specification (C2, Verus).** A derived `Clone` on an enum with a `String` field gets no specification, so after `self.state.clone()` the verifier knows nothing about the value. The in-source diff marks the derive external and assumes the clone equals its source. That assumption is the one trusted statement in the C2 real-source proof.
- **Private fields in a public contract (C2, Verus).** A postcondition of the public `handle` cannot name the private `state` field; the workaround is `pub closed spec fn` accessors.
- **`Vec` equality after `clone` (Verus).** After `Vec::clone`, `vstd` gives equality of the views, not of the vectors; it holds for `Vec<u8>` as much as `Vec<String>`. State it as `cmd@ == pre.cmd@`.
- **The `Pam` handle and socket I/O (C4 on the real `serve`, both tools).** Verus would need a specification of every `Pam` method and socket call, all assumed; Kani stops at the foreign function `pam_start`.
- **Kani and `serde_json` (C1).** Without a stub, the first attempt was still inside `serde_json`'s number parsing when the 600 s limit ran out; CBMC does not drop the decode path just because its guard is unsatisfiable on those paths. The three symbolic C1 harnesses stub `serde_json::from_slice` as unreachable (which also checks that the decoder is never reached there); one harness runs the real decoder on one concrete frame.
- **Smaller Verus frictions.** The crate's own `View` struct shadows `vstd`'s `View` trait inside `machine.rs`; `on_auth_response` needed a precondition (`Authenticating`) because as a standalone function its info/error arm keeps whatever state it was called in; `#[verus_verify]` on a whole `impl` clashes with per-function `verus_spec`; a returned-value name equal to a parameter name is an error; and this release requires `final(self)` or `old(self)` around a `&mut self` parameter in a postcondition.

### Comparison per property

Line counts are physical lines of the files or diffs named, comments included; the Kani counts are the harness lines only (not the 103-line `kani.mk` or the 15-line `kani.Dockerfile`).

| Contract | Twin needed | Bound | Lines written | Changes to the target source | Not reached |
| --- | --- | --- | --- | --- | --- |
| C1 | Verus: yes (`twins/c1_codec.rs`, 147 lines). Kani: no | Verus: none. Kani: none on the prefix; two fixed stream shapes, decoding stubbed | Kani: 82 (the `c1` module of the harness) | Verus: none (twin only). Kani: none | Verus: generic `Read`, `io::Error`, `from_ne_bytes`, `serde_json`. Kani: symbolic `serde_json` decoding |
| C2 | Verus: twin (195 lines) plus the real source. Kani: no | Verus: none (all states, unbounded strings). Kani: 3 events, fixed strings | Verus: 117 added and 10 removed (in-source diff). Kani: 101 | Verus: the diff, with serde gated off and one assumed clone specification. Kani: none | Verus: derived `Clone` (assumed), private fields (accessors). Kani: unbounded strings, sequences longer than 3 |
| C3 | Verus: twin and real function. Kani: no | Neither: inputs unbounded, the loop covered in full | Verus: 53 added. Kani: 28 added | Verus: a `cfg(verus_keep_ghost)` contract and lemma. Kani: a `cfg(kani)` module, needed only because the module is private | Nothing, either tool |
| C4 | Verus: twin (200 lines). Kani: no twin, but only `teardown_for` | `teardown_for`: none | Kani: 33 added (includes the blocker reproduction) | Kani: a `cfg(kani)` module. Verus: none | Both: the real `serve` |

### What each proof assumes and does not establish

- **C1.** The twin assumes the twin is faithful (checked by reading `read_message` beside it; the real crate's `rejects_oversize_length` test covers one oversize length) and that `read_exact` fills the buffer or fails. It says nothing about the real `R: Read` types, `serde_json`, or the real function's code. Kani's result covers every prefix but only the two stream shapes above: body contents and JSON decoding are not covered (apart from the one concrete frame), and partial reads are not, since `&[u8]` delivers everything it has.
- **C2.** On the real source, Verus assumes the derived `State::clone` returns an equal value; `view` and `new` are trusted and unverified, so nothing is proved about what the view shows (in particular not "the view never carries the answer"); `Secret`'s wipe on drop is untouched. Nothing is established about `Session::feed` (the I/O loop), the greetd peer, or liveness. Kani's result covers sequences of at most 3 events from the initial state; events out of `Done` are never checked as a starting state, strings are the fixed values listed, and `Secret`'s wipe is not checked.
- **C3.** Verus assumes `RawFd` is `i32`; it proves the ranges for every `Option<i32>`, including negative values (a negative `keep` closes everything from 3, as the code does). Neither establishes what `close_range(2)` does with the ranges.
- **C4.** The twin assumes its abstraction of `serve` is faithful (checked by reading the real match arms; there is no direct test of `serve` in the repository). It proves the order of a ghost log for every request sequence and every PAM and fork outcome, and says nothing about `recv_req`, the replies, which account the process runs as, or whether a second `pam_setcred(ESTABLISH)` after a failed `pam_open_session` is harmless (an open question in the survey; the twin allows that path, as the code does). Kani's `teardown_for` result says nothing about `serve`.
- **Twin fidelity is a human judgement,** not a mechanical check; the twin files list every known difference in their header comments. Verification ran on a harness, not on the crate: for C2 the harness includes the patched `codec.rs` and `machine.rs` byte for byte as modules; for C3 only the marked region of `spawn.rs`. A whole-crate `cargo verus` run was not attempted.

### Rigor

The outcome counts are from one run of each pilot command after a clean image build, with the Kani outcomes reproduced in two further runs. Timings are *indicative* (the full protocol in the repo's timing method was not applied): see the cost section for the conditions.

## What adoption would cost a repo

- **Toolchain pins.** Verus is a release zip built against one exact Rust toolchain: this pilot used release `0.2026.10.04.426d8b0` with Rust `1.98.1`, the pair the `jpeg2000_rs` CI pins, and the zip's SHA-256 is checked in the image build. The version string is a date plus a commit hash and the surface syntax changed between releases (the `final(self)` requirement), so each bump may mean migration work. Kani is installed with `cargo install --locked kani-verifier --version 0.68.0`, then `cargo kani setup` fetches the Kani 0.68.0 bundle with CBMC 6.11.0 and `nightly-2026-08-21`; the bundle and nightly are pinned only through the `kani-verifier` version. A repo that has its own Rust toolchain pin therefore carries two more.
- **Image size** (per the repo's size method: unpacked layer bytes, with the store and inputs). Verus image: the unpacked layer bytes reported by `docker history --human=false` sum to 3,296,292,864 bytes (about 3.3 GB). Kani image: 2,177,323,008 bytes (about 2.2 GB). Each is measured after a clean build (`docker compose build --no-cache`), image store: Docker with the containerd snapshotter (overlayfs), including the base image layers, inputs as listed in the setup section.
- **Gate time, *indicative*.** Verus: each verifying artifact run 3 times with `verus <file>` inside the container, on one x86-64 desktop host, untuned and shared (24 hardware threads), timed with `date +%s%N` around the call: C1 twin 677 to 707 ms; C2 twin 472 to 502 ms; C3 twin 506 to 584 ms; C4 twin 490 to 499 ms; C2 real source 545 to 561 ms; C3 real source 482 to 499 ms. Most of that is verifier start-up; rejections were not timed. Kani: Kani's own `Verification Time` line (the CBMC phase only; compilation is extra) from 3 runs of `docker compose run --rm kani make -f kani.mk all` on the same host class: `c1_reject_above_cap` 0.97 to 1.06 s; `c1_accept_within_cap` 0.87 to 0.88 s; `c1_concrete_frame_decodes` 1.93 to 2.14 s; `c2_machine_safety` (3 events) 211.2 to 222.4 s; `c3_close_ranges` 0.32 to 0.33 s; `c4_teardown_for` 0.018 to 0.019 s. The two sets of figures measure different things (whole verifier invocation against the solver phase) and are not a comparison of the tools. The C2 harness did not finish at 4 events within 300 s in a trial run, so the bound is 3. No wall time for a full pilot command was recorded.
- **Authoring effort, counted as verifier runs until the artifact verified** (scratch runs included; mutants and obstacles not): C1 twin 6; C2 twin 2 (it reused the in-source contract); C2 in-source 13, plus 2 scratch probes of clone specifications; C3 4; C4 twin 4. For Kani, one harness per property; the C1 harness needed a second attempt (the stub).
- **Drift.** A twin has no mechanical tie to its source; the guard is a reading, a differential test of twin against real function (from general knowledge, not tried here), or moving to an in-source contract. An in-source contract moves drift to the specification: it stops verifying when the code changes incompatibly, but whether it still states the right thing is a human question. The Kani harnesses call the real code, so they stop compiling or start failing when the code changes.
- **In-source diff size.** `c3-close-ranges.diff` adds 53 lines (a model, a lemma, one attribute, two marker comments) around a 7-line function whose body is unchanged. `c2-machine.diff` adds 117 and removes 10 lines against 72 non-blank, non-comment lines of the verified part of `machine.rs`; 32 of the added lines are build plumbing (serde derives and attributes moved under `cfg_attr(not(verus_keep_ghost), ...)`, the codec types gated out of the Verus build, `verus_verify` on each type); no executable statement changed. Neither diff was built with plain Cargo in this pilot, so whether the gated source still compiles and passes its tests unchanged under Cargo was not checked, and an undeclared `verus_keep_ghost` cfg would raise `unexpected_cfgs` warnings. The Kani diffs add 28 and 33 lines under `#[cfg(kani)]` and no non-test code.
- **Who reviews the specification.** The checker proves the code against the statement, not that the statement is the right one; the article says the same and flags the risk when AI writes both sides. Each contract needs a reader who knows what the code is for; in the pilot that review was a person reading the plain-words statements above against the code.
- **Network.** Both image builds download (the Verus release zip, the Rust toolchain; the Kani crate, bundle and nightly). In this pilot the Kani run also fetches the staged crates' registry dependencies at run time, so it needs network access when it runs; the Verus run does not.
- **Scale warning from the reference project.** In `jpeg2000_rs` at `cb2c54a`, `specs/` holds 74,361 lines against 110,470 non-test lines under `src/` (counts of physical lines), plus 8,685 in `proofs/`. A reader sizing adoption from a four-byte header example will underestimate it. The pilot's fully verified items are individual small functions.

## Findings

- **Writer/reader length disagreement in the greeter codec (confirmed, not fixed).** `write_message` accepts any body whose length fits a `u32`; `read_message` refuses lengths above 65,536. On the Verus twin both halves are proved: within the cap they agree, and for every body of 65,537 to 4,294,967,295 bytes the frame the writer emits is refused by the reader. Kani reproduces it on the real `read_message`: any prefix above 65,536 is refused. No counterexample was extracted (any `n > 65,536` meets the failed check). Whether the greeter can produce such a message (a `start_session` with a very long command, or a long PAM message from greetd) was not determined. Reported, not fixed; the target was not modified.
- **`Starting` plus an authentication message is consistent with the contract.** In `Starting` an auth-message reply has no match arm, so the machine emits nothing and stays in `Starting`; the verified no-arm statement says exactly that. Whether it is intended (it looks like a stuck state) is a question for the owner, not a contract violation.
- No other defect was found in the greeter.

Hypotheses from reading, labelled as such: nothing below was run, and each is a place where writing the contract would settle it.

| Hypothesis (from reading, not run) | Where |
| --- | --- |
| `decode_chunked` adds 2 to a chunk size parsed from up to 8 hex digits, unchecked; where `usize` is 32 bits wide and overflow checks are off (the device target in release) the sum wraps for the two largest sizes, the length test does not reject, and a slice with start above end panics, aborting the process. On a 64-bit host the same input is a clean error | `crucible-datapad/crates/feeds/src/http.rs:199`, arithmetic at `:214` |
| `space.dim * 4` is an unchecked `usize` multiplication on a number read from the index file; a corrupt `embedding_dim` could wrap in release and let a short blob pass | `semsearch/crates/semsearch/src/store.rs:235` |
| The keep-set is keyed by package name, the companion purge list by release; two variants of one release installed with the keep boundary between them could put a protected kernel's modules and headers on the purge list | `scripts/util/debian-maintenance/debian-maintenance.pl:255` and `:289` |
| `path_join_` computes `strlen` before the NULL test; `escape` is read uninitialised for a length-0 or length-1 argument; an empty or lone `/` middle argument reads the byte before the string and wraps `l--`. The NULL case was confirmed by a run in the property-testing suspicions investigation, the others not | `scripts/tools/build_system/parts/string.c:266` |
| `getenv("HOME")` passed to `strlen` unchecked; `read_whole_file` has no exit on a zero read and uses an unchecked `ftell` result | `scripts/tools/build_system/parts/fs.c:112` and `:305` |
| `rm -rf //*` if both the base build directory and the subdirectory are empty and `clean_first` is set | `scripts/tools/build_system/parts/init.c:71` |
| The gateway compares its key with ordinary string equality while the sidecar uses a constant-time fold | `inference-engine/router/gateway/src/auth.rs:20` and `inference-engine/sidecar/rs/src/protocol.rs:470` |
| A metric named `constructor` or `__proto__` is mishandled because the result is a plain object | `research/scripts/lib/measure-run.mjs:82` |
| Client-supplied `extra` environment entries come last and can override `HOME`, `PATH` or `XDG_*` for the authenticated user's own session (same trust as the command itself, so not an escalation, but the comment and the contract disagree) | `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:42` |
| The hook is documented as "called once" but runs before every `StartSession` the machine emits | `crucible-dev-env/crates/crucible-greetd/src/lib.rs:52` |
| A long line ending in a newline is parsed despite the cap, which is checked only on the residue | `crucible-dev-env/crates/crucible-compositor/src/ipc/server.rs:267` |
| Between `bind` and `chmod` a socket exists at its creation mode (the peer-credential check is what stops a stranger); same pattern in the vault daemon | `crucible-dev-env/crates/crucible-login/src/daemon/mod.rs:98`, `crucible-dev-env/crates/crucible-login/src/server.rs:57`, `crucible-vault/crates/cv/src/server.rs:31` |
| Editing a symlinked target replaces the link; reads are not confined to the vault | `crucible-tui/crates/jsonedit/src/edit.rs:222`, `crucible-vault/crates/cv-vault/src/fs.rs:168` |
| `set_env_default` is a safe function with an unsafe precondition | `crucible-vault/crates/cv-malloc/src/lib.rs:69` |
| A duplicate member name in an EPUB archive silently replaces an earlier entry | `crucible-datapad/crates/feed/src/books/zip.rs:39` |
| A second `pam_setcred(ESTABLISH)` after a failed `pam_open_session` may not be harmless, depending on the PAM stack | `crucible-dev-env/crates/crucible-login/src/worker/process.rs:181` |

## How this relates to the property-testing investigations

A stated contract is the same artefact as a property: a property test runs it on generated inputs and finds a counterexample or none in the budget; a verifier proves it over all inputs in its domain or reports that it cannot. The property-testing work is in [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/) (the guide, the per-repo survey and a pilot), [property-testing-library-comparison](../property-testing-library-comparison/) (Hegel against proptest and fast-check), [stateful-property-testing](../stateful-property-testing/) (model-based state-machine properties) and [property-testing-guide-suspicions](../property-testing-guide-suspicions/) (confirmation runs of reading-only suspicions). Which properties belong to which technique, as the surveys judge them:

- **Property test first:** round-trip and no-panic halves of codecs, idempotence, differential checks against an oracle (a real shell, a real parser, a reference date library), registries against a naive model, anything whose real risk lives in a dependency or the filesystem. The surveys' verdict on most contracts here is "a property test already covers this".
- **Verifier for what sampling cannot reach:** "for every prefix" bounds, width-sensitive overflow (a 64-bit host cannot sample a 32-bit wraparound), payload-level statements about a state machine (the answer in the request is exactly the submitted one), and cross-function obligations that justify an `unsafe` block.
- **Both:** the length-prefixed decoders. The property test finds the common bug cheaply; the proof or bounded check states the bound for every input.
- **Neither:** system-call traces and process-state effects need an integration test under the real privilege; FFI memory safety needs a sanitizer or Miri run with fault injection.
- **A middle path (from general knowledge, not tried):** a twin plus a differential test of the twin against the real function over generated inputs, which ties the model to the code by running rather than by reading.

## Limits and what was not examined

- C5 (`recv_flags`, the datagram truncation check) was not attempted.
- No whole-crate `cargo verus` run: Verus verified harnesses that include the patched source files as modules, and for C3 only the marked region of one file.
- The gated source was not built under plain Cargo, so the claim "the contracts are erased and the crate builds as before" was not checked.
- The other tools in the comparison (Creusot, Prusti, Flux, Aeneas, hax, Miri, the C tools) were not installed or run; their rows are from documentation or general knowledge.
- The twins were checked against the real code by reading. The C4 twin is in Verus syntax and was not run under Kani.
- Kani's C1 result stubs the JSON decoder on the symbolic paths and covers two stream shapes; C2 is bounded at 3 events with fixed strings; no counterexample was extracted for the length disagreement.
- Every survey anchor and every defect hypothesis is from reading source at the named commits; only the greeter items marked as pilot were run. Statements about what a verifier would handle for code that was not piloted are from general knowledge.
- Authoring effort is a count of verifier runs, not hours; timings are indicative, from one host class.
- During the Kani runs the `crucible-dev-env` checkout showed unrelated modified and untracked files in other crates and a new commit at its HEAD, made by concurrent work; the pilot reads only the git objects of the pinned commit through a read-only mount.

## Setup to reproduce the pilot

Everything the pilot needs, including what the host already had:

- **Host:** x86-64 Linux with Docker and Docker Compose (the Compose file format with `services`, `tmpfs` and bind mounts; versions were not recorded). The Verus release is the x86-64 Linux zip. Results here are from a host with Docker's containerd snapshotter (overlayfs) image store and 24 hardware threads.
- **Source checkout:** a clone of `crucible-dev-env` beside this repository (the Compose file mounts it read-only at the relative path `../../../crucible-dev-env` from the pilot folder), containing the commit `cd2df19e6eca85b282db8fddd29882abd83d78d1`. Only its git objects are read: the pilot runs `git archive` of `crates/crucible-greetd crates/crucible-login Cargo.toml Cargo.lock` at that commit into a tmpfs inside the container, and applies every diff to a fresh copy there.
- **Base image:** `rust:1.99.1-slim-trixie`, pinned by digest `sha256:f6c4a35d21dbb3c89d7a8d056c193e94fc09037f2b58dd858b09c39a47dd02d7`, for both services.
- **Verus image** (`pilot/verus.Dockerfile`): Debian packages `curl unzip ca-certificates git make`; Verus release `0.2026.10.04.426d8b0` (`verus-0.2026.10.04.426d8b0-x86-linux.zip` from the Verus releases page), SHA-256 `624018662868563a7bec0dd07be5e4dd0c3d61124b4b55105765884bf2d4d1a0`, checked during the build; Rust toolchain `1.98.1-x86_64-unknown-linux-gnu` (profile minimal), which `verus --version` reports as its toolchain.
- **Kani image** (`pilot/kani.Dockerfile`): Debian packages `ca-certificates curl git make gcc libc6-dev`; `cargo install --locked kani-verifier --version 0.68.0`, then `cargo kani setup`, which fetches the Kani 0.68.0 bundle with CBMC 6.11.0 and the toolchain `nightly-2026-08-21` (`rustc 1.100.0-nightly (8925ea358 2026-08-20)`).
- **Network:** needed at image build for the base image, the Verus zip, the Rust toolchain, the Kani crate and its bundle; needed at Kani run time for the staged crates' registry dependencies (`serde`, `serde_json`, `thiserror`, `libc`, `tracing`, `tracing-subscriber` and their dependencies at the versions in the staged `Cargo.lock`), fetched into the container's tmpfs. The Verus run needs none.
- **Commands,** from the `pilot/` folder of this investigation. Build clean with `docker compose build --no-cache verus` and `docker compose build --no-cache kani`, then:
  - `docker compose run --rm verus make all` verifies the four twins and the two in-source contracts, applies and checks every mutant and the finding, reproduces every obstacle, prints a summary and exits 0 only if every item matched its expectation. Expected last line: `==== 21 pass, 0 fail`.
  - `docker compose run --rm kani make -f kani.mk all` runs every Kani harness, mutant, finding and blocker reproduction under a 600 s limit per harness. Expected last line: `==== 15 pass, 0 fail`. The C2 harness takes a few minutes (211 to 222 s of solver time in the recorded runs).
- A mutant or finding counts as rejected only when the tool reached its result line and printed the expected failure; a diff that does not apply or a file that no longer compiles is a failure. Tool output goes to a tmpfs in the container; nothing is written to the mounted folders.

## Credits and upstream work

- The Microsoft Edge article "From Bug Hunting to Bug Prevention with Rust and Verus" (published 2026-11-09), https://microsoftedge.github.io/edgevr/posts/From-Bug-Hunting-to-Bug-Prevention-with-Rust-and-Verus/ , and the repository it describes, `microsoft/jpeg2000_rs` (https://github.com/microsoft/jpeg2000_rs, read at commit `cb2c54a`), started this investigation; the twin-versus-in-source distinction and the Verus release pin come from there.
- Verus: https://github.com/verus-lang/verus
- Kani: https://github.com/model-checking/kani (built on CBMC, https://github.com/diffblue/cbmc)
- Creusot: https://github.com/creusot-rs/creusot; Prusti: https://github.com/viperproject/prusti-dev; Flux: https://github.com/flux-rs/flux; Aeneas: https://github.com/AeneasVerif/aeneas; hax: https://github.com/hacspec/hax; Miri: https://github.com/rust-lang/miri; Frama-C: https://frama-c.com (none of these run here)
- The target of the pilot is `crucible-dev-env` (https://github.com/dulrich/crucible-dev-env); the other surveyed repos are named above.
- Working notes: [notes.md](notes.md). Surveys: [tools](survey/tools.md), [crucible repos](survey/crucible.md), [other repos](survey/others.md). Pilot sources: [pilot/Makefile](pilot/Makefile), [pilot/kani.mk](pilot/kani.mk), [pilot/compose.yaml](pilot/compose.yaml), [pilot/verus.Dockerfile](pilot/verus.Dockerfile), [pilot/kani.Dockerfile](pilot/kani.Dockerfile).
