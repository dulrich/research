//! Kani proof harnesses for the greeter's C1 (greetd frame bound) and C2 (login state machine)
//! properties. They call only the public API of the unmodified `crucible-greetd` crate; the
//! crate is the pinned source staged next to this one.

#[cfg(kani)]
mod c1 {
    use crucible_greetd::CodecError;
    use crucible_greetd::codec::{MAX_MESSAGE_LEN, read_message};

    /// Stands in for `serde_json::from_slice` in the symbolic C1 harnesses. On every path those
    /// harnesses explore the decoder must not be reached (refusal, or the body read fails), so the
    /// stub fails if it is: being unreachable is itself checked.
    fn decode_unreachable<'a, T: serde::Deserialize<'a>>(_v: &'a [u8]) -> serde_json::Result<T> {
        unreachable!("C1 the JSON decoder is not reached")
    }

    /// A length above the cap is refused as `TooLarge(len)` after reading only the 4-byte
    /// header: the byte after the header is still unread.
    #[kani::stub(serde_json::from_slice, decode_unreachable)]
    #[kani::proof]
    #[kani::unwind(6)]
    fn c1_reject_above_cap() {
        let head: [u8; 4] = kani::any();
        let len = u32::from_ne_bytes(head) as usize;
        kani::assume(len > MAX_MESSAGE_LEN);
        let input = [head[0], head[1], head[2], head[3], 0x7b];
        let mut r: &[u8] = &input;
        let res = read_message::<_, ()>(&mut r);
        assert!(
            matches!(res, Err(CodecError::TooLarge(n)) if n == len),
            "C1 a length above the cap is refused as TooLarge(len)"
        );
        assert!(r.len() == 1, "C1 on refusal only the header is read");
    }

    /// A length from 1 to the cap is never refused by the cap: the body is requested next
    /// (here the stream ends after the header, so the result is an I/O error).
    #[kani::stub(serde_json::from_slice, decode_unreachable)]
    #[kani::proof]
    #[kani::unwind(6)]
    fn c1_accept_within_cap() {
        let head: [u8; 4] = kani::any();
        let len = u32::from_ne_bytes(head) as usize;
        kani::assume(len >= 1 && len <= MAX_MESSAGE_LEN);
        let mut r: &[u8] = &head;
        let res = read_message::<_, ()>(&mut r);
        assert!(
            matches!(res, Err(CodecError::Io(_))),
            "C1 a length within the cap is accepted and the body is requested"
        );
    }

    /// One concrete frame through the real decoder: `null` with a 4-byte length decodes to `()`.
    #[kani::proof]
    #[kani::unwind(10)]
    fn c1_concrete_frame_decodes() {
        let mut input = 4u32.to_ne_bytes().to_vec();
        input.extend_from_slice(b"null");
        let mut r: &[u8] = &input;
        let res = read_message::<_, ()>(&mut r);
        assert!(res.is_ok(), "C1 a 4-byte null frame decodes");
    }

    /// Finding (expected to fail): `write_message` emits any body length that fits a `u32`
    /// (its `u32::try_from`), so the reader should accept every such prefix. It does not.
    #[kani::stub(serde_json::from_slice, decode_unreachable)]
    #[kani::proof]
    #[kani::unwind(6)]
    fn c1_writer_reader_agree() {
        let n: u32 = kani::any();
        kani::assume(n >= 1); // a zero-length body goes to the decoder; not this question
        let prefix = n.to_ne_bytes();
        let mut r: &[u8] = &prefix;
        let res = read_message::<_, ()>(&mut r);
        assert!(
            !matches!(res, Err(CodecError::TooLarge(_))),
            "C1 every length the writer emits is accepted by the reader"
        );
    }
}

#[cfg(kani)]
mod c2 {
    use crucible_greetd::{
        AuthMessageType, ErrorType, Event, LoginMachine, Request, Response, Secret, State,
    };

    /// Number of events applied from the initial state: the bound. `Done` is first reached on the
    /// third event (Submit, Success, Success), so every transition into every state is checked;
    /// transitions out of `Done` (all `_`) are not.
    const STEPS: usize = 3;

    fn any_event() -> Event {
        let tag: u8 = kani::any();
        match tag {
            0 => Event::Submit(Secret::new(if kani::any() { "u" } else { "pw" })),
            1 => Event::Escape,
            2 => Event::Response(Response::Success),
            3 => Event::Response(Response::Error {
                error_type: if kani::any() { ErrorType::AuthError } else { ErrorType::Error },
                description: String::from("d"),
            }),
            _ => {
                let t: u8 = kani::any();
                let auth_message_type = match t {
                    0 => AuthMessageType::Visible,
                    1 => AuthMessageType::Secret,
                    2 => AuthMessageType::Info,
                    _ => AuthMessageType::Error,
                };
                Event::Response(Response::AuthMessage {
                    auth_message_type,
                    auth_message: String::from("p"),
                })
            }
        }
    }

    /// The (state, event) pairs `handle` has a match arm for; everything else is `_`.
    fn matched(s: &State, e: &Event) -> bool {
        matches!(
            (s, e),
            (State::Username, Event::Submit(_))
                | (State::Prompt { .. }, Event::Submit(_))
                | (State::Prompt { .. }, Event::Escape)
                | (State::Authenticating, Event::Response(_))
                | (State::Starting, Event::Response(Response::Success))
                | (State::Starting, Event::Response(Response::Error { .. }))
                | (State::Cancelling, Event::Response(_))
        )
    }

    /// The C2 obligations after every event of every sequence of `STEPS` events.
    #[kani::proof]
    #[kani::unwind(6)]
    fn c2_machine_safety() {
        let mut m = LoginMachine::new("s");
        for _ in 0..STEPS {
            let pre = m.state().clone();
            let pre_msg = m.view().message;
            let ev = any_event();
            let evc = ev.clone();
            let out = m.handle(ev);
            let post = m.state().clone();
            if let Some(Request::StartSession { cmd, env }) = &out.request {
                assert!(
                    pre == State::Authenticating
                        && evc == Event::Response(Response::Success)
                        && post == State::Starting,
                    "C2 StartSession only from Authenticating on Success, then Starting"
                );
                assert!(
                    cmd.len() == 1 && cmd[0] == "s" && env.is_empty(),
                    "C2 StartSession carries the configured command"
                );
            }
            if post == State::Starting && pre != State::Starting {
                assert!(
                    matches!(out.request, Some(Request::StartSession { .. })),
                    "C2 Starting is entered only with a StartSession request"
                );
            }
            if post == State::Done && pre != State::Done {
                assert!(
                    pre == State::Starting && evc == Event::Response(Response::Success),
                    "C2 Done only from Starting on Success"
                );
            }
            if let Some(Request::PostAuthMessageResponse { response: Some(a) }) = &out.request {
                assert!(
                    matches!(pre, State::Prompt { .. }) && evc == Event::Submit(a.clone()),
                    "C2 an answer leaves only from Prompt on Submit, carrying the submitted secret"
                );
            }
            if !matched(&pre, &evc) {
                assert!(
                    out.request.is_none() && post == pre && m.view().message == pre_msg,
                    "C2 an unmatched event emits nothing and changes nothing"
                );
            }
        }
    }
}
