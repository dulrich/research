# Survey: where property-based testing would pay off in the crucible repos

Read-only survey of `crucible-dev-env`, `crucible-term`, `crucible-tui` and `crucible-vault`. Everything below comes from reading source; nothing was built or run, so a "likely counterexample" is a hypothesis to confirm, not a finding. Line numbers are as of the surveyed checkouts.

Each candidate has an anchor (`repo/path:line` of the function or type under test), the property in one sentence, its kind, what generator it needs, whether it can run in-process, and a value/cost call. Candidates are ranked best first within each repo.

## crucible-dev-env

Stack: Rust cargo workspace of six crates (`crucible-layout`, `crucible-keys`, `crucible-config`, `crucible-persist`, `crucible-compositor`, `crucible`); the project is a Wayland compositor and desktop environment. The workspace rule is that `crucible-layout` has no compositor dependency and everything is unit-testable without one.

Tests today: about 1,100 `#[test]` functions across unit tests beside the code and a few integration files (`crucible-layout/tests/`). Styles are example-based unit tests, small "grid" loops over hand-picked values (for example `round_trip_over_a_grid` in `crucible-persist/src/invocation.rs:529`), and a structural invariant checker (`World::check_invariants`) called after hand-written operation sequences. Gates: `cargo fmt --check`, `cargo clippy -- -D warnings`, `cargo test`, `cargo audit`, an offline Trivy scan, and a `--help` gate. The only dev-dependency in the workspace is a hash library in the compositor crate; there is no generator or fuzzing library.

The repo has plenty of small pure code (layout geometry, codecs, grammar parsers) and a lot of compositor glue. The pure part is where the candidates are.

### 1. IPC request line codec

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/ipc.rs:175` (`Request::parse`) and `:216` (`Request::to_line`); the response side is `:251` and `:261`.
- **Property:** for every `Request` value `r` whose string arguments are non-empty, `Request::parse(&r.to_line()) == Ok(r)`; and `parse` never panics on any string.
- **Kind:** round-trip.
- **Generator:** trivial for the enum (derive or hand-write an `Arbitrary`); strings must include the codec's special characters (`%`, `:`, TAB, LF, CR, space) and `PathBuf` values.
- **Purity:** pure; no socket needed.
- **Value/cost call:** high. The wire format carries workspace names and commands typed by the user, and reading it already suggests a counterexample: `Request::SetRoot(Some("-".into()))` encodes to `root -`, which `parse` turns into `SetRoot(None)` because `-` is the sentinel for "clear the root". `OpenFolder` and `Capture` also convert paths with `to_string_lossy`, so non-UTF-8 paths cannot round-trip; the property should state the UTF-8 restriction or the code should reject such paths.

### 2. Field codec (`encode_field` / `decode_field`)

- **Anchor:** `crucible-dev-env/crates/crucible-persist/src/field.rs:8` and `:26`.
- **Property:** for every string `s`, `decode_field(&encode_field(s)) == Some(s)` and the encoded form contains none of `:`, TAB, LF, CR; and `decode_field` never panics on any string, returning `None` exactly when a `%` is not followed by one of the five valid escapes.
- **Kind:** round-trip, plus no-crash robustness.
- **Generator:** trivial (arbitrary Unicode strings, biased toward `%` and the five special characters; a second generator for arbitrary strings fed to `decode_field`).
- **Purity:** pure.
- **Value/cost call:** medium-high. The codec is tiny and its one example test already lists eight strings, but it underpins the IPC protocol, `crucible pick` arguments and bindings payloads, so a generated check on it is nearly free and pays for every protocol property above and below. Note `decode_field` accepts lowercase hex (`%3a`), so `encode(decode(x)) == x` is not a property; do not write it.

### 3. Layout world: stateful operation sequences

- **Anchor:** `crucible-dev-env/crates/crucible-layout/src/world/mod.rs:135` (`World::check_invariants`), with the operations in `crucible-layout/src/world/windows.rs` (`split`, `close_window`, `close_pane`, `move_`, `focus`, `cycle_stack`) and `crucible-layout/src/world/outputs.rs` (`add_output`, `remove_output`); the tree underneath is `crucible-layout/src/tree.rs:309` (`split`) and `:361` (`remove`) with its own `check_invariants` at `:570`.
- **Property:** after any sequence of public `World` operations, `check_invariants` holds and the window and pane counts match a simple model (a count and an ordered list per pane).
- **Kind:** stateful / model-based; the model is a pair of counters plus a per-pane window list, and the invariant checker is already the oracle.
- **Generator:** needs a stateful command sequence (an enum of operations with arguments chosen from currently valid ids, with shrinking by dropping commands). Moderate: roughly 30 lines to define commands, plus choosing ids from live state.
- **Purity:** pure and in-process; the layout crate has no compositor dependency by design.
- **Value/cost call:** high. Invariant checks currently run after hand-written sequences (the longest is a mixed-axis tree of eight leaves in `crucible-layout/src/tree.rs`), so the space of interleavings (outputs added and removed, fullscreen, stack cycling, pane close with windows in flight) is barely sampled. This is the textbook case for a model-based test, and the oracle exists.

### 4. Geometry: tiling covers the output exactly

- **Anchor:** `crucible-dev-env/crates/crucible-layout/src/geometry.rs:317` (`geometry_of_workspace`), `:285` (`subdivide`), and the `Rect` algebra at `:122` (`intersection`), `:154` (`frame_strips`), `:179` (`border_strips`), `:193` (`subtract`).
- **Property:** with zero gaps, the leaf rectangles for any split tree and any output rectangle with positive area are pairwise disjoint and their areas sum to the output area; `Rect::subtract(hole)` returns disjoint rectangles whose union is exactly `self` minus `hole`; `border_strips(t)` tiles the rect minus its interior for any `t`.
- **Kind:** invariant; for `subtract`, oracle/differential against a brute-force pixel set on a small grid (enumerate every integer point in a 16x16 window).
- **Generator:** trivial for `Rect` (small signed ints, non-negative sizes; keep values small enough that `i32` arithmetic cannot overflow, or test that boundary on purpose); a random split tree comes from the stateful generator in candidate 3.
- **Purity:** pure.
- **Value/cost call:** high. Rounding in `subdivide` (`round((extent - gap) * ratio)`, remainder to the second child) is exactly the kind of code where an off-by-one appears only at some sizes and ratios. Existing tests check "nested splits cover full area" for specific trees (`geometry.rs:452`, `:470`).

### 5. Key bindings table and action grammar

- **Anchor:** `crucible-dev-env/crates/crucible-keys/src/action.rs:260` (`Action` `Display`) and `:387` (`Action` `FromStr`); `crucible-keys/src/bindings.rs:133` (`Bindings::entries`) and `:166` (`Bindings::with_overrides`).
- **Property:** for every `Action` except `VtSwitch` (documented as unparseable), `a.to_string().parse() == Ok(a)`; and `Bindings::with_overrides(&b.entries())` yields a table whose `entries()` equal `b.entries()`.
- **Kind:** round-trip.
- **Generator:** `Action` is a large enum with argument types (directions, `i64` deltas, `u8` slots, strings, `NightLightArg`); derive an `Arbitrary`-style generator. Strings need whitespace edge cases.
- **Purity:** pure.
- **Value/cost call:** medium-high. The module documents `Display` and `FromStr` as "the one verb grammar", which is a round-trip claim made in prose. Reading suggests counterexamples: `Run(" x")` prints `run  x` and parses back as `Run("x")` (the command is trimmed), `SetLayout("a b")` prints a string that parses with an unexpected-argument error, and an empty command is refused on parse but representable. Whether those inputs are reachable from real config is for the code owners to judge; the test forces the decision.

### 6. Persisted workspace and session records (KDL)

- **Anchor:** `crucible-dev-env/crates/crucible-persist/src/format.rs:114` (`WorkspaceRecord::to_kdl`) and `:141` (`from_kdl`); `crucible-persist/src/session.rs:108` and `:135`; `crucible-persist/src/slots.rs:93` and `:107`.
- **Property:** `from_kdl(to_kdl(x)) == x` for every record `x` that `to_kdl` accepts (it rejects non-UTF-8 paths with an error, never lossy), including workspace names, roots, outputs, commands and nested split trees with arbitrary strings.
- **Kind:** round-trip.
- **Generator:** needs a custom generator: a recursive split tree (`LayoutNode<PaneRecord>`) with pane records, window records of each variant, and strings drawn from a KDL-hostile alphabet (quotes, backslashes, `#`, braces, newlines, unicode escapes, raw-string delimiters). Moderate to hard (about 60 lines).
- **Purity:** pure; the in-memory text is the interface.
- **Value/cost call:** high. This is user data on disk: a workspace name or command that does not round-trip silently loses a saved session. The KDL library does the quoting, so most strings will pass, but the layer above it adds its own conventions (version node, focused-pane index, empty-root handling, tree shape) that examples cover only at hand-picked shapes.

