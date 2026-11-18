// C3 verification twin: the descriptor ranges closed before exec.
//
// Real anchor (crucible-dev-env at cd2df19): crates/crucible-login/src/worker/spawn.rs:103
// `close_ranges`.
//
// Differences from the real code: none in the function body (copied verbatim, including the
// `t as u32 - 1` and `t as u32 + 1` casts); `RawFd` is declared here as `i32`, as in libc on
// Linux. The contract is stated as equality with a model (`ranges_model`), and the descriptor
// properties are proved once about the model (`lemma_ranges_model`). The same contract is
// applied to the real source by the in-source diff `in-source/c3-close-ranges.diff`.
use vstd::prelude::*;
type RawFd = i32;

verus! {
pub open spec fn in_range(p: (u32, u32), fd: u32) -> bool { p.0 <= fd <= p.1 }
pub open spec fn kept(keep: Option<i32>, fd: u32) -> bool { keep is Some && keep->0 >= 3 && fd == keep->0 as u32 }
pub open spec fn covered_once(s: Seq<(u32, u32)>, fd: u32) -> bool {
    exists|i: int| 0 <= i < s.len() && #[trigger] in_range(s[i], fd)
        && forall|j: int| 0 <= j < s.len() && j != i ==> !#[trigger] in_range(s[j], fd)
}
pub open spec fn covered(s: Seq<(u32, u32)>, fd: u32) -> bool {
    exists|i: int| 0 <= i < s.len() && #[trigger] in_range(s[i], fd)
}
pub open spec fn ranges_model(keep: Option<i32>) -> Seq<(u32, u32)> {
    if keep is Some && keep->0 > 3 { seq![(3u32, (keep->0 - 1) as u32), ((keep->0 + 1) as u32, u32::MAX)] }
    else if keep == Some(3i32) { seq![(4u32, u32::MAX)] }
    else { seq![(3u32, u32::MAX)] }
}
pub proof fn lemma_ranges_model(keep: Option<i32>)
    ensures
        forall|fd: u32| fd < 3 || kept(keep, fd) ==> !#[trigger] covered(ranges_model(keep), fd),
        forall|fd: u32| 3 <= fd && !kept(keep, fd) ==> #[trigger] covered_once(ranges_model(keep), fd),
{
    let s = ranges_model(keep);
    assert forall|fd: u32| 3 <= fd && !kept(keep, fd) implies #[trigger] covered_once(s, fd) by {
        if keep is Some && keep->0 > 3 && fd > keep->0 as u32 {
            assert(in_range(s[1], fd));
        } else {
            assert(in_range(s[0], fd));
        }
    }
}
}

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
fn main() {}
