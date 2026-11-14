//! Property tests for the `Action` `Display` / `FromStr` round trip in `crucible-keys`,
//! using Hegel for Rust. The real type is used through a path dependency; no source is copied.

use crucible_keys::{Action, NightLightArg};
use crucible_layout::Direction;
use hegel::TestCase;
use hegel::generators as gs;

fn direction(tc: &TestCase) -> Direction {
    tc.draw(gs::sampled_from(vec![
        Direction::Left,
        Direction::Right,
        Direction::Up,
        Direction::Down,
    ]))
}

/// A one-word string: arbitrary text with every whitespace character removed, never empty.
fn word(tc: &TestCase) -> String {
    let mut s: String = tc.draw(gs::text().max_size(12));
    s.retain(|c| !c.is_whitespace());
    if s.is_empty() { "x".to_string() } else { s }
}

/// A command line in the documented grammar: non-empty, no leading or trailing whitespace,
/// arbitrary text (including interior whitespace) otherwise.
fn trimmed_command(tc: &TestCase) -> String {
    let s: String = tc.draw(gs::text().max_size(20));
    let t = s.trim();
    if t.is_empty() { "x".to_string() } else { t.to_string() }
}

/// Every printable action except `vt-switch` (which `FromStr` deliberately does not accept).
/// `in_contract` restricts string payloads to what the grammar can represent.
fn action(tc: &TestCase, in_contract: bool) -> Action {
    let name = |tc: &TestCase| if in_contract { word(tc) } else { tc.draw(gs::text().max_size(8)) };
    let command =
        |tc: &TestCase| if in_contract { trimmed_command(tc) } else { tc.draw(gs::text().max_size(12)) };
    match tc.draw(gs::integers::<u8>().max_value(19)) {
        0 => Action::SetLayout(name(tc)),
        1 => Action::Run(command(tc)),
        2 => Action::RunInTerminal(command(tc)),
        3 => Action::RunOn { workspace: name(tc), command: command(tc) },
        4 => Action::Focus(direction(tc)),
        5 => Action::Move(direction(tc)),
        6 => Action::Split(direction(tc)),
        7 => Action::Resize(direction(tc)),
        8 => Action::CycleStack(tc.draw(gs::integers::<i64>())),
        9 => Action::CycleWorkspace(tc.draw(gs::integers::<i64>())),
        10 => Action::ReorderWorkspace(tc.draw(gs::integers::<i64>())),
        11 => Action::MoveWindowToWorkspace(tc.draw(gs::integers::<i64>())),
        12 => Action::MoveWorkspaceToOutput(tc.draw(gs::integers::<i64>())),
        13 => Action::Slot(tc.draw(gs::integers::<u8>().max_value(9))),
        14 => Action::PinSlot(tc.draw(gs::integers::<u8>().max_value(9))),
        15 => Action::NightLight(tc.draw(gs::sampled_from(vec![
            NightLightArg::On,
            NightLightArg::Off,
            NightLightArg::Toggle,
            NightLightArg::Auto,
            NightLightArg::Kelvin(NightLightArg::MIN_KELVIN),
            NightLightArg::Kelvin(4000),
            NightLightArg::Kelvin(NightLightArg::MAX_KELVIN),
        ]))),
        16 => Action::NightLight(NightLightArg::Kelvin(
            tc.draw(gs::integers::<u32>().min_value(NightLightArg::MIN_KELVIN).max_value(NightLightArg::MAX_KELVIN)),
        )),
        // A sample of the argument-free verbs; the full table is private to the crate.
        _ => tc.draw(gs::sampled_from(vec![
            Action::Quit,
            Action::ClosePane,
            Action::CloseWindow,
            Action::RunTerminal,
            Action::NewWorkspace,
            Action::MarkWindow,
            Action::Lock,
            Action::Snip,
        ])),
    }
}

fn round_trip(a: &Action) -> Result<Action, String> {
    a.to_string().parse::<Action>().map_err(|e| format!("{e:?}"))
}

/// Round trip over values the grammar can represent: `parse(display(a)) == a`.
#[hegel::test(test_cases = 20000, derandomize = true)]
fn display_then_parse_is_identity_in_contract(tc: TestCase) {
    let a = action(&tc, true);
    assert_eq!(round_trip(&a), Ok(a.clone()), "text was {:?}", a.to_string());
}

/// The same round trip over unrestricted payload strings (free text for commands, layout and
/// workspace names). It fails, so the expected failure is asserted with `should_panic`; the shrunk
/// counterexamples are asserted one by one in the `known_*` tests below.
#[hegel::test(test_cases = 20000, derandomize = true)]
#[should_panic(expected = "text was")]
fn display_then_parse_is_identity_unrestricted(tc: TestCase) {
    let a = action(&tc, false);
    assert_eq!(round_trip(&a), Ok(a.clone()), "text was {:?}", a.to_string());
}

/// Out of contract by the parser's own doc comment ("the rest of the text verbatim (trimmed)"):
/// surrounding whitespace in a command does not survive.
#[test]
fn known_out_of_contract_command_whitespace_is_trimmed() {
    assert_eq!(round_trip(&Action::Run(" a".into())), Ok(Action::Run("a".into())));
    assert_eq!(round_trip(&Action::Run("a ".into())), Ok(Action::Run("a".into())));
}

/// A layout name containing a space prints as two words, which the parser rejects.
#[test]
fn known_layout_name_with_space_does_not_round_trip() {
    assert!(round_trip(&Action::SetLayout("a b".into())).is_err());
    assert!(round_trip(&Action::SetLayout(String::new())).is_err());
}

/// An empty command prints as the bare verb, which the parser rejects ("needs a command").
#[test]
fn known_empty_command_does_not_round_trip() {
    assert!(round_trip(&Action::Run(String::new())).is_err());
}