### 7. Workspace file-name codec

- **Anchor:** `crucible-dev-env/crates/crucible-persist/src/store.rs:45` (`encode_file_name`) and `:67` (`decode_file_name`).
- **Property:** for every non-empty name whose encoding fits the length limit, `decode_file_name(&encode_file_name(n)?) == Some(n)` and the encoded name contains no `/` or NUL and does not begin with `.`; encoding an empty or over-long name is an error, never a panic.
- **Kind:** round-trip plus invariant (path safety).
- **Generator:** trivial (arbitrary strings, biased toward `/`, `%`, `.`, NUL, multi-byte characters near the length limit).
- **Purity:** pure.
- **Value/cost call:** medium. Small and a round-trip test exists (`store.rs:233`, `:259`) with awkward hand-picked names; a generated check adds the length-limit boundary and arbitrary Unicode. The path-safety half is the useful part.

### 8. Window placement ordering

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/persist/placement.rs:298` (`insert_index`), `:323` (`reserve`), `:337` (`reserved_index`).
- **Property:** placing any set of saved windows in any arrival order, using `insert_index` for each, leaves them in saved-index order; `reserve` keeps every earlier reserved window at a clamped position and never drops a live one; `reserved_index` never exceeds the live count.
- **Kind:** metamorphic (permuting arrival order must not change the final order); invariant for the other two.
- **Generator:** trivial (vectors of small unique ids, then a random permutation).
- **Purity:** pure functions over slices.
- **Value/cost call:** medium. A test named for "any map order" exists (`placement.rs:821`) but can only enumerate a few permutations by hand. Cheap to generalise, and ordering bugs here are user-visible (restored windows in the wrong stack order).

### 9. Resume, relaunch and pick argv codecs

- **Anchor:** `crucible-dev-env/crates/crucible-persist/src/invocation.rs:170` (`ResumeWrapper::parse`), `:146` (`to_args`), `:261` (`RelaunchWrapper::parse`), `:406` (`PickTarget::parse`), `:355` (`CdeWrapper::decode`), `:89` (`Invocation::terminal_argv`).
- **Property:** `parse(to_args(w)) == Ok(w)` for every wrapper value; `CdeWrapper::decode` of `terminal_argv` recovers the invocation; `parse` of any argument list never panics and either returns a value or an error message.
- **Kind:** round-trip plus no-crash robustness.
- **Generator:** trivial to moderate (small structs; strings that look like flags, empty strings, the `--` separator).
- **Purity:** pure.
- **Value/cost call:** medium-low. The existing grid tests (`invocation.rs:529`, `:554`, about 27 tests in the file) already cover the product of modes and flags. The generated version adds adversarial strings (a command that is itself `--now`) at low cost, but the marginal bug yield is likely small.

### 10. Chrome planning and config helpers

- **Anchor:** `crucible-dev-env/crates/crucible-compositor/src/chrome/plan.rs:84` (`stack_pips`); `crucible-dev-env/crates/crucible-config/src/model.rs:61` (`Rgb::from_hex`), `:197` (`substitute_gap`), `:215` (`clamp_ring_inset`); `crucible-dev-env/crates/crucible-config/src/lib.rs:71` (`expand_tilde`).
- **Property:** `stack_pips` returns zero pips for length at most one, otherwise exactly `len` pips with exactly one `Active` at the clamped focus index (its own doc comment states these); `clamp_ring_inset` always returns a value at most `gap - ring`; `Rgb::from_hex` accepts exactly `#` followed by six hex digits; `expand_tilde` leaves any path without a leading `~` component unchanged.
- **Kind:** invariant.
- **Generator:** trivial.
- **Purity:** pure.
- **Value/cost call:** low. Small functions with example tests; the doc-comment properties are cheap to encode but unlikely to be violated. Worth doing only as a warm-up to learn the tool.

### Not worth it (for now)

- `crucible-dev-env/crates/crucible-compositor/src/xwayland.rs`, `udev/`, `pointer_lock.rs`, `input/execute.rs`, `focus.rs`: compositor glue over Smithay state. A state-machine property would need a fake compositor; the cost is far above the yield. Revisit only if the layout world (candidate 3) finds bugs the glue then exposes.
- `crucible-dev-env/crates/crucible/src/mem.rs` and the `launch` / `resume` modules: process and `/proc` interaction; integration tests are the right tool.

Best first target: candidate 1 together with 2 (the IPC request codec and the field codec beneath it). They are pure, need no custom generator beyond an enum, finish in milliseconds, and reading the code already points at a counterexample, so a first run answers "does this tool find anything here" cheaply. The layout world (candidate 3) is the higher-value second step.

## crucible-term

Stack: Rust workspace of two crates: `crucible-term-core` (VT session model, snapshot, delta, input encoding, built on the rio-vt terminal core) and `crucible-term` (daemon, wire protocol, window host, renderer, config, CLI). The binary is `cterm`.

