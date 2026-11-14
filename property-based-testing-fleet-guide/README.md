# Where property-based testing would pay off in eight public repos, and a pilot that tried it

This investigation read eight public repos (`crucible-dev-env`, `crucible-term`, `crucible-tui`, `crucible-vault`, `inference-engine`, `research`, `scripts`, `semsearch`) for places where property-based testing (generated inputs checked against stated properties, with automatic shrinking of failures) would add value over their example tests, surveyed the available tools, and ran a two-target pilot. None of the eight repos uses a property-testing or fuzzing library today. The survey, which is from reading source only, ranks more than 70 candidate properties; the best ones are hand-written codecs and parsers that claim to round-trip, canonical forms and normalisers that should be idempotent, numeric and ranking cores with an obvious slow oracle, ports of JavaScript originals, and registries with a simple naive model. The pilot ran Hegel (a beta Hypothesis-derived library) against three Rust functions and three bun functions: it found one real defect, in `crucible-vault`'s URL canonicaliser (canonicalising a canonical arXiv URL ending in `.pdf/` changes it, which defeats the deduplication the module exists for), a latent contract gap in `crucible-dev-env`'s `Action` display/parse grammar, and no defect in this repo's interval statistics. The main recommendation is to adopt it as a dev-dependency-only addition, starting with the pure codecs and canonical forms in the Rust repos and the statistics-style numeric cores, using a fixed seed with a high case count in the gate because the one defect found needed a conjunction of three features and was missed by default settings, and to treat the beta Hegel as acceptable for small, few properties with `proptest` and `fast-check` as the stable fallbacks.

## Short answer

- **Where it pays:** pure functions with a statable contract that example tests sample thinly. In order of yield per effort: codecs and grammars (`parse(render(x)) == x`, and "never panics on any input"), canonical forms and normalisers (`f(f(x)) == f(x)`), numeric and ranking cores checked against a naive recomputation, ports whose original is a ready oracle, and registries or stores checked against a plain map or list model.
- **Where it does not:** compositor, daemon, window, GPU, network and filesystem glue; generated data tables; tiny finite decision functions (enumerate them instead); shell scripts that wrap system commands. Roughly a third of the files in each Rust repo fall in this group.
- **Which tool:** Hegel worked first try in both Rust and TypeScript (under `bun test`) in the pilot, but it is beta (0.x, breaking changes allowed). The stable choices are `proptest` for Rust and `fast-check` for bun/TypeScript; Hypothesis for Python. Both stable choices are from general knowledge and were not run here.
- **First three steps, in priority order:**
  1. In `crucible-vault`, turn the pilot's `canonicalize_url` counterexample into a permanent example test and decide the fix; then add the idempotence property permanently with a fixed seed and at least 300,000 cases.
  2. In `crucible-dev-env` and `crucible-term`, add round-trip and no-panic properties for the three codecs (`ipc.rs` request lines and `field.rs`; the daemon wire codec), which need only enum and string generators and finish in milliseconds.
  3. Add one pure-numeric property per Rust repo that has one (`clamp_usage` in `inference-engine`, `fuse` in `semsearch`), then the stateful layout-world test in `crucible-dev-env` as the first model-based test.

## What property-based testing is, in one screen

