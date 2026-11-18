---
created: 2026-11-18
---

# Contract verification in the fleet: working notes

A working log for the investigation. Each step appends a dated entry: what was tried, what was learned.

## 2026-11-18 — feasibility check and tool survey

### Feasibility check (measured before the survey)

In a container built from the official `rust:1.99.1-slim-trixie` image with the Verus release `0.2026.10.04.426d8b0` (the release the `jpeg2000_rs` CI pins) and the Rust toolchain that release requires, `1.98.1`:

- the article's fixed Brotli header twin plus a twin of a 4-byte length-prefix cap check verified (`verification results:: 4 verified, 0 errors`);
- the article's historical subtraction was rejected (`error: possible arithmetic underflow/overflow`, `1 verified, 1 errors`);
- a hand-written twin of the `crucible-dev-env` login state machine (`crates/crucible-greetd/src/machine.rs`, with `String` and `Vec<String>` fields) verified the contract "a start-session request is emitted only from the authenticating state on a success reply" (`4 verified, 0 errors`);
- two frictions: this release requires `final(self)` (or `old(self)`) around a `&mut self` parameter in a postcondition, with a migration note upstream (`source/docs/migration-mut-ref.md` in the Verus repository); and with a conjunct that the emitted command list equals the machine's stored list (the value comes from `Vec<String>::clone`) the postcondition failed, and it verified with that conjunct removed. The cause was not investigated.

The host had no Verus installed; Verus pins its own Rust toolchain.

### What was read

- The article "From Bug Hunting to Bug Prevention with Rust and Verus" (Microsoft Edge, published 2026-11-09): https://microsoftedge.github.io/edgevr/posts/From-Bug-Hunting-to-Bug-Prevention-with-Rust-and-Verus/ . Read from the section "What does it mean to prove code correct?" to the end.
- `microsoft/jpeg2000_rs` at commit `cb2c54a` (https://github.com/microsoft/jpeg2000_rs): `README.md`, `THREAT_MODEL.md`, `Cargo.toml`, `rust-toolchain.toml`, `.github/workflows/verus.yml`, the opening and the reproduction section of `PROOFS.md` (including "Reproduce verification", "Current lifetime-analysis limitation" and the "Concrete contract boundaries" table), `specs/README.md`, the opening of `specs/AUDIT_REFERENCE.md`, the `CONTRIBUTING.md` lines that mention Verus, the escape-rejecting regex in `validation/generate-proof-coverage.py`, `src/lib.rs`, the start of `src/magnitude.rs`, and `parse_plm` in `src/codestream/packet_headers.rs`. The rest of the 7,000-plus-line `PROOFS.md` and of `specs/` was sampled, not read.
- The earlier investigations in this repository, for format and for what to link and not repeat: `property-based-testing-fleet-guide/survey/tools.md` and its `notes.md`; the other three property-testing folders by their README openings.
- Nothing was built or run in this step. Line and occurrence counts are `wc -l`, `find` and `grep -c` over the checkout; each count is labelled in `survey/tools.md` with what it counts.

### What was learned

- The article's Brotli examples are twins, but `jpeg2000_rs` is the other shape: contracts attached to the production source. One source tree serves two builds. Under plain Cargo the contracts are cfg-ed out; under the Verus frontend the `verus_keep_ghost` configuration turns them on. The models and proof support are separate trees (`specs/`, `proofs/`) mounted into the crate only under that configuration.
- The proof-to-code ratio in `jpeg2000_rs` is large: `specs/` holds 74,361 lines against 110,470 non-test lines under `src/` (which itself carries the in-source contracts, and 75,113 more lines in test files), and `proofs/` adds 8,685. A reader sizing adoption from the article's four-byte header example will underestimate this.
- The project's own documents are blunter about limits than the article: no complete bytes-to-image proof, model-to-standard review outstanding, source-function coverage recorded as "not measured", lifetime analysis disabled with `--no-lifetime`, and the verifier, solver and standard-library specifications named as part of the trusted base.
- The project's gate rejects `external_body`, `assume`, `admit`, `assume_specification` and similar escapes in the verified source. The three occurrences of `axiom_`-prefixed names in the source are calls to library lemmas, not new axioms (reading; not checked by running the gate).
- Kani, Creusot, Prusti, Flux, Aeneas and hax were not installed or read from a local source. Their rows in the survey are from documentation or general knowledge and say so.
