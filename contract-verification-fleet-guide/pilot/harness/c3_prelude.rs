// Verification harness prelude for the C3 in-source contract. The Makefile appends the region
// between the `verus-extract-begin` and `verus-extract-end` markers of the staged, patched
// crates/crucible-login/src/worker/spawn.rs (the contract and the unchanged `close_ranges`), then
// `fn main() {}`. The rest of spawn.rs (libc, fork and exec code) is not part of the harness.
use vstd::prelude::*;

type RawFd = i32;
