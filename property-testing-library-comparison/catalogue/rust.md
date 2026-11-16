# Rust defect catalogue

Written before the first comparison run (see the entry in `notes.md` for the recorded time). Each defect has a hand-derived minimal counterexample and a size measure, fixed here so no minimal is chosen after seeing a result.

Targets, pinned and never edited: `crucible-vault` at `49a46372` (`crates/cv-text`, `canonicalize_url`) and `crucible-dev-env` at `d02df23` (`crates/crucible-keys`, `Action` `Display` / `FromStr`). Mutants are one-line `git diff` files under `mutants/rust/`, applied to a throwaway clone for the runs of that defect and reverted after.

Protocol (identical for every defect and both libraries): 50 runs, seeds 0-49, 1,000 test cases per run. A defect counts as detected in a run when the library reports a failing case within that budget.

"Exactly minimal" means the final reported counterexample has the size measure's minimum value below (for the integer defects, the value itself). The measure is stated per defect so it can be computed mechanically from the recorded counterexample.

| id | target | kind | property | size measure | hand-derived minimum |
|----|--------|------|----------|--------------|----------------------|
| `url-idempotent-arxiv` | `canonicalize_url` | real | `url_idempotent` | length of the input in characters | 25 |
| `action-layout-name` | `Action::SetLayout` | real | `action_layout_name` | characters in the layout name | 0 |
| `url-tracking-case` | `canonicalize_url` | mutant | `url_invariants` | length of the input in characters | 10 |
| `url-drop-gclid` | `canonicalize_url` | mutant | `url_invariants` | length of the input in characters | 12 |
| `action-delta-i32` | `Action` `FromStr` | mutant | `action_roundtrip` | absolute value of the step | 2147483648 |
| `action-kelvin-max-exclusive` | `Action` `FromStr` | mutant | `action_roundtrip` | kelvin value (must equal `MAX_KELVIN` = 6500) | 6500 |
| `action-slot-nine-rejected` | `Action` `FromStr` | mutant | `action_roundtrip` | slot number (must equal 9) | 9 |

## Properties

- `url_never_panics`: `canonicalize_url` never panics on free text, URL-shaped text or `https://` plus free text. Holds; ported for parity, not used by any defect.
- `url_idempotent`: canonicalising the canonical string gives the same canonical string.
- `url_invariants`: the canonical string is http(s), has no `#`, the domain is lower-case, and no tracking parameter name (case-insensitively) survives in the query.
- `action_roundtrip`: `parse(display(a)) == a` for every printable action except `vt-switch`, with string payloads kept inside the documented grammar (a one-word name, a trimmed non-empty command).
- `action_layout_name`: the same round trip, except the `set-layout` name is arbitrary text (empty and whitespace included). This isolates the contract gap in the real `SetLayout` defect; the pilot's broader free-text property also trips on out-of-contract command whitespace, which this catalogue does not count as a defect.

## Real defects

### `url-idempotent-arxiv`

`canonicalize_url` is not idempotent on an arXiv abs or pdf URL whose path ends in `.pdf` and a trailing slash. The arXiv path regex runs before trailing slashes are trimmed (`crates/cv-text/src/url_canon.rs`, regex at the `ARXIV_RE` static, trim at the `path.ends_with('/')` block), so the first pass leaves `/abs/<id>.pdf`, and a second pass strips `.pdf`. Not fixed upstream at HEAD.

- Minimal counterexample: `http:arxiv.org/abs/a.pdf/` (25 characters).
- Derivation: a scheme is required (`http` is the shortest accepted); `Url::parse` accepts a special scheme without `//`; the host must be `arxiv.org` (the shortest of the arXiv hosts); the path must start `/abs/` or `/pdf/`; the id needs at least one character and the `.pdf` suffix; the trailing `/` is what makes the first pass skip the rewrite (the regex cannot match a path that ends in `/`). First pass: `http://arxiv.org/abs/a.pdf`; second pass: `http://arxiv.org/abs/a`.
- Other 25-character counterexamples exist (`/pdf/` for `/abs/`, another id character); any failing input of length 25 is exactly minimal.
- Reachability: the structured URL generators in both packages can reach the `:` separator, so the minimal form is reachable in generator space. The pilot's regression input `http://arxiv.org/abs/2101.00001.pdf/` is 38 characters.

