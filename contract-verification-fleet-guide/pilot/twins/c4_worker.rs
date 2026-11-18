// C4 verification twin: the PAM worker's request ordering after authentication.
//
// Real anchor (crucible-dev-env at cd2df19): crates/crucible-login/src/worker/process.rs:125
// `serve`, :181 `serve_open` and :61 `teardown_for`.
//
// Differences from the real code:
// - Requests arrive as a sequence (`reqs`) instead of from `recv_req` on the socket; running out
//   of requests stands for EOF (`None => return 0`). Undecodable requests and all replies are cut.
// - PAM and the fork are abstracted: `pam_setcred_establish`, `pam_open_session` and
//   `spawn_user` are external functions whose result is arbitrary. `set_tty` and `putenv`
//   (which can fail before `setcred` in the real `serve_open`) are folded into the
//   `pam_setcred_establish` result. A successful `spawn_user` stands for spawn plus `wait_user`,
//   after which `serve` returns; the exit code is not modelled (always 0).
// - The effects are recorded in a ghost event log (`Ev`): credentials established, session
//   opened, a spawn attempt in the phase's VT, a spawned user process.
// - `Req::Spawn` keeps only whether an fd came with the datagram and `target_fd`; `cmd`, `env`,
//   the account and the class are cut, so "the process runs as the account PAM reported" is not
//   stated here.
// - `teardown_for` takes `&Phase` instead of `Phase`; its body is the same three arms.
use vstd::prelude::*;