A **property** is a statement that must hold for every input of some kind ("decoding an encoded message returns the message"), written as an ordinary test function that takes generated values. A **generator** produces those values (integers, strings, enums, or structures built from smaller generators), usually thousands per property. When a case fails, **shrinking** reduces the failing input to a minimal one (the pilot's `Action` counterexample shrank to `SetLayout("")`), and **replay** re-runs that exact case (Hegel prints a copy-pasteable reproduce attribute; it also keeps failures in an example database and replays them first on the next run). The work moves from picking examples to stating contracts and writing generators that reach the interesting branches; the pilot found the generators, not the properties, to be most of the effort.

It differs from the other two modes in the explainer from Antithesis that started this investigation (credited below):

- **Fuzzing** is long-running and coverage-guided, aims at crashes and security faults, often feeds invalid input to code the tester does not own, and is not a per-commit gate. For Rust parsers, `cargo-fuzz` and `bolero` exist (from general knowledge, unverified here); `bolero` is meant to run one harness both as a property test and as a fuzz target.
- **Whole-system deterministic simulation testing with fault injection** states properties over a whole deployed system in a simulated environment (the Antithesis product). It is hosted and out of reach for a self-hosted fleet. Hegel and Bombadil are built to run under it later, so tests written now are not wasted.
- **Property-based testing libraries** run inside `cargo test`, `bun test` or `pytest`, need no infrastructure, and are the mode in reach here.

Bombadil sits between the modes: it runs locally and drives a running terminal or web program as a randomised explorer. It is discussed under tool choice below.

## Kinds of property, each with a fleet example

The anchors are `repo/path:line` of the function under test, as of the surveyed checkouts. Examples marked *pilot* were run; the rest are candidates from reading only.

| Kind | What it states | Fleet example |
| --- | --- | --- |
| Round-trip | decoding the encoding returns the original | `crucible-term/crates/crucible-term/src/wire.rs:133` (`encode`) and `:283` (`decode`): `decode(&encode(&m))` returns `m` for every `Msg`. *Pilot*: `crucible-dev-env/crates/crucible-keys/src/action.rs:260` and `:387`, `Action` `Display` then `FromStr` |
| Invariant | a stated property holds on every output | `semsearch/crates/semsearch/src/query.rs:53` (`build_fts_query`): every term is a double-quoted string with no unpaired quote, so user text cannot become FTS syntax; `inference-engine/sidecar/rs/src/protocol.rs:548` (`clamp_usage`): the three input columns sum to exactly the window |
| Oracle / differential | agrees with an independent implementation | `crucible-vault/crates/cv-index/src/ignore.rs:87` (`glob`, reached through `IgnoreRules::is_excluded`): agrees with `git check-ignore`; `crucible-tui/crates/mdview/src/wikiresolve.rs:29` (`normalize`): equals Node's `path.posix.normalize` |
| Idempotence | applying twice equals applying once | *Pilot*: `crucible-vault/crates/cv-text/src/url_canon.rs:165` (`canonicalize_url`), which fails (found a defect) |
| Metamorphic | a change to the input changes the output in a known way | `crucible-dev-env/crates/crucible-compositor/src/persist/placement.rs:298` (`insert_index`): placing saved windows in any arrival order leaves them in saved-index order. *Pilot*: `research/scripts/lib/measure-stats.mjs:134` (`newcombeDiff`) is antisymmetric under swapping the two groups |
| Stateful / model-based | after any command sequence, the real structure matches a simple model | `crucible-dev-env/crates/crucible-layout/src/world/mod.rs:135` (`World::check_invariants`) after any sequence of `World` operations; `semsearch/crates/semsearch/src/vector.rs:139` (`Codes::nearest`) against a brute-force sorted scan. Not piloted |
| No-crash robustness | never panics or loops, on any input | `crucible-term/crates/crucible-term/src/wire.rs:235` (`decode_body`) on arbitrary bytes. *Pilot*: `canonicalize_url` on 20,000 generated inputs, no panic |

## Recurring fleet patterns

One property style tends to apply repeatedly. These are the cross-repo patterns the surveys found ([crucible repos](survey/crucible.md), [other repos](survey/others.md)).

- **Hand-written codecs and grammars that claim to round-trip.** IPC lines, the field codec, the action grammar, KDL records, the daemon wire protocol, session headers and file-name encodings (`crucible-dev-env`, `crucible-term`, `crucible-vault`). One generator style (strings biased toward each codec's special characters) and one property shape cover roughly a dozen functions.
- **Existing invariant checkers waiting for a generator.** `World::check_invariants`, the layout tree's `check_invariants` (`crucible-layout/src/tree.rs:570`), the `find_first_overflow` oracle (`crucible-tui/crates/mdview/src/overflow.rs:25`) and the snapshot fidelity boundary in `crucible-term-core`. These are the cheapest properties: the assertion already exists.
- **Hand-rolled seeded corpora.** `crucible-term-core` has an xorshift VT corpus generator with fixed seeds (`crucible-term-core/tests/common/mod.rs`), `crucible-tui` has a corpus sweep over fixed documents, `semsearch` and `research` use seeded loops. A property-test library adds shrinking, replay and a shared generator vocabulary; the checks stay the same.
- **Ports of JavaScript originals with a ready oracle.** Path normalisation, display width, the wiki-link grammar (defined by a regex in a doc comment), shell-style word splitting, and the number formatting in `inference-engine`. Bun is already a toolchain requirement in `crucible-tui` and `research`, so a batched differential against the original costs one subprocess per run. `crucible-tui` (`wikiresolve.rs`) and `crucible-vault` (`resolver.rs`) implement the same path logic, so one set of path generators and one oracle serves both.
- **Twin implementations across languages.** FNV-1a in Rust and Python, the Rust validator and its generated TypeScript twin, Rust and JavaScript number formatting, two sign-code paths in `semsearch`, the Perl date conversion against GNU `date`. Each side is the other's oracle; a cross-process variant needs a small driver, which could be shared.
- **Registries and stores with a naive model.** The layout world, the note-id store, the link resolver, the incremental index, the frontmatter editor, the placement order, the sign-code index. A shared "generate a command sequence, run it on the real thing and on the model, compare" helper would serve all of them.
- **Subprocess oracles available on the host.** `git` for ignore matching, `date` for calendar conversion, `sh` for shell quoting and word splitting, `chrono` (already a dependency) for calendar arithmetic, the previous release binary for render differentials.
- **Safety invariants on destructive code.** The kernel keep-set and guarded removal in `scripts`, the usage window in `inference-engine`, path validation in `crucible-vault`. State the invariant once and check it over generated inputs.

## Per repo

Each section gives stack and tests today, the top candidates (value is the surveys' call), what not to bother with, and a best first target. The full ranked lists, with generators and purity notes, are in [survey/crucible.md](survey/crucible.md) and [survey/others.md](survey/others.md). Every suspected defect below is **unconfirmed, from reading only** unless a pilot verdict is stated. Anchors are as of the surveyed checkouts and were verified by grepping the signature line, not by running anything.

### crucible-dev-env

Rust workspace of six crates for a Wayland compositor and desktop environment, about 1,100 `#[test]` functions: example unit tests, small hand-picked value "grid" loops, and `World::check_invariants` called after hand-written operation sequences. No generator or fuzzing dev-dependency. Gates are fmt, clippy, tests, audit, an offline Trivy scan and a `--help` gate.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `crucible-compositor/src/ipc.rs:175`, `:216` | `parse(to_line(r)) == r` for non-empty string arguments; `parse` never panics | round-trip | trivial (enum plus special-character strings) | high |
| `crucible-persist/src/field.rs:8`, `:26` | `decode_field(encode_field(s)) == Some(s)`; encoded form has no `:`, TAB, LF, CR | round-trip, no-crash | trivial | medium-high |
| `crucible-layout/src/world/mod.rs:135` with `world/windows.rs`, `world/outputs.rs` | after any operation sequence `check_invariants` holds and counts match a model | stateful | moderate (about 30 lines of command enum) | high |
| `crucible-layout/src/geometry.rs:317`, `:285`, `:193` | with zero gaps, leaf rectangles are disjoint and sum to the output area; `Rect::subtract` matches a brute-force pixel set | invariant, oracle | trivial for `Rect` | high |
| `crucible-keys/src/action.rs:260`, `:387` | `a.to_string().parse() == Ok(a)` | round-trip | moderate | medium-high (piloted) |

- **Suspected, unconfirmed:** `Request::SetRoot(Some("-".into()))` encodes to `root -`, which `parse` turns into `SetRoot(None)` because `-` is the "clear the root" sentinel; `OpenFolder` and `Capture` use `to_string_lossy`, so non-UTF-8 paths cannot round-trip. Not run.
- **Pilot verdict, `Action`:** the survey's three hypotheses were tested; see the pilot section. Commands with leading or trailing whitespace and empty commands are out of contract; a layout name with a space or an empty one is a latent gap in the type's contract.
- **Do not bother:** `xwayland.rs`, `udev/`, `pointer_lock.rs`, `input/execute.rs`, `focus.rs` (Smithay glue needing a fake compositor), `crucible/src/mem.rs` and the launch/resume modules (process and `/proc`), and the chrome and config helpers except as a warm-up.
- **Best first target:** the IPC codec together with the field codec: pure, enum-only generators, milliseconds per run, and a possible counterexample already visible from reading. The layout world is the higher-value second step and the first stateful test.

### crucible-term

Rust workspace of two crates (the VT session model and the daemon, wire protocol, window host and renderer), about 150 `#[test]` functions. `crucible-term-core/tests/common/mod.rs` already has a seeded xorshift generator producing escape-heavy corpora for snapshot and delta tests. No generation library.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `crucible-term/src/wire.rs:133`, `:235`, `:283` | `decode(encode(m))` returns `m`; every strict prefix of a frame decodes to `None` or an error; arbitrary bytes never panic | round-trip, no-crash | trivial to moderate (`Msg` has seven variants, `OsString` argv) | high |
| `crucible-term-core/src/snapshot.rs:24`, `delta.rs:64`, `:106`, `:130` | a session fed a snapshot reproduces the grid; `apply(between(a, b), a) == b` | round-trip, differential | moderate (replace the seed with a shrinkable action list) | high |
| `crucible-term/src/selection.rs:72`, `:150`, `:192` | spans stay on existing rows and contain the click column; `text()` never emits a spacer cell | invariant | moderate (grids with wide cells and spacers) | medium-high |
| `crucible-term/src/cli.rs:69`, `config.rs:491` | `parse` never panics; `--flag=value` and `--flag value` agree; a failed override leaves settings unchanged | no-crash, metamorphic | trivial to moderate | medium |
| `crucible-term-core/src/ed1.rs:32` | the wrapper equals the unwrapped VT core except where ED 1 differs | differential | moderate (shared VT generator) | medium |

- **Suspected, unconfirmed:** none stated as defects. One note on a property to avoid: `decode` accepts any non-zero byte as `reattached = true`, so `encode(decode(b)) == b` does not hold for arbitrary bytes; the correct property is one-directional.
- **Do not bother:** the daemon, window host, client and font modules (Wayland, PTY, socket, fontconfig glue; daemon tests cover the lifecycle), and `identity.rs:46` `decide` (two booleans; enumerate).
- **Best first target:** the wire codec, a network-facing binary parser with three tests today and an enum generator. The snapshot/delta round trip is the highest-value one and its corpus generator is already half of a property test.

### crucible-tui

Rust workspace of three crates (`mdview`, `jsonedit`, `ofm`) plus Bun and TypeScript scripts and tests, about 410 Rust `#[test]` functions. A hidden `__parity` subcommand and a corpus sweep compare rendered output over a fixed corpus at many widths. Gates run through `bun run verify`. The sweep script's own comments record that a three-width gate sampled an overflow defect "essentially at random".

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `mdview/src/wrap.rs:184`, `ansi.rs:177`, `:221`, `text.rs:70` | the concatenation of scanned spans equals the text; wrapping loses and duplicates no visible text; each line fits the width unless one grapheme is wider | round-trip, invariant | moderate (escape-weighted alphabet, about 30 lines) | high |
| `mdview/src/table.rs:424`, `:491` | one width per column, none below the floor, natural widths when they fit, monotone in the target | invariant, metamorphic | trivial for widths | high cost-benefit |
| `mdview/src/wikiresolve.rs:29`, `:64`, `:73`, `:95` | equals Node's `path.posix` counterpart; `normalize` is idempotent | differential, idempotence | trivial (segment vocabulary) | high cost-benefit |
| `ofm/src/wikilink.rs:20` | agrees with the regex in its doc comment; never panics | differential, no-crash | trivial to moderate | medium-high |
| `jsonedit/src/indent.rs:126`, `validate.rs:105` | `reindent` changes only leading whitespace of listed lines, result still parses to the same value, idempotent | invariant, metamorphic | moderate to hard (JSON tree with comments and odd indentation) | high |

- **Suspected, unconfirmed:** `scripts/sweep-options.ts:42` (`parseWidths`) appears to accept `1.5` and `1e2` through its `Number` conversion, so non-integer widths can leak. Not run.
- **Also in the survey:** whole-document render invariants (`mdview/src/render.rs:303`, hard markdown generator but it turns the fixed-corpus sweep into a shrinking search), editor-command splitting against `sh` (`jsonedit/src/edit.rs:51`), string width against the `string-width` npm library (will produce a list of tolerated disagreements, not pass/fail).
- **Do not bother:** `emoji_data.rs` and `width/tables.rs` (generated tables), `colour.rs` (enumerate the environment variable product), `style.rs` (committed table), the `lists` modules (covered by whole-document invariants).
- **Best first target:** `scan` plus `wrap_ansi`: it states the README's headline promise (lossless, ANSI-safe wrapping) as one property, needs one moderate generator, and that generator is reused by the table and render properties.

### crucible-vault

Rust workspace of about 560 Rust files in 18 crates; the pure crates (`cv-text`, `cv-note`, `cv-index`, `cv-state`, `cv-protocol` and others) carry nearly all the candidates. About 2,080 `#[test]` functions, one "round trip every request variant" test, synthetic-vault integration tests, shell tests for migration helpers. Only dev-dependency is `tempfile`. The survey sampled this repo by crate and skipped the editor, daemon, providers and watcher.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `cv-text/src/url_canon.rs:165`, `:299` | canonicalising a canonical form returns it unchanged; scheme, host, fragment and tracking-parameter invariants | idempotence, invariant | moderate (URL from parts, about 60 lines) | high (piloted: defect found) |
| `cv-note/src/frontmatter.rs:462`, `:547`, `:601`, `:620` | after any edit sequence entries equal an ordered-list model, the body is byte-identical, untouched entries are byte-identical | stateful, metamorphic | hard (notes with BOM, CRLF, comments, odd entries) | high |
| `cv-index/src/ignore.rs:87` via `:216` | `is_excluded` agrees with `git check-ignore` | differential | moderate (glob alphabet, batched `git` call) | high |
| `cv-state/src/note_ids.rs:75` to `:190` | after any bind, move, retire, revive, prune sequence ids stay unique and live paths match a map model | stateful | moderate (SQLite in a temp directory) | high |
| `cv-vault/src/path.rs:11` | an accepted relative path joined onto a root stays inside it | invariant | trivial | medium-high |

- **Pilot verdict:** the URL canonicaliser idempotence defect was found, see the pilot section. No other vault property was run.
- **Also in the survey:** incremental index equals a full rebuild (`cv-index/src/index.rs:571`), the link resolver against a naive model (`cv-text/src/resolver.rs:72`), section insertion, text similarity, calendar and Moment formats against `chrono`, link-record merge, template slugs, protocol serialisation (low value: derived serialisation and one existing test).
- **Do not bother:** the writer, watcher, trash and `fs.rs` (filesystem effects, timing), the editor, `views` and `editor-model` (about 230 files of GUI and view state, not sampled), provider and ingest network adapters, `cv-schema`.
- **Best first target:** with the idempotence property found and demonstrated, the cheapest next safety property is path validation; the highest-value one is frontmatter editing, but it needs the repo's hardest generator, so it should follow once the tooling is familiar.

### inference-engine

Rust (gateway, codex sidecar, console API server and contract crate), Python, TypeScript and `.mjs`, and shell smoke scripts. Tests are `cargo test`, `unittest` discovery and `node:test`: unit, golden and fixture, a case-table differential harness. The gateway is a same-protocol relay; translation code lives in the sidecar and the console contract crate (a Rust validator with a generated TypeScript twin). The repo is about 60,000 lines; the survey did not open the llama, ONNX, TTS or console front-end code.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `sidecar/rs/src/protocol.rs:548`, `:536` | when `clamp_usage` returns `Some(u)`, the three input columns sum to exactly the window and `output` is unchanged | invariant, oracle | trivial (three `u64` plus a window; values near `u64::MAX`) | high |
| `console/crates/domain/src/jsout.rs:13`, `js.rs:127`, `:20` | `number_to_string(x)` equals JavaScript's `String(x)`; `js::number` equals `Number(s)`; `js::trim` equals `s.trim()` | differential | floats and whitespace strings; needs a cross-process bun harness | high |
| `console/crates/domain/src/validate.rs:60` with `runtime.ts` | Rust and TypeScript validators agree on valid/invalid and the issue list | differential | custom near-valid JSON mutator plus a harness | medium |
| `sidecar/rs/src/request.rs:370` | `canon(canon(v)) == canon(v)`; key order never matters | idempotence, metamorphic | recursive JSON, depth-bounded | medium |
| `sidecar/rs/src/protocol.rs:107` | render-then-parse of model ids; arbitrary Unicode never panics | round-trip, no-crash | small custom | medium |

- **Suspected, unconfirmed:** none stated as defects. The survey flags the `u128` widening in `clamp_usage` as the interesting overflow corner.
- **Also in the survey:** FNV-1a in Rust and Python (`router/gateway/src/catalog.rs:85`, `control/catalog_intents.py:80`), transcript rendering budget, gateway model resolution, catalog id validation, session id extraction, and Python list-merge helpers (a Hypothesis quick win but not a discovery engine).
- **Do not bother:** the gateway relay handlers (`router/gateway/src/relay.rs`) and sidecar persona or session code (I/O-heavy glue around axum, child processes and sockets).
- **Best first target:** `clamp_usage`: pure, numeric, a crisp conservation property, five lines of generator, in a crate that already has a unit-test module.

### research

Bun scripts with no dependencies: the measurement driver and its statistics, and the index renderer. Tests are `bun test` files with worked examples, published reference values, a seeded end-to-end run and a golden report.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `scripts/lib/measure-stats.mjs:110` (`clopperPearson`) | `0 <= lo <= k/n <= hi <= 1`, symmetry, narrows weakly as alpha grows | invariant, metamorphic | trivial | high (piloted: pass) |
| `scripts/lib/measure-stats.mjs:134` (`newcombeDiff`) | contains the point difference, antisymmetric under swapping groups, within `[-1, 1]` | invariant, metamorphic | trivial | high (piloted: pass) |
| `scripts/lib/measure-stats.mjs:28`, `:43` (`percentile`, `hierBootstrap`) | within min and max, monotone in `q`, replicates within the data range, same seed gives same output | invariant, oracle | lists of floats, nested for builds | medium-high |
| `scripts/lib/measure-run.mjs:79`, `:95` (`parseProtocol`, `shQuote`) | `MEASURE` lines round-trip; `shQuote(s)` through a real `sh` reproduces `s` | round-trip, differential | strings with quotes and newlines | medium |
| `scripts/lib/measure-run.mjs:13` (`validateConfig`) | valid configs give `[]`; each single mutation gives a non-empty list | invariant | custom config and mutation generator | medium |

- **Pilot verdict:** the first three properties of `clopperPearson`, the `newcombeDiff` properties and `percentile` all passed; `newcombeDiff` with `n = 0` returns NaN, judged out-of-contract (see the pilot section). Nothing found in the statistics code, within the generated ranges.
- **Suspected, unconfirmed:** `parseProtocol` uses `Number(...)`, so inputs such as `0x10` parse as numbers; whether that is intended needs a decision. Not run.
- **Do not bother:** `build-id.mjs` (shells out to `git`) and the `Channel` process management (a stateful test against a real `sh` for little discovery).
- **Best first target:** already done as the pilot. Next: `parseProtocol` with `shQuote`, because the quoting property is load-bearing for a tool that builds remote shell scripts from argv.

### scripts

POSIX shell, Perl modules and scripts, a small vendored C build system, one Bun tool. Tests are shell smoke scripts, Perl unit scripts with a hand-rolled harness and golden dumps. Most shell scripts are glue over system commands or the network; the Perl modules are the pure layer.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `util/debian-maintenance/debian-maintenance.pl:251`, `:285`, `:151` | the protected set contains the running kernel and the newest N, protected and removable are disjoint and cover the list, nothing boot-critical is purged | invariant (safety), oracle | custom kernel records, seams already faked | high |
| `util/cache-prune/perl/CachePrune/DockerResidue.pm:58` (`hbytes`) | `hbytes("{n}{u}") == n * factor(u)`; malformed input gives `undef` | oracle, no-crash | small custom | high |
| `.../DockerResidue.pm:106`, `:94` (`ts`, `days_from_civil`) | equals GNU `date -u -d` minus the offset | differential | dates with offsets | high |
| `.../CachePrune/Actions.pm:119`, `:133`, `:177` | `guarded_remove` never removes outside the root, the root, or a symlink target | invariant (safety), stateful | hard (directory trees with symlinks in a temp directory) | medium-high |
| `.../DockerResidue.pm:77`, `:365` | `norm` is idempotent; `subst_args` terminates and leaves no `$VAR` | idempotence, no-crash | custom image references | medium |

- **Suspected, unconfirmed (all from reading, none run):** `hbytes` floors through a float multiply, so byte counts above 2^53 lose precision; `ts` accepts any day 1 to 31 for any month, so February 30 rolls over; `path_join_` calls `strlen(s)` before its `if (s)` test, so a NULL argument would crash; `strncache` compares the full input in its bucket lookup when only the first `n` characters were hashed.
- **Tool note:** there is no mainstream property-testing library for POSIX shell and only a thin one for Perl (both from general knowledge, unverified here). The practical route is a seeded loop inside the existing Perl unit script (generation without shrinking) or a host-language driver. The C code is vendored and unity-build, needs a compiled harness, and findings are likely report-only.
- **Do not bother:** `util/*.sh` helpers such as `youtube-id.sh`, `volume.sh`, `battery.sh` and the alias files (a line or two of `grep` or `cut` around `curl`, `pactl`, `/sys` and `git`).
- **Best first target:** `select_protected_kernels` and its purge list: a destructive tool with a stated safety contract, a one-line model, and a unit script that already fakes the seams.

### semsearch

A small Rust library crate (about 1,800 lines): SQLite plus FTS5, query building, reciprocal-rank fusion, an in-memory sign-code vector index. Unit and integration tests; the vector tests already use a hand-rolled seeded generator and exact-order oracles. The crate pins exact dependency versions and needs a written approval step for any new dev-dependency.

| Anchor | Property | Kind | Generator effort | Value |
| --- | --- | --- | --- | --- |
| `crates/semsearch/src/fusion.rs:29` (`fuse`) | output is a permutation of candidates, sorted by fused score with the stated tie-breaks, score equals the direct recomputation | invariant, oracle | small custom | high |
| `.../vector.rs:139`, `:111`, `:122` (`Codes::nearest`) | after any insert and remove sequence, `nearest(q, pool)` equals the first `pool` rowids of a brute-force sort, compared as a set | stateful | stateful, small dimensions crossing the 64-bit word boundary | high |
| `.../query.rs:19`, `:35`, `:53` | tokens non-empty, lower-case, duplicate-free; every FTS term quoted; `*` only on the last term | invariant, no-crash | arbitrary strings | high |
| `.../query.rs:73`, `:100` | `normalize_for_match` idempotent; `title_match_score` within 0 to 1 | idempotence, invariant | arbitrary strings | medium |
| `.../vector.rs:49`, `:53`, `:63`, `:79`, `:28` | `from_blob(to_blob(v)) == v` bitwise; the two sign-code paths agree | round-trip, differential | float vectors with edge values | medium |

- **Note:** `Codes::nearest` returns its result unsorted, so the property compares sets or sorts first.
- **Do not bother:** `search.rs` leg composition and SQL fetch helpers beyond hit-count and determinism (golden and vector integration tests pin ranks).
- **Best first target:** `fuse`: pure, conservation-and-order laws with a naive oracle, a few lines of generator, no database. The vector index model is the close second and better at finding a real bug.

## Pilot result

Two pilots were written and run in this folder under [pilot/](pilot/), against real code in sibling checkouts, depending on it by relative path with no copied source and no edit to any target repo. Every timing below is *indicative*: a single quick local run, not measured to this repo's timing standard (`methods/timing.md`), and not repeated.

**Versions.** `rustc 1.99.1 (58cf8f9c3 2026-10-13)`, `cargo 1.99.1 (5f94df478 2026-08-27)`, `bun 1.4.4 (38afee6c8)`. Hegel for Rust: crate `hegeltest` 0.52.6 (from `hegeltest = "0.52"`). Hegel for TypeScript: `@hegeldev/hegel` 0.5.7. Target commits: `crucible-vault` `49a46372` (it moved from `86a6069d` during the work through other commits, with no diff under `crates/cv-text` between the two), `crucible-dev-env` `d02df23`. The research repo's own statistics file was tested in place; its commit was not recorded.

**Results by property.**

| Target | Property | Cases | Wall time (indicative) | Result |
| --- | --- | --- | --- | --- |
| `canonicalize_url` | no panic on any generated input | 20,000 | under 1 s | pass |
| `canonicalize_url` | documented invariants (http(s) result, no fragment, lower-case domain, no tracking parameter) | 20,000 | under 1 s | pass |
| `canonicalize_url` | idempotent | 300,000 | about 2 s | **fails** |
| `canonicalize_url` | idempotent, inputs mentioning arXiv set aside | 100,000 | about 1 s | pass |
| `Action` `Display`/`FromStr` | round trip, payloads within the documented contract | 20,000 | under 1 s | pass |
| `Action` `Display`/`FromStr` | round trip, free-text payloads | 20,000 | under 1 s | fails (expected, asserted with `should_panic`) |
| `clopperPearson` | range and endpoints, symmetry, weak narrowing in alpha | 500 each | file total about 14 to 16 s, mostly `clopperPearson` | pass |
| `newcombeDiff` | contains the difference, antisymmetric, in `[-1, 1]`, no NaN, for `n1, n2 >= 1` | 500 | (in the file total) | pass |
| `percentile` | range, exact at 0 and 1, monotone, permutation-invariant, no input mutation | 500 | (in the file total) | pass |

The whole `url_canon` test binary takes 2.5 to 4 s and `action_roundtrip` about 0.17 s.

**The defect: `canonicalize_url` is not idempotent.** The counterexample, shrunk by Hegel, verbatim from the first run:

```
let s = "http://arxiv.org/abs/2101.00001.pdf/";
assertion `left == right` failed: input "http://arxiv.org/abs/2101.00001.pdf/" canonicalised to "http://arxiv.org/abs/2101.00001.pdf"
  left: Some("http://arxiv.org/abs/2101.00001")
 right: Some("http://arxiv.org/abs/2101.00001.pdf")
```

Cause: the arXiv rewrite uses `^/(?:abs|pdf)/([^/]+?)(?:\.pdf)?$` against the path while the trailing slash is still present, so `/abs/2101.00001.pdf/` does not match and keeps its `.pdf`; the trailing-slash trim runs afterwards (`url_canon.rs:230`). Canonicalising the result again then matches and strips the `.pdf`. Consequence: the same paper reached as `.../abs/2101.00001.pdf/` and as `.../abs/2101.00001.pdf` gets two different canonical strings and filenames, which defeats the deduplication the module exists for. This was reported, not fixed. The failing property is kept as written with `#[should_panic]` so the default run passes and still demonstrates the defect, alongside an explicit test of the counterexample; removing the attribute shows the failure.

**`Action` round-trip verdicts.** The survey's reading-only suspicions were checked with explicit tests and all three reproduce, with different verdicts. Commands with leading or trailing whitespace (`Run(" a")` parses back as `Run("a")`) are **out of contract**: the `FromStr` doc comment says the command is "the rest of the text verbatim (trimmed)". An empty command (`Run("")` prints `run `, which the parser rejects) is **out of contract** by the "(non-empty)" wording on the variant docs, though nothing in the type prevents it. A layout name with a space or an empty one (`SetLayout("a b")` prints `set-layout a b`, which the parser rejects) is a **latent defect in the type's contract**: `Display` is documented as "the exact action grammar" and is infallible, but is not injective over `String` payloads. Whether a real config can produce such a name was not checked, so it is not claimed as a user-visible bug. The shrunk counterexample was `SetLayout("")` (text `"set-layout "`, which gives `Err(ActionParseError("expected a layout name"))`). No defect was found in the in-contract space over 20,000 cases. The generator covered every printable variant except `vt-switch` and only a sample of eight nullary verbs (the nullary table is private).

**`newcombeDiff` with `n = 0`.** It returns NaN in `d`, `lo` and `hi`, because the point estimate is `0 / 0`; `wilson` and `clopperPearson` guard `n <= 0` and return `[0, 1]`. The verdict is **out-of-contract input, no defect**: the caller passes `xs.length`, and the grouping code is not seen to build an empty group (not checked exhaustively). The inconsistency between the guards is noted, not a reachable bug. `clopperPearson(0, 0)` and `percentile([], q)` return their documented guard values, asserted. Nothing failed on valid input, so the pilot found nothing in the statistics code; the properties (symmetry, antisymmetry, monotonicity, permutation invariance) are the kind an example test would not state.

**Detection rate, and what it means.** The `canonicalize_url` counterexample needs an arXiv host, an abs path ending in `.pdf` and a trailing slash together. With a random seed it was found in 4 of 10 runs at 20,000 cases, in 10 of 10 at 100,000 and 10 of 10 at 200,000, then missed once in a later batch of five 100,000-case runs. With `derandomize = true` (a fixed seed derived from the test name) and 100,000 cases it missed on every run: the fixed seed never reached the conjunction. At 300,000 cases and a fixed seed it is found every run, which is what the pilot commits. The default case count is 100. Consequences:

- A bug that hides in a conjunction of structured features is found by case volume and by a generator that makes the conjunction likely, not by default settings.
- A fixed seed is deterministic, which a gate needs, but one seed that does not reach the bug gives permanent false confidence. Size the case count empirically per property, and sometimes run with random seeds outside the gate.
- The generator drew each shape 1/3 of the time and about a quarter of inputs got past the URL parser (533 to 547 of 2,000), so generator coverage is worth measuring (the pilot has a coverage test for it).

**Effort.** About 200 lines for `url_canon.rs` (about 60 of them the URL generator), 120 for `action_roundtrip.rs`, 115 for `measure-stats.test.mjs`. Stating a property took minutes. Writing generators that reach the interesting branches took most of the time, and deciding whether a failure was a defect or an out-of-contract input took the longest and required reading doc comments.

**What the pilot does not show.** Two targets across three Rust and three TypeScript functions, all pure and small, from one author. No stateful (model-based) test was run, and no long-running fuzz. It does not show performance on large inputs, behaviour on another machine, flakiness of `should_panic`-style tests across Hegel upgrades, or whether Hegel finds bugs that `proptest` would miss, or the reverse (`proptest` was not run). "Found nothing" for the statistics code means nothing within the generated ranges (`n <= 200`, finite floats up to 1e6 in magnitude), not a proof.

Full log, including the generators and the API surprises, is in [notes.md](notes.md).

## Tool choice per stack

Choose by stack, use a stable library where one exists, and treat Hegel as a beta option that worked well in the pilot.

| Stack | Recommended tool | Maturity | Runtime needs |
| --- | --- | --- | --- |
| Rust, in `cargo test` | `proptest` as the stable default (from general knowledge, unverified here); Hegel (`hegeltest`) if beta churn is accepted | Hegel: beta, 0.x, breaking changes allowed; `proptest`: mature (from general knowledge, unverified here) | `proptest`: pure Rust. Hegel: nested engine build in `build.rs` (or `HEGEL_C_LIB_DIR`, or the `static-engine` feature); crates fetched on first build |
| Rust, fuzzer mode | `cargo-fuzz` or `bolero` | mature (from general knowledge, unverified here) | nightly toolchain for `cargo-fuzz` |
| TypeScript under bun | `fast-check` as the stable default (from general knowledge, unverified here); Hegel for TypeScript as the beta alternative | Hegel TS 0.5.x: beta | Hegel: `koffi` plus a platform package carrying the engine, Bun 1.2.5 or newer; runs under `bun test` (verified in the pilot) |
| Python | Hypothesis | mature (from general knowledge, unverified here); Hegel for Python is alpha and its own README recommends Hypothesis for plain CI use | pip only |
| POSIX shell | none worth using; drive scripts as a black box from a host-language test with fakes on `PATH` | (from general knowledge, unverified here) | host-language runner |
| Perl | a seeded loop in the existing unit script, or a host-language driver; `Test::LectroTest` if a library is wanted | thin (from general knowledge, unverified here) | none (core Perl) or a CPAN install |
| C | compile to a shared object and drive from a host-language test with AddressSanitizer; `theft` exists (from general knowledge, unverified here) | n/a | compiler, sanitizer, host runner |
| Terminal UI programs | Bombadil terminal driver | experimental driver and experimental shrinking | Linux x86-64 or macOS arm64 binary or npm package, a pty, no network |

**What the pilot learned about Hegel first-hand.**

- **Rust:** `cargo test` fetched the crates (including `hegeltest-c`) and built the engine as a nested cargo build inside the `hegeltest` build script, producing `libhegel_c.so` and a shim under `target/`; the test binary loads it at run time. No server process, no network at test time, no system library. First build from a clean `target/` with crates already cached: about 11 s wall, 64 s CPU, 730 MB of `target/` (indicative). One command, no workaround. API surprises, all caught by the compiler: a `#[hegel::composite]` generator takes `tc: &TestCase` and tests take `tc: TestCase`.
- **TypeScript:** `bun add -d @hegeldev/hegel` took about 1 s. `hegel.test(...)` runs inside a `bun test` body unchanged from the upstream vitest example, and shrinks and prints the reproduce line. `bun add` reported one blocked postinstall (a `koffi` script); the library loaded and ran without it. `bun test` has a 5 s per-test timeout, which `clopperPearson` exceeded (it bisects 200 times per bound), so each test passes an explicit timeout.
- **Example database and `hegel.toml`:** by default Hegel writes an example database under `.hegel/` in the working directory and replays stored failures first on later runs. Each pilot folder carries a `hegel.toml` with `[profiles.development] database = "disabled"` so a run leaves nothing behind. Settings come from a profile, a `hegel.toml` file, `HEGEL_*` environment variables and the test's own attributes (`test_cases`, `derandomize` are one attribute each). In a detected CI environment Hegel selects a `ci` profile that derandomises and disables the database; the fleet has no hosted CI, so the equivalent is setting `HEGEL_DERANDOMIZE=true` explicitly (not verified outside a detected CI in the pilot).
- **Beta status, frankly:** every upstream README says breaking changes may come, and the pilot hit one signature change already. Pin the exact version, keep properties few and small so a break is cheap to repair, and keep `proptest` (Rust) and `fast-check` (bun) as the fallbacks; neither fallback was run here, so no comparison beyond the survey is claimed.

**Bombadil** is property-based testing for web and terminal UIs: it launches the program under test in a pseudo-terminal, explores it as a user would (typing, resizing, clicking, scrolling), and checks temporal-logic properties (`always`, `eventually`, `next`) over the observed screen states. Specifications are TypeScript or JavaScript modules. It fits `crucible-term` and `crucible-tui` as whole-program checks: no crash or non-zero exit under arbitrary input, no malformed UTF-8 on screen, key hints always present outside prompt modes, layout recovery after a resize. It fits poorly for properties that need internal data (only the screen and exit status are observable), and for a terminal emulator that draws to a window instead of a pty. The terminal driver and its shrinking are labelled experimental, there is no custom-action support for the terminal driver, runs are timing-dependent, and I found no seed flag, so reproduction is by trace file and best effort. It suits an occasional or nightly exploration, not a per-commit gate. **It was assessed from its manual and shipped examples only; it was not installed or run.** The sensible first test is the manual's own default-specification one-liner against each program.

## Fitting it into each repo's gates

Recommendations from the pilot and from the Hegel settings; none has been tried inside a target repo's gate.

- **Run-time budget.** A pure-function property with 20,000 cases ran in under a second in the pilot (indicative); 300,000 cases of the URL generator took about 2 s. A numeric property with an expensive body can dominate: `clopperPearson` took most of a 14 to 16 s file at 500 cases. Budget per property, set `test_cases` per test, and keep stateful or database-backed properties (SQLite in a temp directory costs milliseconds per case) to a few hundred cases.
- **Fixed seed or random.** In the gate, use a fixed seed (`derandomize`) with a case count raised until the pilot-style detection test finds known bugs; outside the gate, run with random seeds now and then, so a seed that misses a bug does not hide it for good. The detection-rate result above is the reason.
- **Where failures get stored.** Either disable Hegel's example database as the pilot does (so a run leaves no state), or leave the default `.hegel/` directory and add it to `.gitignore`. A failure prints a reproduce attribute, which is enough to replay it.
- **Turning a counterexample into a permanent example test.** Do what the pilot did: write an ordinary test asserting the shrunk counterexample explicitly (`known_defect_arxiv_trailing_slash_not_idempotent`), keep the property test, and mark an unfixed property `should_panic` only until the fix lands, then remove it. This keeps the gate green and the defect visible without depending on the generator reaching it again.
- **Dependency cost.** A dev-dependency only, in each repo's own manifest; nothing ships. Hegel for Rust adds a crates.io download and an engine build (about 730 MB of `target/` and 11 s on a first build in the pilot); `proptest` is pure Rust. For the TypeScript scripts, `fast-check` or Hegel is a dev-dependency under `bun install`, which `crucible-tui` already runs. `semsearch` requires a written approval step for any new dev-dependency and pins exact versions; `research` repo tooling is dependency-free, so a property library there would be a deliberate exception (the pilot keeps it inside this folder).
- **Order of adoption (suggested).** (1) `crucible-vault`: fix or accept the canonicaliser defect, add the idempotence property permanently, then path validation. (2) `crucible-dev-env` and `crucible-term`: the three codecs. (3) `inference-engine` (`clamp_usage`) and `semsearch` (`fuse`): pure numeric properties. (4) `crucible-tui`: `scan` and `wrap_ansi`, then the differentials against JavaScript originals. (5) The first model-based tests: the layout world, then the vector index and the note-id store. (6) `scripts`: the kernel keep-set in Perl by seeded loop or host-language driver. (7) Bombadil explorations of the terminal programs as an occasional run. Revisit the Hegel-or-`proptest` choice at step (3), when the pilot's beta caveat can be weighed against a second repo.

## Limits

- **Reading versus running.** Apart from the pilot, everything here is from reading source: every candidate, every suspected defect and every anchor. Anchors were verified by grepping the signature line in the surveyed checkouts; line numbers drift, and none was re-checked after the pilot except for the pilot's own targets.
- **Sampling.** `crucible-vault` has about 560 Rust files; the survey sampled by crate and skipped the editor, daemon, providers and watcher, so its list is not exhaustive. In `inference-engine`, the llama, ONNX, TTS and console front-end code, `onnx/server/schema.py`, the Python dispatcher and the picker lineup builder were not opened. Bombadil was assessed from documentation, not run.
- **Tools not run.** `proptest`, `fast-check`, Hypothesis, `cargo-fuzz`, `bolero`, `Test::LectroTest`, `theft` and Antithesis were not run; claims about them are marked as from general knowledge. The Hegel Python frontend was read but not run.
- **Pilot scope.** See the end of the pilot section: two targets, one author, no stateful test, no long-running fuzz.
- **Where property-based testing is the wrong tool.** Exact-output checks (snapshot or golden tests fit better, per the explainer), I/O-, timing- and concurrency-dominated glue, generated data tables, finite decision functions that can be enumerated, and logic whose only specification is its current output. Properties also cost: a bad generator gives false confidence (the pilot's default settings missed the defect), and some failures turn out to be wrong properties, which takes reading doc comments to tell apart.

## Reproducing the pilot

The pilot has no Docker build: it needs two toolchains and no system packages beyond them.

**Toolchains and versions.**

- Rust: `rustc 1.99.1 (58cf8f9c3 2026-10-13)` and `cargo 1.99.1 (5f94df478 2026-08-27)`.
- Bun: `bun 1.4.4 (38afee6c8)`.
- Libraries: crate `hegeltest` 0.52.6 (resolved from `hegeltest = "0.52"`, which also pulls `hegeltest-c` and builds the engine); npm `@hegeldev/hegel` 0.5.7 (with `@hegeldev/hegel-linux-x64` and `koffi`). The target crates are path dependencies and bring `xkeysym` and `crucible-layout` (pure Rust) and nothing needing system libraries.
- No system packages, headers or interpreter modules were needed beyond the two toolchains.

**Layout.** The research repo and the target repos must be sibling checkouts in one parent directory: `pilot/rust` depends on `../../../../crucible-vault/crates/cv-text`, `../../../../crucible-dev-env/crates/crucible-keys` and `../../../../crucible-dev-env/crates/crucible-layout`, and `pilot/bun` imports `../../../scripts/lib/measure-stats.mjs` from this repo. The pilot ran against `crucible-vault` `49a46372` and `crucible-dev-env` `d02df23`; `canonicalize_url` is the code in `crates/cv-text/src/url_canon.rs`, and a different commit may behave differently. Both `crucible-vault` and `crucible-dev-env` are public repos.

**Network.** The Rust build needs crates.io access the first time (crates, including `hegeltest-c`); the bun install needs the npm registry to fetch `@hegeldev/hegel` and its platform package. Neither needs the network at test time.

**Commands**, from this repo's root:

```bash
(cd property-based-testing-fleet-guide/pilot/rust && cargo test)
(cd property-based-testing-fleet-guide/pilot/bun && bun install && bun test)
```

Expected: both pass. The Rust run includes two `#[should_panic]` tests that demonstrate the `canonicalize_url` and free-text `Action` failures; remove the attribute to see the shrunk counterexample. `bun install` may report a blocked `koffi` postinstall script; the pilot ran without it. Build output goes to the untracked `pilot/rust/target/`, about 730 MB.

## Credits

- The Antithesis explainer on property-based testing, whose three-mode taxonomy this guide follows: https://antithesis.com/docs/resources/property_based_testing/
- Hegel, a family of Hypothesis-inspired property-based testing libraries, https://github.com/hegeldev/hegel (read at commit `f5a7c0d29`; the pilot used the published `hegeltest` 0.52.6 crate and `@hegeldev/hegel` 0.5.7).
- Bombadil, property-based testing for web and terminal UIs, https://github.com/antithesishq/bombadil (read at commit `69a61bc`).
- Hypothesis and David MacIver: Hegel is described by the explainer as MacIver's Hypothesis-derived library family, and its documentation compares itself with Hypothesis; Hypothesis is also the recommended tool for Python.
- `proptest`, `fast-check`, `bolero`, `cargo-fuzz`, `Test::LectroTest` and `theft` are named from general knowledge as the stable alternatives; none was run here.
- The surveys behind the per-repo sections: [survey/crucible.md](survey/crucible.md), [survey/others.md](survey/others.md), [survey/tools.md](survey/tools.md).