### `action-layout-name`

`Action::SetLayout(name)` prints as `set-layout <name>`, and the parser splits on whitespace, so a name that is empty or contains whitespace does not round-trip (`crates/crucible-keys/src/action.rs`, `Display` and `FromStr`). Not fixed upstream at HEAD.

- Minimal counterexample: `SetLayout("")`. Display gives `set-layout ` and the parser answers `expected a layout name`.
- Size: characters in the name; minimum 0, unique value. The next-smallest failures are one-character whitespace names (`" "`, size 1).

## Seeded mutants

Each is a one-line diff in `mutants/rust/<id>.diff`; the target's own tests were not run against them.

### `url-tracking-case`

`TRACKING_PARAMS.contains(&k.to_lowercase().as_str())` becomes `TRACKING_PARAMS.contains(&k.as_ref())`: tracking parameter names are matched case-sensitively, so `rEf` survives. Caught by `url_invariants`.

- Minimal counterexample: `http:a?rEf` (10 characters): a parameter named like a tracking parameter with at least one upper-case letter, on the shortest http URL (`ref` is the shortest tracking name, 3 characters). Canonical form `http://a/?rEf=` still holds the key.

### `url-drop-gclid`

The `"gclid"` entry is deleted from `TRACKING_PARAMS`, so that parameter survives. Caught by `url_invariants`.

- Minimal counterexample: `http:a?gclid` (12 characters), the shortest http URL carrying the parameter.

### `action-delta-i32`

`arg.parse::<i64>()` becomes `arg.parse::<i32>().map(i64::from)` in the signed-step parser, so steps outside the `i32` range are rejected. Caught by `action_roundtrip` through the five signed-step verbs (`cycle-stack`, `cycle-workspace`, `reorder-workspace`, `move-window-to-workspace`, `move-workspace-to-output`).

- Minimal counterexample: `CycleStack(2147483648)` (or any of the five verbs with that step). Negative steps down to -2147483648 still parse, so the smallest absolute value that fails is 2^31 = 2147483648, positive. Size: absolute value of the step; `CycleStack` is the lowest-indexed verb.

### `action-kelvin-max-exclusive`

`(min..=max).contains(&k)` becomes `(min..max).contains(&k)`: the upper kelvin bound is rejected. Caught by `action_roundtrip`.

- Minimal counterexample: `NightLight(Kelvin(6500))` (`MAX_KELVIN`). Unique failing value.

### `action-slot-nine-rejected`

`Ok(n) if n <= 9` becomes `Ok(n) if n < 9` in the slot-number parser, so slot 9 is rejected. Caught by `action_roundtrip` through `slot` and `pin-slot`.

- Minimal counterexample: `Slot(9)` (`PinSlot(9)` is the same defect on the later verb). Unique failing value.

## Library case budgets

Recorded, not used: Hegel `hegeltest` 0.52.6 defaults to 100 test cases (`Settings` documentation); proptest 1.12.0 `Config::default().cases` is 256. Every comparison run uses 1,000.

## Errata (recorded after the comparison runs)

The hand-derived minimum for `url-idempotent-arxiv` above (25 characters, `http:arxiv.org/abs/a.pdf/`) was wrong: the `.pdf` suffix is not needed. A `/pdf/<id>/` path with a trailing slash already fails, because the first pass skips the rewrite (the regex cannot match a trailing `/`), trims the slash, and a second pass then rewrites `/pdf/` to `/abs/`. The true minimum is `http:arxiv.org/pdf/a/` (21 characters), checked directly against the unmutated target (`http:arxiv.org/abs/a/` and `http:arxiv.org/pdf/a` both pass). The pre-registered value is left unchanged in the table above, and the result tables report an "exactly minimal" fraction against both the pre-registered 25 and the corrected 21. Every other catalogue entry was confirmed unchanged. The Hegel runs reported 23-character counterexamples (`http://arxiv.org/pdf/0/`), shorter than the pre-registered minimum.

Generator reach, observed after the runs: for `url-tracking-case` and `url-drop-gclid` the hand minimum (10 and 12 characters) uses a one-letter host that neither package's URL generator can produce (hosts come from a fixed list, or the `https://` plus free-text branch whose shrink did not cross over), so no run can be exactly minimal against it; the reported counterexamples are the smallest the generators reach.