verus! {

#[derive(PartialEq, Eq)]
pub enum Phase { Authenticated, CredEstablished, Opened { vt: u32 } }

pub struct Teardown { pub close_session: bool, pub delete_cred: bool }

pub enum Req { Close, Step, Open { vt: u32 }, Spawn { fd: bool, target_fd: Option<i32> } }

/// The ghost event log: the PAM and process effects `serve` causes, in order.
pub enum Ev { CredEstablished, SessionOpened, SpawnAttempt { vt: u32 }, Spawned }

pub open spec fn rank(p: Phase) -> nat {
    match p { Phase::Authenticated => 0, Phase::CredEstablished => 1, Phase::Opened { .. } => 2 }
}

pub open spec fn is_opened_ev(e: Ev) -> bool { e is SessionOpened }
pub open spec fn is_cred_ev(e: Ev) -> bool { e is CredEstablished }

/// Some event before index `k` is a successful `pam_open_session`.
pub open spec fn opened_before(log: Seq<Ev>, k: int) -> bool {
    exists|j: int| 0 <= j < k && #[trigger] is_opened_ev(log[j])
}

/// Some event before index `k` is a successful `pam_setcred(ESTABLISH_CRED)`.
pub open spec fn cred_before(log: Seq<Ev>, k: int) -> bool {
    exists|j: int| 0 <= j < k && #[trigger] is_cred_ev(log[j])
}

/// Every spawn attempt comes after a successful `pam_open_session`.
pub open spec fn spawns_after_open(log: Seq<Ev>) -> bool {
    forall|i: int| 0 <= i < log.len() && (#[trigger] log[i] is SpawnAttempt || log[i] is Spawned)
        ==> opened_before(log, i)
}

/// At most one user process: a `Spawned` event is the last event.
pub open spec fn spawned_last(log: Seq<Ev>) -> bool {
    forall|i: int| 0 <= i < log.len() && #[trigger] log[i] is Spawned ==> i == log.len() - 1
}

/// What the phase claims, the log backs.
pub open spec fn phase_backed(p: Phase, log: Seq<Ev>) -> bool {
    &&& (rank(p) >= 1 ==> cred_before(log, log.len() as int))
    &&& (rank(p) == 2 ==> opened_before(log, log.len() as int))
}

/// Appending a non-spawn event keeps every earlier spawn justified.
proof fn lemma_push_keeps_spawns(log: Seq<Ev>, e: Ev)
    requires spawns_after_open(log), !(e is SpawnAttempt), !(e is Spawned),
    ensures spawns_after_open(log.push(e)),
{
    let l = log.push(e);
    assert forall|i: int| 0 <= i < l.len() && (#[trigger] l[i] is SpawnAttempt || l[i] is Spawned)
        implies opened_before(l, i) by {
        assert(log[i] == l[i]);
        let w = choose|j: int| 0 <= j < i && #[trigger] is_opened_ev(log[j]);
        assert(l[w] == log[w]);
        assert(is_opened_ev(l[w]));
    }
}

fn teardown_for(phase: &Phase) -> (t: Teardown)
    ensures
        t.close_session ==> t.delete_cred,
        t.delete_cred <==> rank(*phase) >= 1,
        t.close_session <==> rank(*phase) == 2,
{
    match phase {
        Phase::Authenticated => Teardown { close_session: false, delete_cred: false },
        Phase::CredEstablished => Teardown { close_session: false, delete_cred: true },
        Phase::Opened { .. } => Teardown { close_session: true, delete_cred: true },
    }
}

/// The environment: PAM and fork results are arbitrary (no specification = any value).
#[verifier::external_body]
fn pam_setcred_establish() -> bool { true }
#[verifier::external_body]
fn pam_open_session() -> bool { true }
#[verifier::external_body]
fn spawn_user() -> bool { true }

fn serve_open(vt: u32, phase: &mut Phase, log: &mut Ghost<Seq<Ev>>)
    requires
        !(*old(phase) is Opened),
        phase_backed(*old(phase), old(log)@),
        spawns_after_open(old(log)@),
        spawned_last(old(log)@),
        forall|i: int| 0 <= i < old(log)@.len() ==> !(#[trigger] old(log)@[i] is Spawned),
    ensures
        rank(*final(phase)) >= rank(*old(phase)),
        phase_backed(*final(phase), final(log)@),
        spawns_after_open(final(log)@),
        forall|i: int| 0 <= i < final(log)@.len() ==> !(#[trigger] final(log)@[i] is Spawned),
        old(log)@.len() <= final(log)@.len(),
        forall|i: int| 0 <= i < old(log)@.len() ==> final(log)@[i] == #[trigger] old(log)@[i],
{
    let ghost l0 = log@;
    if !pam_setcred_establish() {
        return;
    }
    proof { lemma_push_keeps_spawns(log@, Ev::CredEstablished); }
    *log = Ghost(log@.push(Ev::CredEstablished));
    *phase = Phase::CredEstablished;
    assert(is_cred_ev(log@[l0.len() as int]));
    assert(forall|i: int| 0 <= i < l0.len() ==> log@[i] == #[trigger] l0[i]);
    if !pam_open_session() {
        return;
    }
    let ghost l1 = log@;
    proof { lemma_push_keeps_spawns(log@, Ev::SessionOpened); }
    *log = Ghost(log@.push(Ev::SessionOpened));
    *phase = Phase::Opened { vt };
    assert(is_opened_ev(log@[l1.len() as int]));
    assert(is_cred_ev(log@[l0.len() as int]));
}

/// Twin of `serve`: the requests arrive as a sequence; returns the exit code.
fn serve(reqs: &Vec<Req>, phase: &mut Phase, log: &mut Ghost<Seq<Ev>>) -> (code: i32)
    requires
        *old(phase) == Phase::Authenticated,
        old(log)@.len() == 0,
    ensures
        phase_backed(*final(phase), final(log)@),
        spawns_after_open(final(log)@),
        spawned_last(final(log)@),
{
    let mut k: usize = 0;
    while k < reqs.len()
        invariant
            phase_backed(*phase, log@),
            spawns_after_open(log@),
            forall|i: int| 0 <= i < log@.len() ==> !(#[trigger] log@[i] is Spawned),
        decreases reqs.len() - k,
    {
        let req = &reqs[k];
        k = k + 1;
        match req {
            Req::Close => return 0,
            Req::Step => {}
            Req::Open { vt } => {
                if !matches!(phase, Phase::Opened { .. }) {
                    serve_open(*vt, phase, log);
                }
            }
            Req::Spawn { fd, target_fd } => {
                let vt = match phase {
                    Phase::Opened { vt } => *vt,
                    _ => continue,
                };
                let ok_extra = match (fd, target_fd) {
                    (true, Some(t)) => *t >= 3,
                    (false, None) => true,
                    _ => false,
                };
                if !ok_extra {
                    continue;
                }
                let ghost l0 = log@;
                proof {
                    let w = choose|j: int| 0 <= j < l0.len() && #[trigger] is_opened_ev(l0[j]);
                    assert(is_opened_ev(l0[w]));
                }
                *log = Ghost(log@.push(Ev::SpawnAttempt { vt }));
                assert(forall|i: int| 0 <= i < l0.len() ==> log@[i] == #[trigger] l0[i]);
                if spawn_user() {
                    let ghost l1 = log@;
                    *log = Ghost(log@.push(Ev::Spawned));
                    assert(forall|i: int| 0 <= i < l1.len() ==> log@[i] == #[trigger] l1[i]);
                    return 0;
                }
            }
        }
    }
    0
}

fn main() {}
}