Tests today: about 150 `#[test]` functions across unit tests, a conformance suite and a snapshot/delta suite in `crucible-term-core/tests/`, and daemon integration tests in `crucible-term/tests/daemon.rs`. The snapshot tests already use a hand-rolled xorshift generator with fixed seeds (`crucible-term-core/tests/common/mod.rs`) to produce escape-heavy corpora. Gates: `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`, `cargo test`, `cargo audit`. No generator or fuzzing dev-dependency. The repo is small (about 45 Rust files); the pure surface is the wire codec, the VT model helpers and the renderer math.

### 1. Daemon wire codec

- **Anchor:** `crucible-term/crates/crucible-term/src/wire.rs:133` (`encode`), `:235` (`decode_body`), `:283` (`decode`).
- **Property:** `decode(&encode(&m)) == Ok(Some((m, encode(&m).len())))` for every `Msg`; `decode` on every strict prefix of a frame returns `Ok(None)` or an error but never a message; `decode_body` on arbitrary bytes returns `Ok` or `Err`, never panics and never allocates beyond the input length (the list-count guard at `wire.rs:225` exists for this).
- **Kind:** round-trip, plus no-crash robustness.
- **Generator:** trivial to moderate: `Msg` has seven variants; the `Open` variant needs `OsString` argv and environment pairs (arbitrary bytes, not just UTF-8) and optional strings. A second generator produces raw byte strings, biased toward length prefixes that are small, equal to the remaining length, and huge.
- **Purity:** pure; no socket.
- **Value/cost call:** high. A hand-written binary format parsed from a socket is the classic property target, the daemon trusts the client's bytes, and only three tests cover it. Note that `decode` accepts any non-zero byte as `reattached = true`, so `encode(decode(b)) == b` does not hold for arbitrary bytes; the property is the one-directional round trip and totality of `decode`.

### 2. VT snapshot and cell-delta round trips

- **Anchor:** `crucible-term/crates/crucible-term-core/src/snapshot.rs:24` (`encode`), `crucible-term-core/src/delta.rs:64` (`Delta::between`), `:106` (`apply`), `:130` (`to_vt`), with `Session::feed` and `Session::snapshot` in `crucible-term-core/src/session.rs`.
- **Property:** for any byte stream, a fresh `Session` fed the snapshot of a session reproduces its grid; and for any two grids of equal size, `Delta::between(a, b)` applied to a copy of `a` equals `b`, and feeding `to_vt()` to a session restored from `a` yields `b`'s screen cells.
- **Kind:** round-trip (the delta one is also a differential between two routes to the same grid: `apply` and `to_vt`).
- **Generator:** a stream of VT bytes: printable text with wide and combining characters, SGR changes (colour, underline styles), cursor movement, erases, scrolls, OSC 133 marks, soft-wrap triggers. The existing `edit_corpus` generator already does this from a seed; the property-based version would replace the seed with a shrinkable structured value (a list of actions that render to bytes). Moderate.
- **Purity:** in-process; the session wraps the VT core but needs no I/O or PTY.
- **Value/cost call:** high. The module documents a "fidelity boundary" (what is and is not carried), which is the property to state precisely. Existing tests use fixed seeds and cannot shrink, so a failure today would be a 10,000-row transcript; shrinking would reduce it to a handful of actions.

### 3. ED 1 correction versus the unwrapped VT core

