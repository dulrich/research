// C2 verification twin: the login state machine.
//
// Real anchor (crucible-dev-env at cd2df19): crates/crucible-greetd/src/machine.rs:109
// `LoginMachine::handle` and :142 `on_auth_response`, with the types from
// crates/crucible-greetd/src/codec.rs.
//
// Differences from the real code:
// - `Secret` is a plain tuple struct: no `Drop` (the real one wipes its bytes), no redacting
//   `Debug`, no serde derives; `expose()` is replaced by the field access `text.0`.
// - `Output` carries only `request`; the `view` (prompt text, echo flag, message line) is cut,
//   so nothing here is proved about what the view shows.
// - `State::clone` is written by hand with a proved `ensures r == *self`; the real one is derived.
// - `secret: auth_message_type == AuthMessageType::Secret` is written with `matches!`.
// - `new`, `state` and `view` are not part of the twin.
// The match arms of `handle` and `on_auth_response` are in the same order and with the same
// patterns as the real code (checked by reading them side by side).
use vstd::prelude::*;

verus! {

pub struct Secret(pub String);

pub enum AuthMessageType { Visible, Secret, Info, Error }
pub enum ErrorType { AuthError, Error }

pub enum Request {
    CreateSession { username: String },
    PostAuthMessageResponse { response: Option<Secret> },
    StartSession { cmd: Vec<String>, env: Vec<String> },
    CancelSession,
}

pub enum Response {
    Success,
    Error { error_type: ErrorType, description: String },
    AuthMessage { auth_message_type: AuthMessageType, auth_message: String },
}

pub enum State {
    Username,
    Authenticating,
    Prompt { text: String, secret: bool },
    Starting,
    Cancelling,
    Done,
}

impl Clone for State {
    fn clone(&self) -> (r: Self)
        ensures r == *self,
    {
        match self {
            State::Username => State::Username,
            State::Authenticating => State::Authenticating,
            State::Prompt { text, secret } => State::Prompt { text: text.clone(), secret: *secret },
            State::Starting => State::Starting,
            State::Cancelling => State::Cancelling,
            State::Done => State::Done,
        }
    }
}

pub enum Event { Submit(Secret), Escape, Response(Response) }

pub struct Output { pub request: Option<Request> }

pub struct LoginMachine { pub state: State, pub message: Option<String>, pub cmd: Vec<String> }

pub open spec fn has_arm(s: State, e: Event) -> bool {
    match (s, e) {
        (State::Username, Event::Submit(_)) => true,
        (State::Prompt { .. }, Event::Submit(_)) => true,
        (State::Prompt { .. }, Event::Escape) => true,
        (State::Authenticating, Event::Response(_)) => true,
        (State::Starting, Event::Response(Response::Success)) => true,
        (State::Starting, Event::Response(Response::Error { .. })) => true,
        (State::Cancelling, Event::Response(_)) => true,
        _ => false,
    }
}

pub open spec fn c2_start_only_after_auth(pre: LoginMachine, e: Event, post: LoginMachine, r: Output) -> bool {
    r.request matches Some(Request::StartSession { .. }) ==>
        pre.state is Authenticating && e == Event::Response(Response::Success) && post.state is Starting
}

pub open spec fn c2_start_carries_cmd(pre: LoginMachine, r: Output) -> bool {
    r.request matches Some(Request::StartSession { cmd, .. }) ==> cmd@ == pre.cmd@
}

pub open spec fn c2_done_only_from_starting(pre: LoginMachine, e: Event, post: LoginMachine) -> bool {
    post.state is Done ==> pre.state is Done
        || (pre.state is Starting && e == Event::Response(Response::Success))
}

pub open spec fn c2_answer_only_from_prompt(pre: LoginMachine, e: Event, r: Output) -> bool {
    r.request matches Some(Request::PostAuthMessageResponse { response: Some(a) }) ==>
        pre.state is Prompt && e == Event::Submit(a)
}

pub open spec fn c2_no_arm_no_effect(pre: LoginMachine, e: Event, post: LoginMachine, r: Output) -> bool {
    !has_arm(pre.state, e) ==>
        r.request is None && post.state == pre.state && post.message == pre.message
}

impl LoginMachine {
    fn out(&self, request: Option<Request>) -> (r: Output)
        ensures r.request == request,
    {
        Output { request }
    }

    fn cancel(&mut self, message: Option<String>) -> (r: Output)
        ensures
            final(self).state is Cancelling,
            final(self).cmd == old(self).cmd,
            r.request == Some(Request::CancelSession),
    {
        self.state = State::Cancelling;
        self.message = message;
        self.out(Some(Request::CancelSession))
    }

    pub fn handle(&mut self, event: Event) -> (r: Output)
        ensures
            c2_start_only_after_auth(*old(self), event, *final(self), r),
            c2_start_carries_cmd(*old(self), r),
            c2_done_only_from_starting(*old(self), event, *final(self)),
            c2_answer_only_from_prompt(*old(self), event, r),
            c2_no_arm_no_effect(*old(self), event, *final(self), r),
            final(self).cmd == old(self).cmd,
    {
        match (self.state.clone(), event) {
            (State::Username, Event::Submit(text)) => {
                self.state = State::Authenticating;
                self.message = None;
                self.out(Some(Request::CreateSession { username: text.0.clone() }))
            }
            (State::Prompt { .. }, Event::Submit(answer)) => {
                self.state = State::Authenticating;
                self.message = None;
                self.out(Some(Request::PostAuthMessageResponse { response: Some(answer) }))
            }
            (State::Prompt { .. }, Event::Escape) => self.cancel(None),
            (State::Authenticating, Event::Response(resp)) => self.on_auth_response(resp),
            (State::Starting, Event::Response(Response::Success)) => {
                self.state = State::Done;
                self.out(None)
            }
            (State::Starting, Event::Response(Response::Error { description, .. })) => {
                self.cancel(Some(description))
            }
            (State::Cancelling, Event::Response(_)) => {
                self.state = State::Username;
                self.out(None)
            }
            _ => self.out(None),
        }
    }

    fn on_auth_response(&mut self, resp: Response) -> (r: Output)
        requires old(self).state is Authenticating,
        ensures
            r.request matches Some(Request::StartSession { .. }) ==> resp == Response::Success,
            c2_start_carries_cmd(*old(self), r),
            resp == Response::Success <==> final(self).state is Starting,
            !(final(self).state is Done),
            !(r.request matches Some(Request::PostAuthMessageResponse { response: Some(_) })),
            final(self).cmd == old(self).cmd,
    {
        match resp {
            Response::Success => {
                self.state = State::Starting;
                self.out(Some(Request::StartSession { cmd: self.cmd.clone(), env: Vec::new() }))
            }
            Response::Error { description, .. } => self.cancel(Some(description)),
            Response::AuthMessage { auth_message_type, auth_message } => match auth_message_type {
                AuthMessageType::Visible | AuthMessageType::Secret => {
                    self.state = State::Prompt {
                        text: auth_message,
                        secret: matches!(auth_message_type, AuthMessageType::Secret),
                    };
                    self.out(None)
                }
                AuthMessageType::Info | AuthMessageType::Error => {
                    self.message = Some(auth_message);
                    self.out(Some(Request::PostAuthMessageResponse { response: None }))
                }
            },
        }
    }
}

fn main() {}
}
