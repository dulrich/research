// Verification harness for the C2 in-source contract. It is copied into the root of a staged,
// patched copy of crucible-dev-env and verified there: the two modules below are the real files
// of the pinned commit with `in-source/c2-machine.diff` applied, included byte for byte.
// `lib.rs` (the `Session` driver, generic over `Read + Write`) and `fake.rs` are left out.
use vstd::prelude::*;

#[path = "crates/crucible-greetd/src/codec.rs"]
pub mod codec;
#[path = "crates/crucible-greetd/src/machine.rs"]
pub mod machine;

fn main() {}