- **Anchor:** `crucible-term/crates/crucible-term-core/src/ed1.rs:32` (`Ed1Fix`, the wrapper that patches the VT core's erase-above behaviour).
- **Property:** for any byte stream without `CSI 1 J` the grids of a session using the wrapper and one using the unwrapped core are identical; with it, the only difference is row 0 when the cursor sits on row 1, where the wrapper's result matches a hand-written model (every row above the cursor, and the cursor row up to and including the cursor column, cleared).
- **Kind:** oracle/differential: the unwrapped core for the "no change" half, a small executable specification of ED 1 for the other half.
- **Generator:** the same VT action generator as candidate 2, with `CSI 1 J` and cursor positioning weighted up.
- **Purity:** in-process.
- **Value/cost call:** medium. The wrapper delegates a long list of handler methods verbatim by macro, so the real risk is a delegated method that silently diverges; a differential on random streams checks the delegation as a whole. It is tied to one upstream bug and goes stale when upstream fixes it.

### 4. Selection geometry and text extraction

- **Anchor:** `crucible-term/crates/crucible-term/src/selection.rs:72` (`span`), `:150` (`range`), `:192` (`text`), `:171` (`contains`).
- **Property:** for any grid of rows (cells that are single, wide, spacer or empty) and any click point, a word, line or character span lies on rows that exist, starts at or before its end, and contains the click's leading column; `range()` is ordered; `contains(row, col)` is true exactly for cells between the range ends; `text()` never emits a spacer cell's content and never has trailing blanks on a non-wrapped line.
- **Kind:** invariant.
- **Generator:** needs a custom generator for `Row`/`Cell` grids with wide glyphs and their spacer cells in the right places (a wide cell must be followed by a spacer); a point inside the grid and a selection kind. Moderate.
- **Purity:** pure; selection takes a row-lookup closure.
- **Value/cost call:** medium-high. Wide-character and spacer handling is where selection and copy bugs live, and six tests cover it. The grid generator is the main cost and is reusable by the renderer candidates.

### 5. Mouse and key encoders

- **Anchor:** `crucible-term/crates/crucible-term-core/src/input.rs:315` (`encode_mouse`), `:136` (`encode_key`).
- **Property:** for SGR mouse encoding, parsing the emitted `ESC [ < b ; x ; y M|m` sequence (a few lines of test code) recovers the button, modifiers, action and 1-based coordinates; for legacy encoding, every emitted byte after the prefix is at most 255 and coordinates saturate at the documented limit; `encode_key` never panics for any `Key`, `Mods` and mode combination.
- **Kind:** round-trip against a test-side parser for SGR; invariant and no-crash for the rest.
- **Generator:** trivial (small enums plus bounded integers; large coordinates matter).
- **Purity:** pure.
- **Value/cost call:** medium. The mouse code's own comment says it clamps so the byte stays within range, which is the property. Seven tests cover keys and mouse today, mostly one case per feature, so the mode-by-modifier product is under-sampled, but a bug here is a minor input glitch, not data loss.

### 6. Session record header

- **Anchor:** `crucible-term/crates/crucible-term/src/daemon/store.rs:109` (`header`), `:129` (`parse`), `:96` (`pct_encode`), `:89` (`valid_key`).
- **Property:** for any valid key, dimensions in `1..=10000`, line count, timestamp and cwd bytes, `parse(header(...) + body, key)` returns a record with the same dimensions and a body equal to the bytes after the header; any header with a different key, a version mismatch or out-of-range dimensions is an `Err`; `pct_encode` output contains only `[A-Za-z0-9/._~%-]` and never contains a space or newline (which would break the one-line header).
- **Kind:** round-trip plus invariant.
- **Generator:** trivial.
- **Purity:** pure.
- **Value/cost call:** medium-low. Small and mostly exercised by the daemon tests; useful because the header is split on spaces and a cwd containing a space or newline must stay one token.

### 7. Command line and config overrides

- **Anchor:** `crucible-term/crates/crucible-term/src/cli.rs:69` (`parse`); `crucible-term/src/config.rs:491` (`apply_override`), `:420` (`parse_color`).
- **Property:** `parse` never panics on any argument vector (including non-UTF-8 `OsString`s) and the argv after `-e` is kept verbatim; `--flag=value` and `--flag value` parse identically for every value flag; `apply_override` on an invalid override leaves the settings value unchanged and records a warning; `parse_color` accepts exactly six hex digits with an optional leading `#`.
- **Kind:** no-crash robustness and metamorphic (the two spellings of a flag); invariant (failed override is atomic).
- **Generator:** trivial for strings; moderate for settings (compare via `Debug`).
- **Purity:** pure.
- **Value/cost call:** medium. User-facing parsing, five CLI tests and fifteen config tests today. The atomic-failure property is the one most likely to find something, because overrides write several fields in some key handlers.

### 8. Renderer compositing arithmetic

- **Anchor:** `crucible-term/crates/crucible-term/src/render/mod.rs:155` (`over`), `:148` (`premul`), `:122` (`grid_size`), `:47` (`centered`).
- **Property:** `over(dst, src, 0) == dst`; for an opaque premultiplied `src` at full coverage the result equals `src`; if `dst` and `src` are valid premultiplied pixels (each colour channel at most the alpha) then every output channel is at most 255 and at most the output alpha; `grid_size` always returns at least one column and row; `centered` padding plus the grid never exceeds the buffer when the grid fits.
- **Kind:** invariant.
- **Generator:** trivial (`u32` pixels constrained to the premultiplied invariant, coverage 0..=255).
- **Purity:** pure; the functions are private, so the test must live in the crate (`render/tests.rs` exists).
- **Value/cost call:** medium-low. Fixed-point blending with `+127` rounding is a classic place for off-by-one saturation, and the code already clamps with `min(255)`, which hints a past overflow. Visual artefacts, not data loss.

### Not worth it (for now)

- `crucible-term/crates/crucible-term/src/daemon/mod.rs`, `window/host.rs`, `client.rs`, `font/`: Wayland, PTY, socket and fontconfig glue. Daemon integration tests cover the lifecycle; a stateful property over the daemon registry (`daemon/state.rs`) would need a fake clock and fake connections and is a larger project.
- `crucible-term/crates/crucible-term/src/identity.rs:46` (`decide`): a two-boolean decision; exhaustive enumeration beats generation here.

Best first target: candidate 1 (the wire codec), because it is a network-facing binary parser with only three tests, the generator is a plain enum, and a run takes seconds. Candidate 2 (snapshot and delta) is the highest-value one and its seeded corpus generator is already half of a property test.

## crucible-tui

Stack: Rust workspace of three crates (`mdview`, a terminal markdown viewer; `jsonedit`, a visudo-style JSON/JSONC/JSON5 editor; `ofm`, shared pure Obsidian-flavoured-markdown primitives with no I/O) plus Bun and TypeScript scripts and tests for the corpus sweep, the colour axis and the render differential.

Tests today: about 410 Rust `#[test]` functions (large unit-test files such as `lists/tests.rs`, `table/tests*.rs`, `lex/tests.rs`) and Bun test files in `tests/`. The scripts drive the built binary through a hidden `__parity` subcommand and compare rendered output over a fixed corpus of real documents at many widths; that sweep is a differential harness, but over a fixed corpus, with no generation and no shrinking. Gates: `bun install` then `bun run verify`, which fans out to format, lint, clippy, `cargo test`, `bun test`, the sweep and a publication-containment guard. Many Rust modules are ports of a JavaScript original and say so in comments (`string-width`, `path.posix.normalize`, regexes), which makes a JavaScript differential oracle available through the Bun toolchain the repo already requires.

### 1. ANSI-safe wrapping keeps all visible text and respects the width

- **Anchor:** `crucible-tui/crates/mdview/src/wrap.rs:184` (`wrap_ansi`), `crucible-tui/crates/mdview/src/ansi.rs:177` (`scan`), `:221` (`strip_sequences`), `crucible-tui/crates/mdview/src/text.rs:70` (`split_token`).
- **Property:** for any text (including escape sequences, malformed ones, wide characters and combining marks) and any width at least one, the concatenation of `scan(text)` span raw strings equals `text`; `strip_sequences(text)` equals the scan's visible text; the visible text of the wrapped lines, with whitespace runs collapsed, equals the visible text of the input with whitespace runs collapsed (nothing lost, nothing duplicated); every wrapped line is at most `width` columns wide unless it is a single grapheme wider than `width`; and `split_token(t, w).concat() == t`.
- **Kind:** round-trip (scan) and invariant (wrap), with the width measure as the oracle for the bound.
- **Generator:** needs a custom string generator: an alphabet weighted toward `ESC`, `[`, `]`, `;`, digits, `m`, BEL, backslash, spaces, tabs, ASCII words, CJK, emoji and combining marks, so that well-formed and truncated sequences both appear. Moderate (about 30 lines).
- **Purity:** pure; the width measure is an in-process value.
- **Value/cost call:** high. The README promises lossless wrapping and ANSI-safe reflow, and the code is a hand-rolled escape scanner plus a greedy wrapper; this is the exact shape of code where generated adversarial strings beat examples. The module comments describe the same function from a JavaScript original, so the existing tests encode one language's quirks.

### 2. Table column allocation

- **Anchor:** `crucible-tui/crates/mdview/src/table.rs:424` (`allocate_widths`), `:491` (`wrap_text`).
- **Property:** for any natural widths and target width, the result has one width per column; no width is below the column floor; if the natural widths plus table chrome fit the target, the widths equal the natural widths; no flexible column ends up wider than its natural width; `fits` is true exactly when `total_width` is at most the target; and a larger target never produces a smaller total. For `wrap_text`, the words of the output equal the words of the input and no line exceeds the width unless one word cannot be split.
- **Kind:** invariant and metamorphic (monotone in the target).
- **Generator:** trivial for `allocate_widths` (a vector of small integers and a target); a word generator for `wrap_text`.
- **Purity:** pure.
- **Value/cost call:** high for cost-benefit, medium for blast radius. The allocation is a multi-step proportional-share algorithm with an overshoot loop and a floor, the README promises "no cell is ever truncated", and the whole module can be tested with a ten-line generator. Existing table tests are hand-picked widths.

### 3. Whole-document render invariants

- **Anchor:** `crucible-tui/crates/mdview/src/render.rs:303` (`render`), `crucible-tui/crates/mdview/src/overflow.rs:25` (`find_first_overflow`, already the sweep's oracle).
- **Property:** for any generated markdown document and any width from 20 to 200: `render` returns without panicking; fenced code content appears byte-for-byte in the output; no non-code line is wider than the width except where the table-too-wide exception documented in the README applies (`find_first_overflow` returns `None` outside that case); and rendering the same input twice gives identical output.
- **Kind:** invariant and no-crash robustness.
- **Generator:** needs a custom structured markdown generator (headings, nested lists in tight and loose style, task items, tables with wide cells, fenced code, block quotes, wiki-links, frontmatter, inline emphasis, escape sequences in text). Hard: this is the expensive generator in the repo, but it is also the one that turns the existing fixed-corpus sweep into a shrinking search.
- **Purity:** in-process; `render` is a library function with explicit options.
- **Value/cost call:** medium-high. The sweep script's own comments record that a three-width gate sampled an overflow defect "essentially at random" and that the swing across 16 columns was 9x, which is an argument for random widths and generated documents. Cost is the generator; start from a grammar of block types, not from arbitrary strings.

### 4. Path normalisation against Node's `path.posix`

- **Anchor:** `crucible-tui/crates/mdview/src/wikiresolve.rs:29` (`normalize`), `:64` (`join`), `:73` (`dirname`), `:95` (`resolve`).
- **Property:** each function equals Node's `path.posix` counterpart (named in its doc comment) on every input; `normalize` is idempotent; `dirname(join(a, b))` is a prefix-consistent path of the join.
- **Kind:** oracle/differential (the JavaScript runtime the repo already needs); idempotence.
- **Generator:** trivial (paths from a small segment vocabulary: `a`, `b`, `.`, `..`, empty, with leading and trailing slashes, depth up to 8).
- **Purity:** the Rust side is pure; the oracle is a Bun or Node process fed a batch of inputs (one subprocess per test run, not per case) or a checked-in table of generated results.
- **Value/cost call:** high for cost-benefit. Hand-ported path functions are a known place for subtle divergences (`..` above root, trailing slash handling, `//`), and a differential costs one batch call. Equivalent logic exists in `crucible-vault` (see its resolver candidate), so the same generator serves both repos.

### 5. Wiki-link matcher against its documented regular expression

- **Anchor:** `crucible-tui/crates/ofm/src/wikilink.rs:20` (`match_wikilink_with`); `crucible-tui/crates/ofm/src/frontmatter/split.rs:36` (`split_frontmatter`).
- **Property:** `match_wikilink` agrees with the regular expression written in its doc comment (compiled with the `regex` crate) on every input: same match or no match, same consumed length, same slug, fragment and alias; on any input it never panics and never slices inside a character. `split_frontmatter` returns a metadata block and body that are both substrings of the source and whose concatenation with the delimiters reproduces the source's frontmatter region.
- **Kind:** oracle/differential (the regex), no-crash robustness.
- **Generator:** trivial to moderate (strings over `[`, `]`, `|`, `#`, `^`, `!`, newline, spaces, letters, non-ASCII).
- **Purity:** pure.
- **Value/cost call:** medium-high. A hand-rolled matcher whose specification is a regex literally written in the doc comment is the ideal differential case, the crate is documented as shared with an out-of-repo consumer (so a defect spreads), and it costs about 20 lines.

### 6. Editor-command splitting

- **Anchor:** `crucible-tui/crates/jsonedit/src/edit.rs:51` (`split_shell`), `:144` (`editor_args`).
- **Property:** for any list of words, quoting each word with single quotes (escaping embedded quotes) and joining with spaces splits back to the same list; and, restricted to inputs with no expansion characters, `split_shell` agrees with a POSIX shell's own word splitting of the same text.
- **Kind:** round-trip against a test-side quoter; oracle/differential against `sh`.
- **Generator:** trivial (words from an alphabet of quotes, backslashes, spaces, tabs, `$`, backticks and letters).
- **Purity:** pure for the round trip; the shell oracle needs a subprocess (`sh -c 'printf "%s\n" ...'` style, batched).
- **Value/cost call:** medium-high. The editor string comes from the environment and is executed; quoting bugs here are a correctness and a safety matter. Small function, one test file's worth of examples today.

### 7. Indent repair keeps every other byte and the document value

- **Anchor:** `crucible-tui/crates/jsonedit/src/indent.rs:126` (`reindent`), `:65` (`detect`), `:98` (`mismatches`); `crucible-tui/crates/jsonedit/src/validate.rs:105` (`validate`).
- **Property:** for any valid JSONC or JSON5 document and any set of lines, `reindent` changes only leading spaces and tabs of the listed lines (stripping leading whitespace from every line gives identical text before and after), the result still validates and parses to the same value, applying it a second time with the same arguments changes nothing, and every line it reports as fixed fits the chosen style.
- **Kind:** invariant, metamorphic (idempotence), differential (the parsed value before and after, using a JSON parser as the oracle).
- **Generator:** needs a custom generator: a JSON value tree rendered with random indentation, comments (line and block), trailing commas, single-quoted strings and multi-line strings or comments (the cases `reindent` reports unfixable). Moderate to hard.
- **Purity:** pure; the editing session itself (temp files, editor launch, atomic write) is out of scope.
- **Value/cost call:** high. The tool's stated safety invariant is that a write only happens if the result parses and only whitespace changes; this property is that invariant as a test. The existing integration tests (`jsonedit/tests/edit.rs`) are scripted sessions over a handful of files.

### 8. String display width

- **Anchor:** `crucible-tui/crates/mdview/src/width.rs:182` (`string_width`), `crucible-tui/crates/mdview/src/text.rs:119` (`pad_to_width`).
- **Property:** `string_width` equals the `string-width` npm library at the version the comment names, for both ambiguous-width modes; the width of a printable-ASCII string equals its length; stripping escape sequences first never changes the width; `pad_to_width(s, w, align)` has width exactly `max(w, width(s))` and never removes text.
- **Kind:** oracle/differential (the JavaScript library under Bun), invariant.
- **Generator:** moderate (code points sampled from ranges that matter: wide, ambiguous, combining, emoji sequences with joiners and variation selectors, Hangul jamo, zero-width characters).
- **Purity:** pure; the oracle is a batched Bun call, since grapheme segmentation differs between ICU and the Rust segmentation crate and the comments say agreement was measured over a corpus, not over generated strings.
- **Value/cost call:** medium. The result is a known-imperfect approximation, so disagreements will be found; the value is in deciding which are tolerable and pinning them as documented exceptions. It will produce a list, not a pass/fail.

### 9. Tooling scripts in TypeScript

- **Anchor:** `crucible-tui/scripts/sweep-options.ts:42` (`parseWidths`), `crucible-tui/scripts/render-diff.ts:447` (`applyShard`), `crucible-tui/scripts/corpus.ts:368` (`strideSample`).
- **Property:** every element `parseWidths` returns is a positive integer (reading suggests `1.5` and `1e2` are accepted by the `Number` conversion, so non-integer widths can leak); the shards of `applyShard` for `index` in `1..=count` partition the input (disjoint, union equal, sizes differ by at most one); `strideSample(items, limit)` returns `min(n, limit)` distinct items including the first and last when `limit >= 2`.
- **Kind:** invariant; partition property for shards.
- **Generator:** trivial (a property-testing library such as fast-check under Bun's test runner; the repo already installs packages for its gates).
- **Purity:** pure.
- **Value/cost call:** medium-low. Tooling code with a small blast radius, but each is a three-line property and the first one probably fails. Good for a quick demonstration, not a priority.

### Not worth it (for now)

- `crucible-tui/crates/mdview/src/emoji_data.rs` and `width/tables.rs`: generated data tables; the generators and the sweep gate them, and property tests over a table lookup restate the table.
- `crucible-tui/crates/mdview/src/colour.rs` (`resolve_color`, `resolve_hyperlinks`): decisions over a small finite set of environment variables; enumerating the product exhaustively is stronger and simpler than sampling.
- `crucible-tui/crates/mdview/src/style.rs`: a committed SGR table checked by the `style-table` dump; nothing to generate.
- The `lists` modules (`lists.rs:124` `fix_nested_lists` and relatives): regex-driven transformations ported line for line with 880 lines of tests; the useful property is covered by the whole-document invariants in candidate 3, which exercise them with generated lists.

Best first target: candidate 1 (`scan` plus `wrap_ansi`), because it states the README's headline promise (lossless, ANSI-safe wrapping) as one generated property over strings, needs a single moderate generator, runs in-process, and its generator is reused by candidate 2 and by the escape handling in candidate 3.

## crucible-vault

Stack: Rust workspace, about 560 Rust files in 18 crates, edition 2024. The pure crates (`cv-text`, `cv-note`, `cv-actions`, `cv-index`, `cv-state`, `cv-protocol`, `cv-schema`, `cv-ingest`, `cv-malloc`) carry a structural rule that they do not depend on an async runtime, an HTTP client or the GUI toolkit; `cv-vault` (filesystem, writer, watcher, trash), `cv-providers`, `cv`, the editor and `views` are the impure layers. There is also a directory of shell migration scripts with their own tests.

Tests today: about 2,080 `#[test]` functions, mostly in `*_tests.rs` files beside the code, plus integration tests (for example `cv-index/tests/index.rs`) that build synthetic vaults in temporary directories. Styles are example-based unit tests, one "round trip every request variant" test in `cv-protocol` (`lib_tests.rs:41`), synthetic-corpus integration tests, and shell tests for the migration helpers. Gates: `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`, `cargo build --workspace --release`, a hermetic shell test, and `cargo tree` structural checks. Dev-dependencies are only `tempfile`.

The repo is a vault application over markdown notes, so most of its logic is text transformation, link and path resolution, an index, and small stores; that is dense property-testing territory. Candidates 1 to 4 are the strongest and have different generator costs.

### 1. URL canonicalisation is idempotent

- **Anchor:** `crucible-vault/crates/cv-text/src/url_canon.rs:165` (`canonicalize_url`), `:299` (`slug_for_canonical`).
- **Property:** for every input accepted, canonicalising the canonical form returns the same canonical form (`canon(canon(u).canonical).canonical == canon(u).canonical`); the canonical form has scheme `http` or `https`, a lowercase host, no fragment and none of the tracking parameters; and the derived filename slug depends only on the canonical form.
- **Kind:** idempotence plus invariant.
- **Generator:** needs a custom generator composing URLs from parts (scheme, host drawn from the special-cased hosts: YouTube, `youtu.be`, arXiv, X and a forum host, plus random hosts; paths with and without trailing slashes; query parameters including tracking names, repeated keys, percent-escapes and `+`; fragments). Moderate (about 40 lines).
- **Purity:** pure.
- **Value/cost call:** high. Canonical URLs are the deduplication key for link records, so non-idempotence means the same link is stored twice or looked up by the wrong key. The function re-serialises the query through a form-urlencoded writer and trims trailing slashes after rewriting, both classic non-idempotent steps.

### 2. Ignore-rule matcher against `git`

- **Anchor:** `crucible-vault/crates/cv-index/src/ignore.rs:87` (`glob`, private; reached through `IgnoreRules::is_excluded` at `:216`).
- **Property:** for any generated ignore file and any generated path, `IgnoreRules::is_excluded` agrees with `git check-ignore` run in a scratch repository, on the paths the index does not exclude for other reasons (dot-prefixed components are a vault-specific rule and must be filtered out of the comparison).
- **Kind:** oracle/differential (`git`).
- **Generator:** patterns from a glob alphabet (`*`, `**`, `?`, `[a-c]`, `[!x]`, `!` negation, trailing `/`, leading `/`, backslash escapes, trailing spaces) over a small segment vocabulary; paths of one to four segments drawn from the same vocabulary, both as files and directories. Moderate.
- **Purity:** the matcher is pure; the oracle needs a scratch directory and a `git` process, batched (`git check-ignore --stdin`). Git is a fleet-wide requirement, so this adds no new runtime.
- **Value/cost call:** high. The matcher is a hand-written recursive glob with backtracking for `*` and `**`, with git as an exact external specification; it also has a performance question (repeated `**` can backtrack badly), which a time-bounded property on long adversarial patterns would answer. Divergences are either bugs or documented simplifications, and a list of them is the useful output.

### 3. Frontmatter editing: model-based sequences

- **Anchor:** `crucible-vault/crates/cv-note/src/frontmatter.rs:462` (`FrontmatterDoc::set`), `:547` (`remove`), `:601` (`rename_key`), `:620` (`append_to_list`), `:380` (`set_edit`), `:81` (`span`).
- **Property:** for any document and any sequence of `set`, `remove`, `rename_key` and `append_to_list` calls, the parsed entries afterwards equal the same operations applied to a plain ordered list of key-value pairs (the model), the body text is byte-identical, the bytes of every entry not touched by an operation are byte-identical (comments and blank lines preserved), setting a key to its current value changes nothing (the documented "left byte-identical" promise), and `set_edit` applied as a splice gives the same text as `set`.
- **Kind:** stateful / model-based (the model is an ordered `Vec<(String, JsValue)>`), plus metamorphic (byte preservation of untouched regions).
- **Generator:** needs a custom generator for notes: optional BOM, LF or CRLF line endings, frontmatter blocks with scalar, quoted, list and multi-line entries, comments and blank lines between keys, and notes without frontmatter or with an unterminated block; plus a command generator (operation, key from existing and fresh keys, value). Hard: this is the most expensive generator in the survey, and the most valuable.
- **Purity:** pure; operates on `String`.
- **Value/cost call:** high. The editor and the daemon share this writer to change user notes in place; a bug corrupts a note that the user wrote. The code is a hand-written line scanner with documented edge-case behaviour (`remove` of the first key moves comments, with a revert on invalid results), exactly where examples run out.

### 4. Note-id store: stateful against a map model

- **Anchor:** `crucible-vault/crates/cv-state/src/note_ids.rs:75` (`note_id_bind`), `:88` (`note_id_move`), `:120` (`note_id_retire`), `:139` (`note_id_revive`), `:170` (`note_id_locate`), `:190` (`note_id_prune`).
- **Property:** after any sequence of bind, move, retire, revive and prune operations, a path never holds two live ids, ids are unique, a move preserves the id of the moved note, a retired id locates as retired (with its replacement when one was given) until pruned, and the set of live paths equals the model's.
- **Kind:** stateful / model-based; the model is a map from path to id plus a tombstone list.
- **Generator:** needs a stateful command sequence over a small path vocabulary (so collisions and re-binds are frequent) and an advancing clock for the retirement times.
- **Purity:** in-process over a SQLite file in a temporary directory (the store opens a database path; I did not check for an in-memory constructor). A per-case database is cheap but not free; run a few hundred cases.
- **Value/cost call:** high. Stable note identity across renames is the store's reason to exist, and the interesting behaviour (moving onto a path that holds a stale live id retires it first) is a multi-step interaction. The test module is about 560 lines of scenario tests.

### 5. Incremental index maintenance equals a full rebuild

- **Anchor:** `crucible-vault/crates/cv-index/src/index.rs:571` (`upsert_file`), `:624` (`remove_file`), `:653` (`rename_file`), `:500` (`reconcile`), `:465` (`rebuild`).
- **Property:** after any sequence of create, modify, delete and rename operations applied both to a scratch vault directory and incrementally to the index, the queryable state (file rows, link rows with their resolved targets, tags, tasks, properties) equals the state of an index freshly rebuilt from the directory; and `reconcile` after out-of-band edits reaches the same state.
- **Kind:** oracle/differential (the full rebuild is the oracle); stateful command sequence.
- **Generator:** needs a stateful command sequence over a small synthetic vault: note texts with links, embeds, tags, tasks and frontmatter drawn from small pools so that links frequently resolve, dangle and are re-targeted by renames.
- **Purity:** real filesystem and SQLite in a temporary directory; fast enough for a few hundred sequences. No daemon.
- **Value/cost call:** high value, medium-high cost. Link resolution depends on the whole file set (a new file can change what an old link points to), which is exactly what incremental maintenance gets wrong. An example test covers one create/modify/delete/rename story (`cv-index/tests/index.rs:441`).

### 6. Link-target resolver against a naive model

- **Anchor:** `crucible-vault/crates/cv-text/src/resolver.rs:72` (`Resolver::add`), `:85` (`remove`), `:111` (`resolve`), `:40` (`normalize`).
- **Property:** after any sequence of `add` and `remove`, `resolve(src, id, target)` equals the answer of a naive reference implementation that scans a list of all current paths (exact path, then case-insensitive path, then shortest-path match on basename key); `len()` equals the model's size; and `normalize` is idempotent and never emits `.`, empty or leading `..` segments.
- **Kind:** stateful / model-based (the model is a `Vec<(id, path)>` with linear scans), plus idempotence.
- **Generator:** moderate: paths from a small segment vocabulary with mixed case, `.md` and other extensions, and targets with `./`, `../`, trailing slashes and surrounding spaces.
- **Purity:** pure.
- **Value/cost call:** medium-high. Three hash maps kept in sync by `add` and `remove` is the textbook invariant-drift setup, and the naive model is ten lines. The same path logic also appears in `crucible-tui`'s `wikiresolve.rs`, so one set of generators and a shared oracle serves both.

### 7. Section insertion

- **Anchor:** `crucible-vault/crates/cv-text/src/sections.rs:96` (`insert_into_section`), `:59` (`find_section_range`).
- **Property:** for any document, header and payload, every line outside the target section is unchanged; `Replace` followed by `find_section_range` finds the section and its body is the payload; two `Append` operations leave the payloads in call order; a header that appears only inside a fenced code block is not treated as a section; a missing section is appended once, and calling `Replace` again with the same payload is a no-op.
- **Kind:** metamorphic and idempotence.
- **Generator:** moderate: markdown with headings at several levels, blank lines, fenced code blocks that contain heading-like lines, and CRLF endings.
- **Purity:** pure.
- **Value/cost call:** medium-high. This edits user notes; the fence rule and blank-line handling are the likely corners.

### 8. Text similarity

- **Anchor:** `crucible-vault/crates/cv-text/src/similar.rs:222` (`Shingles::jaccard`), `:213` (`containment_in`), `:23` (`normalize`).
- **Property:** `jaccard` is symmetric and within `[0, 1]`; `jaccard(a, a) == 1` for any text with at least one token; `containment(small, large)` is `1` when `small`'s tokens occur contiguously in `large`; the score is unchanged by case, surrounding whitespace and markdown emphasis markers (the normalisation's purpose); and `normalize` is idempotent.
- **Kind:** invariant and metamorphic.
- **Generator:** trivial (words from a vocabulary joined with random whitespace and punctuation, with the vocabulary size controlling overlap).
- **Purity:** pure.
- **Value/cost call:** medium. Cheap and the properties are the contract of a duplicate detector; existing tests use fixed vocabularies, so the surprise would be in the normalisation of odd markup.

### 9. Calendar and Moment formats

- **Anchor:** `crucible-vault/crates/cv-text/src/civil.rs:7` (`days_from_civil`); `crucible-vault/crates/cv-text/src/moment.rs:55` (`moment_to_strftime`), `:108` (`format_moment`), `:130` (`parse_moment_date_strict`).
- **Property:** `days_from_civil(y, m, d)` equals the day count from the `chrono` date type (already a dependency) for every valid date over a wide year range; for any format built from date tokens that pins a full date, `parse_moment_date_strict(format_moment(d, f), f) == Some(d)`; and `format_moment` never panics for any format string, returning an error for unsupported ones.
- **Kind:** oracle/differential (`chrono`) and round-trip.
- **Generator:** trivial for dates; moderate for formats (a token alphabet: `YYYY`, `YY`, `MM`, `M`, `DD`, `D`, `dddd`, `[literal]`, separators).
- **Purity:** pure.
- **Value/cost call:** medium-high for cost-benefit. A single known-answer test covers `days_from_civil` today (five dates); the differential covers the whole range for free.

### 10. Link-record merge

- **Anchor:** `crucible-vault/crates/cv-state/src/link_records.rs:151` (`merge`).
- **Property:** merging the same observation twice equals merging it once; the first-seen date never increases and the last-seen date never decreases as observations are merged; `source_notes` stays duplicate-free and keeps first-seen order; stored non-empty fields are never overwritten by empty incoming ones.
- **Kind:** idempotence and invariant (monotone fields); commutativity of the set-valued fields.
- **Generator:** moderate (record and input structs with optional strings, dates in valid and invalid forms, JSON flag values).
- **Purity:** pure.
- **Value/cost call:** medium-high. A merge function is the standard home of idempotence and monotonicity properties, and it is a pure function with a documented contract.

### 11. Relative-path validation

- **Anchor:** `crucible-vault/crates/cv-vault/src/path.rs:11` (`validate_rel_path`).
- **Property:** for any string accepted, joining it onto a root directory yields a path that stays inside the root (every component is a normal name; no `..`, no absolute prefix, no NUL, no backslash), and no accepted path is under a skipped folder or has a writer temp-file name segment.
- **Kind:** invariant (a safety boundary).
- **Generator:** trivial (strings over `/`, `.`, `\`, NUL, letters, spaces, the temp-file prefix and dot folders).
- **Purity:** pure.
- **Value/cost call:** medium-high. It is a security boundary for everything that writes under the vault, short enough to be fully understood, and one test enumerates the rejects and accepts by hand.

### 12. Template slugs, filenames, tags

- **Anchor:** `crucible-vault/crates/cv-text/src/template.rs:123` (`slugify`), `:154` (`title_filename`), `:175` (`normalize_tags`).
- **Property:** `slugify` output matches `[a-z0-9]+(-[a-z0-9]+)*` or is empty, and is idempotent; `title_filename` output has none of the forbidden characters, at most 120 characters, no leading or trailing space and no trailing dot, and is idempotent; `normalize_tags` is idempotent and returns unique, non-empty, `#`-free tags in first-seen order.
- **Kind:** idempotence and invariant.
- **Generator:** trivial (Unicode strings, biased toward accents, ligatures, fullwidth forms and punctuation).
- **Purity:** pure.
- **Value/cost call:** medium. Three small pure functions that generate file names and tags; likely to pass, but nearly free and they pin the contract against later edits.

### 13. Shell migration helpers (optional)

- **Anchor:** `crucible-vault/deploy/migrations/lib/anchor.sh` (for example `anchor_array_add`, documented in its header) with `crucible-vault/deploy/migrations/lib/test-anchor.sh` as the existing example tests.
- **Property:** for any generated TOML-like file and any call, exit status 2 or 1 leaves the file byte-identical; exit 0 changes exactly one line and a second identical call then exits 2; the target table's other lines are untouched.
- **Kind:** idempotence and metamorphic.
- **Generator:** moderate (a file generator and a driver in another language).
- **Purity:** each case runs the script in a subprocess against a temporary file; hundreds of cases take seconds.
- **Value/cost call:** low-medium. The helpers are small and tested by 146 lines of shell; a driver in another language is a new moving part for a few-line awk edit. Include only if the shell edits start causing migration incidents.

### 14. Protocol serialisation

- **Anchor:** `crucible-vault/crates/cv-protocol/src/lib.rs:134` (`Request`) and `:43` (`RpcRequest`).
- **Property:** `from_value(to_value(x)) == x` for every request, response and notification.
- **Kind:** round-trip.
- **Generator:** trivial with a derived generator over the types.
- **Purity:** pure.
- **Value/cost call:** low. The types derive their serialisation, an existing test already enumerates every request variant (`cv-protocol/src/lib_tests.rs:41`), and a derived round trip is correct by construction. Worth doing only for the custom serde attributes (tagged and renamed enums).

### Not worth it (for now)

- `crucible-vault/crates/cv-vault/src/writer.rs`, `watcher.rs`, `trash.rs`, `fs.rs`: filesystem effects, timing and concurrency; example and integration tests are the right tool, and a model-based filesystem test is a project of its own. `trash.rs:283` (`percent_encode_path`) is the one pure function there and is a one-line round-trip if a decoder exists.
- `crucible-vault/crates/editor`, `views`, `editor-model` (about 230 files): GUI and view state. The editor model may have pure state machines worth a later look, but they were not sampled.
- `crucible-vault/crates/cv-providers`, `cv-ingest` network and mail adapters: I/O dominated. The text cleaning in `cv-ingest` (mail and transcript clean-up) is a plausible later target for idempotence and "never loses content" properties but was not read in depth.
- `crucible-vault/crates/cv-schema`: schema and documentation generation over static definitions; golden tests fit better.

Best first target: candidate 1 (URL canonicalisation idempotence), because a non-idempotent canonicaliser silently splits link records, the function is pure, and the generator is a straightforward composition of URL parts. Candidate 3 (frontmatter editing) is the highest-value target but needs the repo's hardest generator, so it should follow once the team has the tooling in hand; candidate 11 (path validation) is the cheapest safety property.

## Cross-repo patterns

- **Hand-written codecs and grammars that claim to round-trip.** IPC lines, the field codec, the action grammar, KDL records, the daemon wire protocol, session headers, file-name encodings. One generator style (arbitrary strings biased toward each codec's special characters) and one property shape (`parse(render(x)) == x`, plus "never panics on arbitrary input") apply to roughly a dozen functions across `crucible-dev-env`, `crucible-term` and `crucible-vault`. Start here: it is the cheapest adoption and it already points at probable defects.
- **Ports of a JavaScript original.** Path normalisation, display width, regex-defined link grammar and shell-style splitting are specified by behaviour of a JavaScript library or a regular expression written in a comment. The Bun runtime is already a toolchain requirement in `crucible-tui` and `research`, so a batched differential against the original is available at a cost of one subprocess per run. The same normalisation logic is implemented separately in `crucible-tui` (`wikiresolve.rs`) and `crucible-vault` (`resolver.rs`); one shared set of path generators and one oracle serves both.
- **Real external oracles on the host.** `git` for ignore-file matching, `chrono` for calendar arithmetic, the previous release binary for render differentials, a plain model (list or map) for stores and registries.
- **Stateful registries with a simple model.** The layout world, the note-id store, the link resolver, the incremental index, the frontmatter editor and the placement ordering are all "operations on a structure with an obvious naive model". A shared test helper for "generate a command sequence, run it on the real thing and the model, compare" would serve all of them; each crate defines only its command enum.
- **Invariant checkers that already exist.** `World::check_invariants`, the tree's `check_invariants`, the `find_first_overflow` oracle and the snapshot fidelity boundary are assertions waiting for a generator. These are the cheapest properties of all: no new oracle to write.
- **Existing seeded generators.** `crucible-term-core` already has a hand-rolled xorshift VT corpus; `crucible-tui` has a corpus sweep over fixed documents. Replacing a seed with a shrinkable generated value keeps the same checks and adds minimal counterexamples.
- **Where it does not apply.** Compositor, daemon, window, GPU and network glue, generated data tables, and small finite decision functions (enumerate them instead). Roughly a third of the files in each repo fall here, and they are not the place to start.
- **Cost shape.** Trivial generators (enums, small structs, paths, byte strings) cover about two thirds of the candidates above; custom structured generators (VT streams, notes with frontmatter, markdown documents, split trees) cover the rest and are reusable within a repo. None of the surveyed repos has a generation or shrinking library, so the first adoption also pays a one-time dependency decision per language (Rust and TypeScript).
