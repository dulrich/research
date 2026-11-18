// Obstacle reproduction (C2 on the real source): a derived `Clone` on an enum with a `String`
// field gets no specification, so `handle`'s `match (self.state.clone(), event)` tells the
// verifier nothing about the state it matches on. The in-source diff works around it with
// `verifier::external_derive(Clone)` plus an assumed specification (`assume_specification`).
use vstd::prelude::*;

verus! {

#[derive(Clone)]
pub enum State {
    Username,
    Prompt { text: String, secret: bool },
}

fn clone_is_equal(s: &State) {
    let c = s.clone();
    assert(c == *s);
}

fn main() {}
}
