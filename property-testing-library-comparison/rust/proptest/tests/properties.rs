//! The properties that hold on the unmutated targets, at the comparison's 1,000-case budget.
use ptlc_proptest::{Prop, run};

fn green(p: Prop) {
    let o = run(p, 0, 1000);
    assert_eq!(o.status, "pass", "{} -> {:?} {}", p.name(), o.counterexample, o.detail);
}

#[test]
fn url_never_panics() { green(Prop::UrlNeverPanics); }
#[test]
fn url_invariants_hold() { green(Prop::UrlInvariants); }
#[test]
fn action_roundtrip_holds_in_contract() { green(Prop::ActionRoundtrip); }
