# Survey: where a machine-checked contract could pay off in the crucible repos

Read-only survey of five repos at these commits: `crucible-dev-env` at `cd2df19` (https://github.com/dulrich/crucible-dev-env), `crucible-term` at `c6513f4` (https://github.com/dulrich/crucible-term), `crucible-tui` at `d77259e` (https://github.com/dulrich/crucible-tui), `crucible-vault` at `e8ff9395` (https://github.com/dulrich/crucible-vault) and `crucible-datapad` at `15cc126` (no public remote URL is recorded here; the commit hash is the reference). Everything below comes from reading source in those checkouts; nothing was built, run or verified, so a suspected defect is a hypothesis from reading, labelled as such. Anchors are `repo/path:line` and each line was read at the named commit. Statements about what a verifier such as Verus or Kani can or cannot handle (strings, iterators, closures, trait objects, raw pointers, I/O) are from general knowledge, unverified here; they say what would have to be modelled, not what a tool was observed to do.

The question is narrower than the property-testing survey's (`../../property-based-testing-fleet-guide/survey/crucible.md`): which security-sensitive code states a contract that a verifier could check for all inputs, and where is a property test, an exhaustive enumeration or reading enough. That survey's line anchors for the compositor IPC codec are stale at this commit: the request codec now lives in `crucible-dev-env/crates/crucible-compositor/src/ipc/wire.rs`, not `ipc.rs`.

Each candidate has an **Anchor**, a **Contract** in one sentence (precondition, postcondition or state invariant, with failure behaviour where it matters), a **Class** (arithmetic or length safety; parser or codec bound; state-machine safety; privilege or ordering invariant; secret handling; `unsafe` precondition), **Blocks a verifier** (what would have to be modelled or cut out), and a **Value/cost call**. Candidates are ranked best first within each repo. For the greeter crates each candidate also says whether the contract could be stated on the real source or would need a simplified model.

The `unsafe` counts below are the number of source lines that contain the word `unsafe`, by grep. They include `#![allow(unsafe_code)]` attributes, `unsafe extern` blocks, `// SAFETY:` lines that repeat the word, and test code, so they overstate the number of unsafe operations; they locate where to look, nothing more.

## crucible-dev-env

Stack: Rust cargo workspace (layout, keys, config, persist, compositor, the `crucible` binary and, since the login work, `crucible-greetd` and `crucible-login`). The compositor is a Smithay Wayland compositor; the login stack replaces greetd with an in-repo daemon.

### The greeter crates

`crucible-greetd` is the greetd IPC codec (`src/codec.rs`: a native-endian length prefix then a JSON body, a `Secret` string type that is redacted in `Debug` and zeroed on drop), a pure login state machine (`src/machine.rs`: events in, a request to send and a view out, no I/O) and a `Session` driver (`src/lib.rs`) that ties the machine to a stream. Its `unsafe` lines: 2, both in `src/codec.rs` (the volatile-write loop of `wipe` and its lint attribute).

`crucible-login` is the `cde-login` daemon. It is a single-threaded `poll(2)` loop (`src/server.rs`) that accepts a greeter-socket client, checks the peer uid, and drives a `Daemon` (`src/daemon/*.rs`) over two trait seams (`src/seam.rs`: `Backend`, `SessionHandle`, `Child`; `src/vt.rs`: `Vt`) so tests use fakes. Authentication and session start happen in a forked per-session process, the PAM worker (`src/worker/process.rs`), reached over a `SOCK_SEQPACKET` socketpair that carries one `serde_json` document per datagram and optionally a file descriptor over `SCM_RIGHTS` (`src/worker/proto.rs`, `src/worker/client.rs`). The worker holds the PAM handle through hand-written FFI to `libpam` (`src/pam.rs`), and at the end forks and drops privileges to the user account (`src/worker/spawn.rs`). Where the interesting things live:

- Untrusted input: frames on the greeter socket (read by `crucible_greetd::codec::read_message`, peer uid restricted to the greeter account or root), the answers a user types (secrets), and the strings in `start_session`'s `cmd` and `env` (client-supplied, trusted only after authentication). The daemon-to-worker datagrams are trusted-ish but decoded with `deny_unknown_fields`.
- Privilege: the daemon and worker run as root; the user process is spawned after `initgroups`, `setgid`, `setuid` in `spawn_user`. The greeter itself runs as an unprivileged account.
- Secrets: password answers as `Secret` end to end (wiped on drop, copied straight into the `malloc`ed PAM response, the encoded request buffer wiped after sending). The module comments say what is not covered (`serde_json` internal buffers, socket buffers).
- Authentication: `pam_authenticate` and `pam_acct_mgmt` in the worker (`src/worker/process.rs:259`); the daemon keeps the handle in `Auth::Authenticated` and starts a session only from that state.
- `unsafe` lines (greeter-related): `src/pam.rs` 27, `src/worker/proto.rs` 12, `src/server.rs` 11, `src/worker/client.rs` 10, `src/sys.rs` 7, `src/worker/process.rs` 5, `src/worker/spawn.rs` 4, `src/vt.rs` 4, `src/daemon/tests/flow.rs` 2 (test), plus 2 in `crucible-greetd`. The front end `crates/crucible/src/greeter.rs` has none.

Existing tests: `crucible-greetd` has example tests beside the code (oversize length, garbage JSON, wire round trip of every variant, redaction, a multi-prompt flow against a fake greetd); `crucible-login` has fake-backend flow, logout, shutdown and event tests in `src/daemon/tests/`, boundary tests for the datagram budget in `proto.rs`, and one test of the worker's teardown mapping. The worker's request dispatch (`serve`) is not tested directly (it needs a real PAM handle). No property tests, no model checking.

#### G1. Greetd message length bound

- **Anchor:** `crucible-dev-env/crates/crucible-greetd/src/codec.rs:152` (`read_message`), with `:142` (`write_message`) and the cap `MAX_MESSAGE_LEN` at `:10`.
- **Contract:** on any input, `read_message` reads the length prefix, returns `TooLarge` without allocating or reading the body when the announced length exceeds `MAX_MESSAGE_LEN`, and otherwise reads exactly that many bytes; it never panics, and a short stream or bad JSON is an `Err`.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `R: Read` is a generic trait with I/O; `read_exact` needs an external specification; `serde_json::from_slice` with `T: Deserialize` is a dependency whose behaviour would be assumed, not checked; `vec![0u8; len]` allocation.
- **Real source or model:** the framing and the cap can be stated on the real function only by giving `Read::read_exact` and serde an assumed specification, which makes the proof conditional on those assumptions. The cheaper honest form is a twin of the framing (prefix to length to accept or reject, over a byte sequence) that proves the bound and the exact-length read, with the twin's fidelity checked by reading and by the existing oversize test.
- **Value/cost call:** high value per line, because this is the entry point for every frame a greeter client sends and the property is a clean arithmetic bound; modest cost as a twin. A property test of "never panics, never allocates above the cap" is nearly as strong in practice and cheaper, but only a proof or a bounded check states "for every prefix". Reading also finds a spec gap: `write_message` rejects only lengths that do not fit `u32`, not lengths above `MAX_MESSAGE_LEN`, so a message the writer accepts can be refused by the reader (hypothesis from reading; `write_message` is used on both ends of the greeter socket). The contract "anything `write_message` accepts, `read_message` accepts" does not hold as written; whether a legitimate request can reach that size is not determined. No property test covers this; the example test covers only one oversize length.

#### G2. Login state machine: session start only after authentication

- **Anchor:** `crucible-dev-env/crates/crucible-greetd/src/machine.rs:109` (`LoginMachine::handle`) and `:142` (`on_auth_response`).
- **Contract:** `Request::StartSession` is emitted only from state `Authenticating` on `Response::Success`; state `Done` is reached only from `Starting` on `Response::Success`; `Request::PostAuthMessageResponse` with a `Some` answer is emitted only from `Prompt` on `Submit`; any event with no matching arm emits no request and leaves the state unchanged (the `_ => self.out(None)` arm).
- **Class:** state-machine safety (with an ordering invariant).
- **Blocks a verifier:** `String`, `Vec<String>` and `Option<String>` fields cloned with `.clone()` and `to_owned()`; `Secret` carries a `Drop` impl that calls `wipe` (volatile writes); `Output` embeds a `View` of strings; the match is on a cloned `(State, Event)` tuple. Nothing involves I/O, generics, trait objects or async.
- **Real source or model:** could be stated on the real source, with friction: the contract is about which variant is emitted, so the payload strings are irrelevant, and the only real obstacles are string cloning and the `Drop` impl. A twin with the payload strings abstracted to opaque values is the safe floor and cheap, and then the real source is an attempt, not a given.
- **Value/cost call:** high. It is pure, small, and carries the repo's central authentication-ordering claim. Honest alternative: for the variant-level contract the domain is finite (six states by three event kinds by the response variants), so an exhaustive test table is as strong as a proof of the kind-level statement; the proof earns its cost on the payload-level statements ("the answer in the request is exactly the submitted answer", "the view never carries the answer"). Reading also suggests a liveness hole worth a test: in `Starting`, an `AuthMessage` response matches no arm, so the machine stays in `Starting` and returns the username prompt as the view; whether greetd can send that is not determined. No property test covers this; example tests cover the flows.

#### G3. Datagram budget and truncation detection

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/worker/proto.rs:109` (`send`), `:151` (`recv_flags`), `:27` (`MAX_MSG`).
- **Contract:** `send` refuses any datagram longer than `MAX_MSG` before calling `sendmsg`; `recv_flags` returns `Err` for any datagram or control message that the buffers could not hold (`MSG_TRUNC`, `MSG_CTRUNC` or more than `MAX_MSG` bytes) and otherwise returns a buffer no longer than `MAX_MSG`; an fd received alongside an erroring message is closed (its `OwnedFd` is dropped); `MAX_MSG` itself does not overflow `usize`.
- **Class:** arithmetic or length safety, with an `unsafe` precondition (`msghdr` and `iovec` pointers, `CMSG_SPACE`-sized control buffer, `CMSG_DATA` read).
- **Blocks a verifier:** `libc::sendmsg` and `recvmsg` (FFI; their effect on `msg_flags` and the buffer is a kernel contract, from documentation, that a verifier must take as an axiom), raw-pointer arithmetic through `CMSG_FIRSTHDR`/`CMSG_DATA`, `read_unaligned`, `OwnedFd::from_raw_fd`.
- **Real source or model:** not on the real source. A model would take the post-call values `(n, msg_flags, fd present)` as inputs and prove the accept/reject decision and the fd-ownership rule; that covers the arithmetic half and leaves the pointer half to reading. The prose argument in the doc comment on `MAX_MSG` (a re-encoded string is never longer than the peer's escape, so each frame fits) depends on `serde_json`'s encoder and is not checkable here at all.
- **Value/cost call:** medium. The failure mode is already closed (an oversize message is an error, never a truncation, and a failed send aborts that session), so a violation costs availability, not integrity. The module has boundary tests. A bounded check of the decision function is cheap; the pointer walk is the part that would need Miri or a sanitizer run with fault injection, not a contract.

#### G4. PAM response marshalling and release

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/pam.rs:108` (`marshal_responses`), `:142` (`free_responses`, an `unsafe fn` with a documented precondition), `:168` (`conversation`, the `extern "C"` callback).
- **Contract:** `marshal_responses` returns null or a `calloc`ed array of `max(n, 1)` slots in which each non-null `resp` is a `malloc`ed, NUL-terminated copy of the answer with no interior NUL; on any failure it frees every response already stored and the array, exactly once, and returns null; `free_responses` zeroes each answer before freeing and tolerates a null array; `conversation` returns an error code, never unwinds, on a non-positive count, a null argument, an unknown message style or a prompter error.
- **Class:** `unsafe` precondition (with secret handling for the scrub before free).
- **Blocks a verifier:** raw pointers and pointer arithmetic (`arr.add(i)`), `libc::calloc`/`malloc`/`free`/`strlen`, a `repr(C)` struct handed to C, ownership that transfers to `libpam` (the module comment says PAM frees the array, from documentation), the `*mut *const PamMessage` array convention that is Linux-PAM's (from general knowledge, unverified here), and a boxed closure (`Prompter`) inside the callback.
- **Real source or model:** not as a deductive proof on the real source; raw-pointer reasoning with permission tokens is possible in principle (from general knowledge) and expensive. The statements that matter, no double free on the partial-failure path and no leak, are memory-safety properties of a small function and fit a bounded memory-safety tool or an allocator-instrumented test with injected allocation failure better than a hand-written specification.
- **Value/cost call:** this is the densest unsafe code in the greeter (the most `unsafe` lines of any file), so it deserves a check; a proof is the wrong tool. A bounded check or a sanitizer test that fails `malloc` at each slot is the proportionate response. Reading finds no defect: slot `i` is unassigned when the failure path runs, so no resource is freed twice.

#### G5. The worker's request ordering and teardown

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/worker/process.rs:125` (`serve`), `:61` (`teardown_for`), `:181` (`serve_open`).
- **Contract:** in `serve`, a `Spawn` is acted on only when the phase is `Opened`; an `Open` is refused when already `Opened`; a `Step` after authentication is refused; `Spawn` ends the loop (the worker serves at most one user process); `teardown_for` is monotone (`close_session` implies `delete_cred`, and `delete_cred` holds exactly when credentials were established); the user process is spawned for the account PAM reported, not for any name in a request.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** a `Pam` FFI handle, socket I/O in `reply` and `recv_req`, file descriptors, closures with `?` inside `serve_open`, string formatting in the error replies.
- **Real source or model:** needs a model. The dispatch is a small state machine over `(phase, request kind)` whose effects (PAM calls, replies, the spawn) are I/O; a twin that abstracts the effects into a ghost log of events and proves the order of that log is the natural shape. The real `serve` cannot be stated without a model of `Pam`.
- **Value/cost call:** high value (this decides whether a user process can start without an opened PAM session, and it has no direct test), medium cost as a twin. A cheaper partial check exists: `teardown_for` is a three-row pure function that an exhaustive test pins fully. Reading raises one question for the owner: when `pam_open_session` fails after credentials were established, the phase stays `CredEstablished`, a later `Open` is allowed, and it calls `pam_setcred(ESTABLISH)` again; whether a second establish is harmless depends on the PAM stack (from general knowledge, unverified here).

#### G6. The daemon's authentication gate on session start

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/daemon/session.rs:65` (`start_session`), with `crucible-dev-env/crates/crucible-login/src/daemon/requests.rs:34` (`handle`) and `:74` (`post_response`).
- **Contract:** a session reaches `Opening` only from an `Auth::Authenticated` handle taken for this request; in every other auth state the request is answered with an error and the auth state is restored unchanged; while a session is active or a request is in flight, a second `start_session` is refused; the account passed on is the one the worker reported.
- **Class:** state-machine safety (a privilege gate).
- **Blocks a verifier:** `Daemon<B: Backend, V: Vt>` is generic over traits with associated types (`B::Handle`), the states own `OwnedFd` and `Instant`, replies go through a slot written by `self.answer`, and the dispatch spreads over several files that call `drive`.
- **Real source or model:** needs a model: abstract `Auth` and `UserSession` to their variants and prove the transition relation. The trait seams make a different route attractive: a bounded model check, or a randomised sequence test, that drives the real `Daemon` with the existing fake `Backend` and `Vt` over sequences of requests and worker replies, asserting "a session was started only if the previous auth state was `Authenticated`".
- **Value/cost call:** high value, high cost as a proof, low-to-medium cost as a sequence test with the fakes the repo already has. This is the most useful place to compare approaches: a proof states it for every sequence; a stateful property test finds a violation in the sequences it generates and costs far less. No property test exists today; the flow tests are scripted.

#### G7. `Session::feed`: the hook runs before `start_session` is written

- **Anchor:** `crucible-dev-env/crates/crucible-greetd/src/lib.rs:52` (`feed`) with `:37` (`set_before_start`).
- **Contract:** when a hook is set and the machine emits `StartSession`, the hook is called before the request is written; if it returns `false` the request is not written and `feed` returns an I/O error; the hook is not called for any other request; `feed` returns `Ok` only when the machine stops emitting requests.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** `Session<S: Read + Write>` is generic over a stream, the hook is a `Box<dyn FnMut() -> bool + Send>` (a trait object), the loop interleaves `write_message` and `read_message` I/O, and `let ... && let` chains.
- **Real source or model:** needs a model: the hook as a boolean oracle, the stream as a ghost log of writes. Trait objects are the main obstacle.
- **Value/cost call:** low to medium. The ordering is one `if` ahead of one write, the existing tests drive it through a fake greetd, and a model buys little beyond them. The doc comment says the hook is "called once"; the code calls it before every `StartSession` the machine emits, which after a failed start and a retry is more than once (hypothesis from reading; the comment may mean once per start).

#### G8. Closing every descriptor but the one to keep

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:103` (`close_ranges`), used by `close_all` at `:112` and at `crucible-dev-env/crates/crucible-login/src/worker/process.rs:105` and `spawn.rs:161`.
- **Contract:** for `keep = Some(t)` with `t > 3` the result is exactly the two inclusive ranges `[3, t-1]` and `[t+1, u32::MAX]`; for `Some(3)` it is `[4, u32::MAX]`; otherwise `[3, u32::MAX]`; the union therefore covers every descriptor from 3 up except `t`, never touches 0 to 2, never contains `t`, and `t as u32 - 1` and `t as u32 + 1` do not overflow.
- **Class:** arithmetic or length safety (a descriptor-set invariant that protects the user process from inheriting daemon descriptors).
- **Blocks a verifier:** almost nothing: integer casts from `i32` to `u32` and a `vec!` of tuples. The `libc::syscall` that consumes the ranges is outside the function.
- **Real source or model:** could be stated on the real source; the function is pure and tiny.
- **Value/cost call:** best cost-benefit in the greeter and a good first exercise, but the security gain is small: the statement is nearly obvious from reading, and a table of boundary cases (none, 0, 2, 3, 4, `i32::MAX`) in a unit test gives most of the assurance. A proof adds "for every `i32`". The call site guarantees `target_fd >= 3` before this runs (`worker/process.rs:157`), so the `t < 3` arm is defensive.

#### G9. User-process environment precedence

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:42` (`build_env`), with `:69` (`session_pam_env`).
- **Contract:** the result holds at most one entry per key, every entry contains `=`, entries without `=` are dropped, and for each key the surviving value is from the last of the sources in the order PAM environment, account variables, XDG variables, `extra`; no entry of the daemon's own environment is included.
- **Class:** privilege or ordering invariant (precedence).
- **Blocks a verifier:** `Vec<String>` with `split_once`, `retain` with a closure, `format!`, string equality of keys; verifiers are weak on strings and closures.
- **Real source or model:** needs a model over abstract key and value types with a loop invariant "keys are unique", or a property test.
- **Value/cost call:** medium-low as a proof; a generated test (random entry lists, check uniqueness and last-wins against a naive model) covers it completely and cheaply. A point for the owner rather than a verification target: the doc comment on `xdg_entries` says the XDG entries are re-applied "so a PAM module cannot change them", but `extra`, which comes from the greeter client's `start_session` `env`, comes last and can override `HOME`, `PATH` or `XDG_*` for the authenticated user's own session. That is the same trust as the command itself (the client may already choose any command), so it is not an escalation; it is worth stating in the specification so the comment and the contract agree.

#### G10. Secret wipe and redaction

- **Anchor:** `crucible-dev-env/crates/crucible-greetd/src/codec.rs:56` (`wipe`), `:46` (`Drop for Secret`), `:64` (`Debug for Secret`).
- **Contract:** after `wipe(buf)` every byte of `buf` is zero; `Debug` for `Secret`, and so for every type that derives `Debug` over it, never prints the content.
- **Class:** secret handling (with an `unsafe` precondition on the volatile write).
- **Blocks a verifier:** `std::ptr::write_volatile` and `compiler_fence` are outside what a source-level verifier models; what it can check is that the loop assigns zero to each element.
- **Real source or model:** the functional postcondition (all zero) could be stated on the real source; the security claim, that the optimiser keeps the wipe, is a property of the compiler and the generated code, not of the source semantics, and no contract states it.
- **Value/cost call:** not worth a proof. The existing test checks the zeroing and the redaction; the real residual risk is the copies the module comments list as not covered (reallocations, `serde_json` buffers, kernel buffers), which a contract on `wipe` cannot touch. One cheap addition would be a test that every type containing a `Secret` redacts it in `Debug`.

#### G11. Privilege drop in the forked user process

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/worker/spawn.rs:137` (`spawn_user`), the drop sequence at `:214` to `:222`.
- **Contract:** in the child, `initgroups`, `setgid` and `setuid` all succeed before `execve`, then for a non-root account `setuid(0)` must fail and `geteuid()` must not be 0; any failure exits with status 1 without executing; the exec'd uid is that of the account looked up by name.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** `fork`, `setuid` and the other syscalls change process state that no source-level verifier models; the code runs in a forked child under `unsafe`.
- **Real source or model:** no. A model would be a list of calls in order, which restates the code.
- **Value/cost call:** not worth it as a contract. The right check is an integration test that runs the real daemon as root in a container, starts a session and inspects `/proc/<pid>/status` after exec for uid, gid and supplementary groups. Reading notes that `initgroups` is not on the list of async-signal-safe functions (from general knowledge, unverified here) while the surrounding comment says the child calls only async-signal-safe functions; the worker is single-threaded, so in practice this is the usual fork-without-exec caveat, not a defect.

#### G12. Peer check and socket creation

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/daemon/mod.rs:98` (`peer_allowed`), `crucible-dev-env/crates/crucible-login/src/server.rs:57` (`bind_socket`) and `:70` (`peer_uid`).
- **Contract:** a greeter-socket peer is served only when its `SO_PEERCRED` uid is the greeter's or root; the socket ends up owned by the greeter and mode 0600.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** the check is a one-line predicate; the creation order (`bind`, then `chown`, then `chmod`) is a filesystem effect, and the socket-permission semantics are the kernel's.
- **Real source or model:** the predicate could be stated trivially; the ordering cannot.
- **Value/cost call:** not worth it. Reading notes that between `bind` and `chmod` the socket exists with its creation-time mode inside a directory set to 0755, and that the `SO_PEERCRED` check, not the file mode, is what stops a stranger in that window (hypothesis from reading; whether the process umask already closes it is not determined). A test or a `umask` set before `bind` is the remedy, not a contract.

#### G13. Readiness and quit notices on the session channel

- **Anchor:** `crucible-dev-env/crates/crucible-login/src/daemon/mod.rs:104` (`ready_seen`) and `:109` (`quit_seen`), used at `crucible-dev-env/crates/crucible-login/src/daemon/session.rs:11`.
- **Contract:** `ready_seen(buf)` is true exactly when `buf` contains the word `ready`; the daemon becomes ready on that, on end of input, or on a `quit`.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `windows` iterators and slice comparison.
- **Real source or model:** statable, but there is little to state.
- **Value/cost call:** not worth it. The writer is the authenticated user's own session, so the channel is not a privilege boundary; a substring match per read chunk can miss a word split across two reads and can match inside a longer word (hypothesis from reading, harmless for a trusted writer).

### Rest of crucible-dev-env

Where untrusted input and `unsafe` live outside the greeter: the compositor IPC socket (a Unix socket under a directory created with mode 0700, `src/ipc/server.rs:32`; requests are percent-encoded lines parsed by `src/ipc/wire.rs`), the persisted workspace records and the KDL config (parsed by a KDL library, then the repo's own conventions), the key-binding action grammar, and the compositor's glue to Smithay, EGL, DRM and the tty. `unsafe` lines by file (outside the greeter crates): `crucible-compositor/src/login_ready.rs` 12, `crucible-keys/src/action.rs` 8 (the ones at lines 729 to 736 are test-only environment mutation; the rest were not read), `crucible-compositor/src/udev/device.rs` 7 (EGL and GLES constructors, with `// SAFETY:` arguments about object lifetimes), `crucible/src/tty.rs` 6 (signal handling and test code), `crucible-compositor/src/cursor/theme.rs` 4 (environment mutation near the theme loader), `crucible-compositor/src/udev/mod.rs` 3, and one to two in each of `xwayland.rs`, `state.rs`, `screenshot.rs` and `identity_protocol.rs`. The repo has no secrets and no authentication outside the greeter. Little of this is a good verification target: the surface is compositor glue.

#### D1. IPC lock admission

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/persist/ipc/mod.rs:42` (`admit_request`), with `crucible-dev-env/crates/crucible-compositor/src/ipc/wire.rs:85` (`Request::acts`) and `crucible-dev-env/crates/crucible-keys/src/action.rs:363` (`Action::allowed_while_locked`).
- **Contract:** while the session is locked, a request is admitted only if it does not act, or is `exec` (which then passes the action gate, where only `vt-switch` and `set-layout` are allowed); every acting request without that exemption is refused with `session locked`.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** nothing serious: a pure function over an enum with `String` and `PathBuf` payloads, and `matches!`.
- **Value/cost call:** not worth it. `Request::acts` is an exhaustive `match` with no wildcard arm, so adding a variant without classifying it is a compile error, and the test at `persist/ipc/mod.rs` loops over every variant for both lock states. A proof would add only the universal quantification over payloads, which do not influence the result. Worth keeping as a worked example of "the type system already gives the guarantee".

#### D2. IPC request line codec and field codec

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/ipc/wire.rs:105` (`Request::parse`), `:147` (`to_line`), `crucible-dev-env/crates/crucible-persist/src/field.rs:8` (`encode_field`) and `:26` (`decode_field`).
- **Contract:** `decode_field(encode_field(s)) == Some(s)` for every `s`, the encoded form contains none of `%`-unescaped `:`, TAB, LF or CR, and `decode_field` never panics (a `%` not followed by one of the five escapes is `None`); `Request::parse` returns `Ok` or a reason, never a panic.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `str::find`, char-boundary slicing (`rest.get(i + 1..i + 3)` returns `None` off a boundary, which is why it does not panic), `to_ascii_uppercase` and string `match`; verifiers handle UTF-8 `str` partially.
- **Value/cost call:** a property test already covers this as a recommendation, and the suspicion run (`../../property-testing-guide-suspicions/README.md`) confirmed the `root -` sentinel defect by a direct example. A proof would show "no panic" for all strings, but the code already uses `get` for the slice that could panic, so the remaining value is the round-trip, which a property test states at lower cost. Not worth a proof.

#### D3. IPC line cap

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/ipc/server.rs:267` (the `MAX_LINE` check), `:140` (`take_lines`), `:21` (`MAX_LINE`).
- **Contract:** a connection whose buffered, unterminated input exceeds `MAX_LINE` is dropped; no request line longer than `MAX_LINE` is acted on.
- **Class:** parser or codec bound.
- **Blocks a verifier:** calloop callbacks, `Rc<RefCell<..>>`, non-blocking socket reads, the event loop.
- **Value/cost call:** not worth a contract, but reading finds a gap worth a test. The read loop drains the socket until `WouldBlock` before any check, `take_lines` processes every complete line whatever its length, and the cap is tested on the residue after that; so a long line that ends in a newline is parsed, and a peer that writes faster than the loop reads keeps it in the read loop (hypothesis from reading; the socket directory is mode 0700, so the peer is the same user). A socket-level test with an over-long terminated line settles it.

#### D4. Workspace file name codec

- **Anchor:** `crucible-dev-env/crates/crucible-persist/src/store.rs:45` (`encode_file_name`) and `:67` (`decode_file_name`).
- **Contract:** the encoded name never contains `/` or NUL and never starts with `.`, an empty name or one whose encoding exceeds the limit is an error, and decoding the encoding returns the original.
- **Class:** parser or codec bound (path safety).
- **Blocks a verifier:** `chars().enumerate()`, `format!`, `String`.
- **Value/cost call:** a property test already covers this as a recommendation (property-testing survey, candidate 7); a proof adds little. Not worth it. The same character-class validator pattern appears in `crucible-term` (`valid_key`) and `crucible-datapad` (`Cache::path`).

#### D5. Readiness descriptor adoption

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/login_ready.rs:40` (`parse_fd`) and `:56` (`ReadyFd::adopt`).
- **Contract:** `parse_fd` returns `Some(n)` only for a decimal number above stdio; `adopt` takes ownership of the descriptor only after `fcntl` shows it open, and an unopened descriptor is an error that closes nothing.
- **Class:** `unsafe` precondition (`OwnedFd::from_raw_fd` on a number read from the environment).
- **Blocks a verifier:** `OsStr` to `str` conversion and `parse`, libc `fcntl`, ownership of a number the program did not open.
- **Value/cost call:** not worth it. The precondition "no other object owns this descriptor" cannot be checked by `fcntl` (it only shows the number is open), and the value comes from the daemon that started the process, so the trust is in the environment, not in the code.

## crucible-term

Stack: Rust workspace of two crates (`crucible-term-core`: VT session model, snapshot, delta, input encoding; `crucible-term`: daemon, wire protocol, window host, renderer, config, CLI). Untrusted input: the daemon's Unix socket (a hand-written binary frame format, `src/wire.rs`), peer uid restricted to the daemon's own uid (`src/daemon/mod.rs:163`) and the socket directory created with mode 0700 (`src/client.rs:190`); VT byte streams from child programs (parsed by the rio-vt core, a dependency); window identity grants between the daemon and the compositor (`src/identity.rs`). No secrets, no authentication beyond the uid and grant checks. `unsafe` lines: `crucible-term/src/daemon/mod.rs` 6 (adopting an inherited descriptor, `setsid` in a pre-exec hook, `signalfd`), `src/font/fc.rs` 4 (fontconfig FFI), `src/window/term.rs` 2, `src/client.rs` 2, `crucible-term-core/src/pty.rs` 2, `src/identity.rs` 1 (not read; it may be a comment), and two in a test file. The security-sensitive surface is small: one codec, one identity-ordering function, one filename validator.

#### T1. Wire frame decode

- **Anchor:** `crucible-term/crates/crucible-term/src/wire.rs:283` (`decode`), `:235` (`decode_body`), `:225` (`R::count`), `:192` (`R::take`).
- **Contract:** `decode` returns `Err(Oversized)` for a length of zero or above `MAX_FRAME`, `Ok(None)` while the frame is incomplete, and otherwise a message whose consumed length (prefix plus body) does not exceed the buffer; `R::take(n)` returns `Err(Truncated)` when fewer than `n` bytes remain; every list count is rejected unless it is at most the remaining input divided by the smallest item width, so decoding never reserves more elements than the input can hold; trailing bytes after a message are `Err(Trailing)`.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `Vec<u8>`, `OsString::from_vec` (a std extension trait), `String::from_utf8`, a `Msg` enum with owned strings and nested vectors.
- **Value/cost call:** medium-high. A reader struct over a byte slice with `take` and `split_at` is a good shape for a verifier, and "never allocates beyond the input" is a property that is hard to test but easy to state (the `count` guard is its whole justification). The peer is restricted to the same user, so the stake is a crashed daemon, not privilege. A property test of round-trip and totality (property-testing survey, candidate 1) is cheaper and finds the same class of bugs; the proof is justified only if the team wants the allocation bound stated for all inputs. The `count` bound is loose for env pairs (each pair takes at least two length prefixes but the guard divides by the single-item width once), which is safe, not wrong. Not a priority.

#### T2. Open-window identity ordering

- **Anchor:** `crucible-term/crates/crucible-term/src/identity.rs:80` (`open_in_order`), `:46` (`decide`).
- **Contract:** with a grant, the steps run in the order `spawn`, `create_surface`, `bind_surface`, `create_role`, and a failure of `spawn` stops before any surface exists; without a grant `bind_surface` is never called; `decide` refuses an open that carries a grant when no global is present.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** the function is generic over a trait with four associated types (`OpenSteps`); stating the order needs a ghost log in the trait's specification.
- **Value/cost call:** low to medium. Two branches, a recording test double already pins the order in both, and `decide` is a four-row table that an exhaustive test pins. It is nevertheless the cleanest example in the fleet of "a trait whose method order is the contract", and the right shape to learn trait specifications on if the team wants one.

#### T3. Session key as a file name

- **Anchor:** `crucible-term/crates/crucible-term/src/daemon/store.rs:89` (`valid_key`), `:129` (`parse`).
- **Contract:** `valid_key(k)` implies `k` is a non-empty name of letters, digits, `-` and `_`, hence a single safe path component (no `/`, no `.`, so no `..`); `parse` of a record returns an error for a different key, a version mismatch or out-of-range dimensions.
- **Class:** parser or codec bound (path safety).
- **Blocks a verifier:** iterator `all` with a closure over bytes.
- **Value/cost call:** not worth a proof: a three-line predicate that a property test or an exhaustive check over the character class settles.

#### T4. Peer uid rule

- **Anchor:** `crucible-term/crates/crucible-term/src/daemon/mod.rs:163` (`peer_allowed`), used at `:490`.
- **Contract:** the daemon serves a connection only when its peer uid equals the daemon's uid and rejects it when the credentials cannot be read.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** none for the predicate; the credential read is a syscall.
- **Value/cost call:** not worth it: a one-line equality, and a rejection on error is visible in the code.

#### T5. `unsafe` descriptor and signal setup

- **Anchor:** `crucible-term/crates/crucible-term/src/daemon/mod.rs:573` (`OwnedFd::from_raw_fd` on an inherited descriptor named by an environment variable), `:600` (pre-exec `setsid`), `:624` (`signalfd`).
- **Contract:** the adopted descriptor is owned by nothing else; the pre-exec closure calls only async-signal-safe functions; the signal mask is set before any thread starts.
- **Class:** `unsafe` precondition.
- **Blocks a verifier:** syscalls, process-wide state, thread ordering.
- **Value/cost call:** not worth it: whole-program ordering that a source-level verifier does not model; the `// SAFETY:` comments state the preconditions and review is the right tool.

The VT model, snapshot and delta code (`crucible-term-core`) is the highest-value target in this repo for property testing, not for a contract: its fidelity statements ("a restored session reproduces the grid") are about behaviour over an external VT parser that a verifier could not see into.

## crucible-tui

Stack: Rust workspace of three crates (`mdview`, a terminal markdown viewer; `jsonedit`, a visudo-style JSON editor; `ofm`, shared markdown primitives) plus Bun and TypeScript scripts. There is no `unsafe` (the grep finds none in any Rust file), no network, no secrets and no authentication. Untrusted input is the markdown or JSON a user opens, and the text that reaches the terminal. The security-sensitive surface is therefore small: escape-sequence handling for terminal output, the editor's command splitting and the atomic file write. Few candidates, and the repo is mostly a poor fit for contracts: its logic is ports of JavaScript functions where the property-testing survey's differential oracles apply.

#### U1. Hyperlink sanitising

- **Anchor:** `crucible-tui/crates/mdview/src/ansi.rs:231` (`sanitize_href`), `:250` (`link`).
- **Contract:** the output of `sanitize_href` contains none of ESC, BEL and the C1 string terminator, so an OSC 8 sequence built by `link` cannot be ended early by the href.
- **Class:** parser or codec bound (output encoding).
- **Blocks a verifier:** `chars().filter(..).collect::<String>()` is iterator and closure code, which verifiers handle poorly; a twin over a character sequence is easy.
- **Value/cost call:** low as a proof, and a useful lesson about the specification. The code can be checked against its stated list, but the contract is only as strong as the list: other control characters that some terminals treat as aborting an OSC string (CAN and SUB, from general knowledge, unverified here) are not stripped. A verifier checks the code against the contract it is given, not that the contract is enough; the review of the specification is the cost. A property test over strings drawn from all control characters, checked against a terminal emulator's parser, would test sufficiency, which a proof cannot. I did not determine whether raw ESC bytes inside document text reach the terminal unfiltered; that is a larger terminal-injection question than the href, and the first thing to settle by reading `render` (`crucible-tui/crates/mdview/src/render.rs:303`) before writing any contract here.

#### U2. Editor command splitting

- **Anchor:** `crucible-tui/crates/jsonedit/src/edit.rs:51` (`split_shell`), `:144` (`editor_args`).
- **Contract:** for any string built by single-quoting each word of a list and joining with spaces, `split_shell` returns the list; an unterminated quote is an `Err`; no expansion is performed.
- **Class:** parser or codec bound.
- **Blocks a verifier:** a character loop building `String`s and `Vec<String>`.
- **Value/cost call:** a property test already covers this as a recommendation (property-testing survey, candidate 6), including a differential against a POSIX shell, which a verifier cannot do. The editor string comes from the environment and is executed, which makes correctness a safety matter, but the function is small and tested by example. Not worth a proof.

#### U3. Atomic write ordering

- **Anchor:** `crucible-tui/crates/jsonedit/src/edit.rs:222` (`atomic_write`), `:194` (`create_0600`), `:203` (`make_buffer`).
- **Contract:** the replacement file is created exclusively with mode 0600, written and synced, given the original file's mode and best-effort owner before the rename, and the temp file is removed on failure; at no point is a file with content readable at a wider mode than the original.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** the whole function is filesystem I/O; the property is a trace over system calls.
- **Value/cost call:** not worth a contract. A trace is better pinned by an integration test that inspects modes. Reading raises one question: `fs::metadata(target)` follows a symlink, but `rename` replaces the link itself with a regular file, so editing a symlinked target replaces the link (hypothesis from reading; whether the editor is run with elevated rights, as the visudo comparison suggests, was not read).

#### U4. Escape scanner and wrapper

- **Anchor:** `crucible-tui/crates/mdview/src/ansi.rs:177` (`scan`), `crucible-tui/crates/mdview/src/wrap.rs:184` (`wrap_ansi`).
- **Contract:** the spans returned by `scan` partition the input exactly, every slice it takes lies on a character boundary, and `wrap_ansi` loses no visible text.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `char_indices` with `peekable`, `&str` slicing at computed byte offsets, closures passed to a walker.
- **Value/cost call:** low security value (a panic here stops a pager, not a privileged process) and high verifier friction; the property-testing survey's candidate 1 covers it better.

#### U5. Indent repair keeps the document

- **Anchor:** `crucible-tui/crates/jsonedit/src/indent.rs:126` (`reindent`).
- **Contract:** `reindent` changes only leading whitespace of the listed lines, and the result still parses to the same value.
- **Class:** parser or codec bound.
- **Blocks a verifier:** a JSON and JSONC parser dependency; "parses to the same value" needs a model of that parser.
- **Value/cost call:** not worth a proof; the property-testing survey (candidate 7) states the same invariant as a test with a JSON parser as oracle, which is the right tool.

## crucible-vault

Stack: Rust workspace of about eighteen crates; the pure crates (`cv-text`, `cv-note`, `cv-index`, `cv-state`, `cv-protocol` and others) have no async runtime; `cv` is a tokio daemon on a Unix socket (mode 0600, `cv/src/server.rs:31`); `cv-vault` does every filesystem mutation; `cv-providers` calls model APIs with API keys. Untrusted input: note text and frontmatter (user-owned files), paths in requests, JSON-RPC lines on the daemon socket (same-user only), files that a symlink inside the vault points at. Secrets: provider API keys from an environment variable or a file in the user's config directory (`cv-providers/src/secrets.rs`). `unsafe` lines: `cv-malloc/src/lib.rs` 7 (glibc `malloc_trim`, `mallinfo2` and `set_var`; the crate's own comment says it holds the workspace's only `unsafe`), one in a test file and one in `secrets.rs` that is only the word in a test name (`missing_or_unsafe_secret_is_an_error`). The surface is small and mostly I/O; the pure text code is property-testing territory.

#### V1. Vault-relative path validation

- **Anchor:** `crucible-vault/crates/cv-vault/src/path.rs:11` (`validate_rel_path`).
- **Contract:** `Ok` implies the path is non-empty, does not start with `/`, contains no backslash or NUL, has no empty, `.` or `..` segment, no segment starting with the writer's temp prefix, and is not under a skipped folder; so joining it to the root cannot leave the root lexically.
- **Class:** parser or codec bound (path confinement).
- **Blocks a verifier:** `str::split`, `any` with a closure, `contains`, and a call into another crate (`cv_index::is_skipped_path`) that would need its own specification.
- **Value/cost call:** medium as a boundary, but the guarantee is lexical only: it says nothing about symlinks inside the vault, which is a separate function (V2). A property test (property-testing survey, candidate 11) covers the same statement cheaply and checks a real join; a proof of the lexical claim over a segment-sequence twin is feasible and adds "for all strings". A property test already covers this as a recommendation, and the existing example test lists the rejects by hand.

#### V2. Symlinked-note write confinement

- **Anchor:** `crucible-vault/crates/cv-vault/src/fs.rs:135` (`write_target`).
- **Contract:** a write to a symlinked note lands only on a canonical target that is a regular file under the vault root or a configured allowlisted root; a dangling link, a non-file target or an outside target is `LinkWriteRefused` and the link is never replaced.
- **Class:** privilege or ordering invariant (confinement).
- **Blocks a verifier:** the whole function is filesystem effects (`symlink_metadata`, `canonicalize`, `is_file`); the check and the later write are separate steps with the filesystem able to change in between.
- **Value/cost call:** not worth a contract: the logical part is one `starts_with` and a loop, and the real risk, a check-then-use race and what a symlink can do to reads, is exactly what a source-level verifier does not see. Reading notes that `read` (`fs.rs:168`) validates the relative path lexically and then reads through the filesystem with no confinement of the link target (hypothesis from reading; the doc comment promises confinement for writes only). A symlink integration test covering both directions is the right tool.

#### V3. API key resolution: fail closed

- **Anchor:** `crucible-vault/crates/cv-providers/src/secrets.rs:45` (`resolve_api_key`).
- **Contract:** the result is `Ok(None)` only when the provider references neither an environment variable nor a key file; a referenced but missing, blank or unreadable secret is an `Err`, never a silent unauthenticated call; an `api_key_file` must be a bare file name (it equals its own file name and is neither `.` nor `..`), so the key file cannot leave the secrets directory.
- **Class:** secret handling.
- **Blocks a verifier:** `&dyn SecretSource` is a trait object, `Path::file_name` has std semantics over `OsStr`, `trim` and string handling, `std::env` behind the trait.
- **Value/cost call:** medium; a small decision table over a handful of booleans (env named, env set and non-blank, file named, file present), so an exhaustive test pins the failure behaviour as strongly as a proof; a proof adds nothing there. The path half is a property test. Reading also notes the contrast with `crucible-greetd`: the key is a plain `String` with no wipe and no `Debug` redaction, and the file's permissions are not checked (hypothesis from reading; whether `ProviderConfig` or request builders print the key was not read).

#### V4. `set_env_default` is a safe function with an unsafe precondition

- **Anchor:** `crucible-vault/crates/cv-malloc/src/lib.rs:69` (`set_env_default`).
- **Contract:** `std::env::set_var` is called only while no other thread reads or writes the environment (the code's comment: called first in `main`, before any thread exists).
- **Class:** `unsafe` precondition.
- **Blocks a verifier:** thread existence is a whole-program, runtime property; no source-level contract on this function states it.
- **Value/cost call:** not worth a verifier. The function is `pub` and safe, so any caller can violate the precondition in safe code; the sound fix is to mark it `unsafe fn` (or make it private to one caller). The only caller found is `crucible-vault/crates/editor/src/main.rs:156` and `:157`, which meets the precondition by position. Reading only; the editor's startup path was not read in full.

#### V5. Daemon socket and line reader

- **Anchor:** `crucible-vault/crates/cv/src/server.rs:31` (`bind`) and `:120` (`connection`).
- **Contract:** the socket is mode 0600 after `bind`; a stale socket is removed only when no daemon answers.
- **Class:** privilege or ordering invariant.
- **Blocks a verifier:** tokio, async, sockets.
- **Value/cost call:** not worth it. Same create-then-chmod window as the greeter socket (G12), where the parent directory's mode decides exposure; the line reader is tokio's `lines()` with no length cap (hypothesis from reading; the peer is the same user). A test, not a contract.

#### V6. Note frontmatter editing preserves untouched bytes

- **Anchor:** `crucible-vault/crates/cv-note/src/frontmatter.rs:462` (`FrontmatterDoc::set`), `:380` (`set_edit`).
- **Contract:** editing one key leaves the body and every untouched entry byte-identical, and setting a key to its current value changes nothing.
- **Class:** parser or codec bound (data integrity, not security).
- **Blocks a verifier:** a hand-written line scanner over `String` with CRLF, BOM and comment handling.
- **Value/cost call:** a property test already covers this as a recommendation (candidate 3, the highest-value target there); a verifier would need the text model that makes the code hard to write. Not worth a proof; listed because it is where user data is rewritten in place.

## crucible-datapad

Stack: Rust workspace (`datapad` device binary for a jailbroken e-reader, `evdev`, `feeds` HTTP client and cache, `ui`, `feed` host exporter, `screen` framebuffer, `probe`). The device target is a 32-bit soft-float ARM Linux, so `usize` there is as wide as `u32` while host tests run with a wider `usize`; this matters for the arithmetic candidates. The release profile sets `panic = "abort"` and leaves overflow checks at their default, which is off in release (from the manifest). Untrusted input: HTTP responses from feed servers over plain HTTP (the client refuses `https://`), EPUB archives the host exporter unpacks, PGM images, kernel uevent datagrams, evdev events, and the framebuffer driver's geometry values. No secrets beyond an optional bearer token, no authentication. `unsafe` lines (excluding the spike programs kept in the repo's reference material): `crates/screen/src/fb.rs` 7 (framebuffer ioctls, `mmap`, `from_raw_parts_mut`), `crates/datapad/src/uevent.rs` 3, `crates/evdev/src/lib.rs` 2, `crates/datapad/src/lifecycle.rs` 2, `crates/datapad/src/clock.rs` 2, and one each in `crates/feed/src/timeutil.rs`, `crates/feed/src/annotate/mod.rs` and `crates/datapad/src/watchdog.rs`. This repo has the best arithmetic-and-length candidates of the five because it parses untrusted bytes with hand-written bounds on a narrow target.

#### P1. Framebuffer geometry justifies the mapped slice

- **Anchor:** `crucible-datapad/crates/screen/src/abi.rs:209` (`check_geometry`), `crucible-datapad/crates/screen/src/surface.rs:70` (`copy_rect`), `crucible-datapad/crates/screen/src/fb.rs:58` (the `mmap`) and `:85` (`from_raw_parts_mut`).
- **Contract:** if `check_geometry` returns `Ok`, then `line_length >= xres` and `(yoffset + yres) * line_length <= smem_len` (computed in `u64`), so for every rectangle `copy_rect` clips, each destination range `dst[d..d + w]` with `d = base + r * stride + x` lies inside the mapped length; the `u64` product also fits the narrower `usize` indexes because it is bounded by `smem_len`, a `u32`.
- **Class:** arithmetic or length safety, justifying an `unsafe` precondition (the slice length handed to `from_raw_parts_mut`).
- **Blocks a verifier:** `check_geometry` builds error strings with `format!` (cut or wrap them); `mmap` and the ioctls are FFI whose results (`ptr`, `len`) enter the proof as assumptions; `Rect::clip` needs its own contract; the argument holds only if `usize` is modelled at the device width.
- **Value/cost call:** high, the best arithmetic contract in the fleet: a soundness argument for `unsafe` is carried by a check in another function, and a defect would be a write outside the mapping. The pure parts (`check_geometry`, `copy_rect` over a `&mut [u8]` slice) could be stated on the real source once the string formatting is cut; the `mmap` boundary stays an assumption (from documentation of the framebuffer ABI). Bounded model checking of `copy_rect` against `check_geometry` with small symbolic geometry would also work. Nothing covers this by test beyond example geometries in `abi.rs`.

#### P2. HTTP chunked decoding: `size + 2`

- **Anchor:** `crucible-datapad/crates/feeds/src/http.rs:199` (`decode_chunked`), the arithmetic at `:214`; `:151` (`parse_response`).
- **Contract:** `decode_chunked` returns `Ok` or `Err` for any input and never panics; in particular, a chunk size that exceeds the remaining input is `Err("truncated chunk")`.
- **Class:** arithmetic or length safety.
- **Blocks a verifier:** `&[u8]` windows search (`find`), `from_utf8`, `from_str_radix`, closures (`mal`); a verifier needs a twin over byte sequences, and the arithmetic claim needs `usize` at the device width.
- **Value/cost call:** high, and a candidate defect from reading. The size field is limited by a digit-count check (`size_str.len() > 8`), so `size` can reach the largest `u32` value. The guard `p.len() < size + 2 || &p[size..size + 2] != b"\r\n"` adds two without a checked add. Where `usize` is as wide as `u32` (the device target) and overflow checks are off (the release profile), `size + 2` wraps for the two largest `u32` sizes, the length test then does not reject, and the slice expression indexes with a start above its end, which panics; with `panic = "abort"` the process aborts. On a 64-bit host the sum does not overflow and the same input is a clean error. Hypothesis from reading, not run. The server is whatever feed host the device is configured for, over plain HTTP, so a hostile or spoofed server on the network could trigger it. A verifier that checks overflow obligations at the device `usize` width would flag the expression; a unit test with the two sizes on a `u32`-width build confirms it. This is the clearest example in the survey of a contract found by stating it.

#### P3. EPUB archive reader

- **Anchor:** `crucible-datapad/crates/feed/src/books/zip.rs:39` (`Zip::open`), `:101` (`Zip::read`), `:30` and `:34` (`u16le`, `u32le`).
- **Contract:** every index into the archive buffers is in range: the end-of-central-directory search leaves at least the fields read; each central-directory entry is checked to hold the fixed-length header before its fields are read; the central directory and each member are rejected before allocation when they exceed `MAX_CD` or `MAX_MEMBER`; inflation is bounded by `decompress_to_vec_with_limit`; encrypted and Zip64 members are refused.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `File`, `Seek`, `Read` interleaved with parsing, a `HashMap<String, Entry>`, `miniz_oxide` (an external inflate), lossy UTF-8 names.
- **Value/cost call:** medium-high; this is the repo's real untrusted-input parser (host side), written with explicit bounds, and each bound is a clean obligation ("the guard before the read covers the read"). It would need a refactor into pure functions over byte slices to be stated on real source; as it is, a twin is the route. A fuzz or mutation property test (flip bytes of a valid archive, require `Ok` or `Err`, never a panic) covers most of the risk at lower cost. Two points from reading for the owner, both hypotheses: a duplicate member name silently replaces an earlier entry in the map, so a reader that takes the first and this one disagree on content (from general knowledge, such disagreement is a known source of archive confusion); and CRCs are not checked, as the module says.

#### P4. `ioctl_read` guard

- **Anchor:** `crucible-datapad/crates/evdev/src/lib.rs:51` (`ioctl_read`).
- **Contract:** the function calls `ioctl` only for a request whose direction field is exactly read and whose encoded size is at most `buf.len()`; otherwise it returns `-1` without calling; so the kernel writes at most `buf.len()` bytes through the pointer.
- **Class:** `unsafe` precondition.
- **Blocks a verifier:** the `ioctl` call is FFI, and "the kernel writes at most the encoded size" is a kernel ABI fact from documentation, taken as an assumption; the guard itself is pure bit arithmetic on a `u32`.
- **Value/cost call:** medium: a small guard guarding a real unsafe call, statable on the real source with the ioctl as an assumed external. The guard's domain is a `u32`, so a bit-field property test is also cheap, and an existing test checks refusal of oversize and non-read requests. The proof states the guard for all requests; the assumption it rests on is the part that cannot be checked.

#### P5. PGM header and image decode

- **Anchor:** `crucible-datapad/crates/feeds/src/pgm.rs:26` (`header`), `crucible-datapad/crates/ui/src/reader/pgm.rs:13` (`parse_pgm`), `:29` (`draw_image`).
- **Contract:** `header` returns `None` or `(w, h, off)` with `off` no greater than the input length; `parse_pgm` returns `Some` only when `w` and `h` are non-zero and the body holds at least `w * h` bytes, computed with `checked_mul`; `draw_image` slices `data[..w * rows]` with `rows <= h` and an unchecked product, which is in range only because `parse_pgm` already bounded `w * h`.
- **Class:** arithmetic or length safety.
- **Blocks a verifier:** `from_utf8` and `parse` on digit slices, `get`, iterators.
- **Value/cost call:** medium. `parse_pgm` is a good example of correct checked arithmetic; the cross-function obligation (the unchecked product in `draw_image` is justified by the checked one upstream, and holds only for pixels that came through `parse_pgm`) is what a contract would record and a property test cannot. A property test over random headers covers `parse_pgm` itself.

#### P6. URL parsing and header injection

- **Anchor:** `crucible-datapad/crates/feeds/src/http.rs:56` (`parse_url`), `:104` (`request`).
- **Contract:** `Ok((host, port, path))` implies host and path contain no CR or LF (and no whitespace), so the request line and `Host` header built from them cannot be split; a bearer token with a control character is refused before use.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `str` methods with closures (`contains(|c| ..)`), `rsplit_once`.
- **Value/cost call:** low-medium. A property test generating strings with CR, LF and NUL covers it and checks the constructed request, which a proof of `parse_url` alone would not. Reading finds the whitespace test catches CR and LF in the host; other control characters in the host (such as NUL) pass, which does not allow header splitting.

#### P7. Hand-back marker and guarded writes

- **Anchor:** `crucible-datapad/crates/datapad/src/lifecycle.rs:76` (`guard`), `:67` (`guarded_write`), `:92` (`mark_handback`).
- **Contract:** once the hand-back marker exists, neither process writes, creates, renames or deletes anything under the user-visible storage; the write closure runs only if the marker was absent at the check.
- **Class:** state-machine safety (a cross-process invariant).
- **Blocks a verifier:** the state is a file in a temporary directory, the invariant spans two processes and real time; the check and the write are separate (a race).
- **Value/cost call:** not worth it. It is an interleaving property of two processes over a filesystem, not a function contract. The module's own doc comment records that `mark_handback` waits for an in-flight store step for a bounded time and, on expiry, writes the marker anyway, so the invariant is "no new step starts" rather than "no write overlaps the marker", which a test with a stalled store step demonstrates and a contract would have to weaken to state.

#### P8. UDC uevent parsing

- **Anchor:** `crucible-datapad/crates/datapad/src/uevent.rs:72` (`udc_edge`).
- **Contract:** `Some(true)` only for the exact header `online@<udc devpath>`, `Some(false)` only for `offline@` the same devpath, `None` for everything else and for any byte input without a panic.
- **Class:** parser or codec bound.
- **Blocks a verifier:** `split`, `from_utf8`, string `match` with guards.
- **Value/cost call:** not worth it: a total function over a header string, covered by two example tests, and the property test is trivial. The security question is different and unanswered here: whether the receive loop checks that a datagram comes from the kernel and not from another process (from general knowledge, unverified here, sending to that netlink group needs privilege). I did not read the receive loop for the sender check.

## Cross-repo patterns

- **Arithmetic and length bounds in hand-written decoders are the best fit.** The four strongest contracts are of one shape: a length field is checked, then used in an index or allocation (`read_message`, `decode_chunked`, `Zip::read`, `R::count`, the framebuffer geometry). The common failure is a check that is correct on a 64-bit host and wrong at the device width or with an unchecked addition (P2). A verifier that models integer width pays here, and these functions are short and mostly pure.
- **A checked value that justifies an `unsafe` block elsewhere.** `check_geometry` for the mapped slice (P1), `parse_pgm` for `draw_image` (P5), the `target_fd >= 3` check in `serve` for `close_ranges` (G8), `ioctl_read`'s guard (P4). Cross-function obligations of this kind are what a contract records and an example test cannot.
- **Closed state machines over small enums.** `LoginMachine`, the worker's phase, the daemon's auth and session states, `open_in_order`. At variant level the domain is finite, so an exhaustive table test is as strong as a proof; a proof pays only for payload-level statements, and a stateful sequence test against the repo's existing fakes covers the daemon cheaply (G6).
- **Where a type already gives the guarantee.** The exhaustive `match` in `Request::acts` (D1) and the `Secret` type that redacts `Debug` and wipes on drop (G10) put the guarantee in the compiler or a type; a contract restates it.
- **The specification is the cost.** Several contracts are only as strong as their list or their assumptions: the hyperlink blacklist (U1), the kernel's `ioctl` and `recvmsg` behaviour (G3, P1, P4), `serde_json`'s encoder in the datagram budget (G3). A verifier checks code against the contract it is given; the review of the contract is where the effort goes.
- **I/O, FFI and process-state code is out of reach.** `spawn_user`'s privilege drop, socket creation order, symlink confinement, the hand-back marker, the PAM callback pointers (G4, G11, G12, V2, V5, P7): the property is a trace over system calls or an interleaving, and the right tools are integration tests under the real privilege, sanitizers with fault injection, and review of the `// SAFETY:` argument.
- **Strings, iterators, closures, trait objects and generics are where a source-level verifier needs a twin.** `build_env`, `validate_rel_path`, `valid_key`, `sanitize_href`, `Session::feed`, `Daemon<B, V>`. Twins cost the drift between twin and source; a property test runs on the real code.
- **Property tests already recommended cover the round-trip and no-panic halves** of the codecs (IPC lines, the field codec, file names, `split_shell`); a verifier adds "for all inputs" and, for P2, the width-sensitive overflow that sampling on a 64-bit host cannot reach. The suspicion run confirmed several of that survey's defects by direct example; none of the candidates above has been run.
- **Duplicated character-class validators.** `valid_key` (`crucible-term`), `Cache::path` (`crucible-datapad`), `encode_file_name` (`crucible-dev-env`) and `validate_rel_path` (`crucible-vault`) state the same path-safety contract four ways; one exhaustive or generated check over the shared character class would cover all four.
- **Where it does not apply.** Compositor, window and renderer glue, the VT model, generated tables and note text transformations: either there is no security claim to state or the behaviour lives in an external dependency.
