// Obstacle reproduction (C2 on the real source): `LoginMachine`'s fields are private, so a
// postcondition of the public `handle` cannot name `self.state`. The in-source diff states the
// contract through `pub closed spec fn` accessors (`spec_state`, `spec_message`, `spec_cmd`).
pub mod machine {
    use vstd::prelude::*;

    #[verus_verify]
    pub enum State {
        Authenticating,
        Starting,
    }

    #[verus_verify]
    pub struct LoginMachine {
        state: State,
    }

    impl LoginMachine {
        #[verus_spec(
            ensures final(self).state is Starting,
        )]
        pub fn start(&mut self) {
            self.state = State::Starting;
        }
    }
}

fn main() {}
