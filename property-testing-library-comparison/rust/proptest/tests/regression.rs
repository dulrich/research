//! Deterministic known-counterexample regressions for the two real defects. They stay green on the
//! unmutated targets because they assert the defective behaviour (they are not should-panic
//! properties at a fixed case budget).
use cv_text::url_canon::canonicalize_url;
use crucible_keys::Action;
use ptlc_proptest::{check_idempotent, check_roundtrip};

#[test]
fn known_defect_arxiv_trailing_slash_not_idempotent() {
    assert!(check_idempotent("http://arxiv.org/abs/2101.00001.pdf/").is_err());
    let first = canonicalize_url("http://arxiv.org/abs/2101.00001.pdf/").unwrap();
    assert_eq!(first.canonical, "http://arxiv.org/abs/2101.00001.pdf");
    let second = canonicalize_url(&first.canonical).unwrap();
    assert_eq!(second.canonical, "http://arxiv.org/abs/2101.00001");
}

#[test]
fn known_defect_set_layout_name_with_space_or_empty_does_not_round_trip() {
    assert!(check_roundtrip(&Action::SetLayout(String::new())).is_err());
    assert!(check_roundtrip(&Action::SetLayout("a b".into())).is_err());
    assert!(check_roundtrip(&Action::SetLayout("a".into())).is_ok());
}
