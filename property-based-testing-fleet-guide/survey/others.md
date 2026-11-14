# Property-based testing candidates: inference-engine, scripts, semsearch, research

Survey of four public repos for places where generated inputs checked against stated properties (with shrinking) would add value over the example tests that exist today. All four were read-only surveyed; no code was run. No repo here uses a property-based testing library today. Anchors are `repo/path:line` of the function under test, each verified by reading the line. Kinds: round-trip, invariant, oracle/differential, idempotence, metamorphic, stateful/model-based, no-crash robustness.

## inference-engine

**Stack and tests today.** Rust (router gateway, codex sidecar, console API server and its contract crate), Python (serving control, Open WebUI sync, ONNX sidecar), TypeScript/mjs (model picker, differential harness, console packages), POSIX shell smoke scripts. Rust is tested with `cargo test` (unit tests in `#[cfg(test)]` modules plus integration tests that stand up the gateway against stub upstreams), Python with `unittest` discovery, mjs with `node:test`. Styles: unit, golden/fixture, a case-table differential harness for the gateway, black-box smoke scripts. The gateway is a same-protocol relay (no payload translation); the translation code lives in the sidecar (Anthropic Messages to codex app-server turns) and the console contract crate (a Rust validator with a generated TypeScript twin).

Ranked candidates, best first:

1. **Sidecar usage clamp.**
   - Anchor: `inference-engine/sidecar/rs/src/protocol.rs:548` (`clamp_usage`), with `usage_out` at `:536`.
   - Property: whenever `clamp_usage(raw, window)` returns `Some(u)`, the three input columns of `usage_out(Some(&u))` (`input_tokens + cache_creation_input_tokens + cache_read_input_tokens`) sum to exactly `window`, `output` is unchanged, and it returns `None` exactly when the unclamped sum is `<= window` (or `window == 0`).
   - Kind: invariant (plus oracle: exact rational scaling with a remainder distribution).
   - Generator: trivial, three `u64` columns plus a window; include values near `u64::MAX` and zeros (the code widens to `u128`, so overflow is the interesting corner).
   - Purity: pure, in-process.
   - Value/cost: high. Token accounting arithmetic with a hand-rolled largest-remainder step is exactly where off-by-one and saturation bugs hide, and it is five lines of generator.

2. **Model id parsing.**
   - Anchor: `inference-engine/sidecar/rs/src/protocol.rs:107` (`parse_model_id`).
   - Property: for every known family `f`, effort `e` in {low, medium, high} and optional provider prefix `p/`, `parse_model_id("{p/}f-{e}")` yields model `f`, effort `e`, source Suffix, and `parse_model_id("{p/}f")` yields the family default; any string with a line break inside the stem is rejected, never panics, for arbitrary Unicode input.
   - Kind: round-trip (render then parse) plus no-crash robustness.
   - Generator: needs a small custom generator (pick from the family table, optional prefix, optional suffix) mixed with free text.
   - Purity: pure.
   - Value/cost: medium. The grammar is small and example tests cover the happy paths, but the line-terminator exclusion mimics a JavaScript regex `.` and is the kind of Unicode edge a generator finds quickly.

3. **Differential: Rust JSON number formatting against JavaScript.**
   - Anchor: `inference-engine/console/crates/domain/src/jsout.rs:13` (`number_to_string`), also `js.rs:127` (`number`) and `js.rs:20` (`trim`).
   - Property: for every finite `f64`, `number_to_string(x)` equals `String(x)` computed by a real JavaScript engine (oracle: `bun` / `Number.prototype.toString`); `js::number(s)` equals `Number(s)` for arbitrary strings; `js::trim(s)` equals `s.trim()`.
   - Kind: oracle/differential (the JS engine is the oracle; the module's stated purpose is to match it byte for byte).
   - Generator: floats (include subnormals, `-0`, `1e21` boundaries, integers past 2^53) and strings drawn from the ECMAScript whitespace set plus Unicode noise.
   - Purity: the Rust side is pure; the oracle needs a second process (a bun script reading cases on stdin, or a pre-generated corpus checked in as a golden file), so the test is a cross-process harness, not an in-process test.
   - Value/cost: high. The module exists solely to be a faithful port, floating-point printing is the canonical fiddly domain, and a differential check against the real engine is cheap to state.

4. **Differential: Rust validator against its generated TypeScript twin.**
   - Anchor: `inference-engine/console/crates/domain/src/validate.rs:60` (`parse`), twin `inference-engine/console/crates/domain/src/runtime.ts`.
   - Property: for every contract node and every JSON input, the Rust interpreter and the TypeScript runtime agree on valid/invalid and on the issue list (code and path).
   - Kind: oracle/differential.
   - Generator: needs a custom generator for JSON values shaped near-valid for a node (mutate a valid value: drop a key, change a type, push a number across a bound); node trees come from the existing contract.
   - Purity: Rust side pure; TypeScript side runs under bun, so again a cross-process harness.
   - Value/cost: medium. The two implementations are documented twins, which makes this a natural oracle, but the harness and node-aware generator cost more than the pure candidates.

5. **Differential: FNV-1a revision in Rust and Python.**
   - Anchors: `inference-engine/router/gateway/src/catalog.rs:85` (`revision`) and `inference-engine/control/catalog_intents.py:80` (`revision`).
   - Property: for every byte string, both return the same 16-hex-digit string, and the output is always 16 lower-case hex digits.
   - Kind: oracle/differential (each is the other's oracle; the Python docstring says "byte for byte").
   - Generator: trivial (arbitrary bytes).
   - Purity: pure on both sides, but in two languages, so a fixed corpus of generated cases exchanged as a file is the cheapest bridge.
   - Value/cost: medium. Tiny and probably correct, and a mismatch would break health matching between services; the cost is the cross-language bridge, so low value unless a bridge already exists for item 3.

6. **Canonical JSON form.**
   - Anchor: `inference-engine/sidecar/rs/src/request.rs:370` (`canon`).
   - Property: `canon(canon(v)) == canon(v)`; permuting object key order never changes `canon(v)`; numeric values equal as numbers (`1`, `1.0`, `-0`) canonicalise identically.
   - Kind: idempotence and metamorphic (key permutation).
   - Generator: recursive JSON generator with floats and integers; needs a recursion-depth bound.
   - Purity: pure.
   - Value/cost: medium. Digests built on it decide session identity, so a canonicalisation hole silently forks sessions; the integer conversion branch (`f.abs() < 9.2e18`) is a plausible edge.

7. **Transcript rendering budget.**
   - Anchor: `inference-engine/sidecar/rs/src/request.rs:854` (`render_transcript`).
   - Property: output length never exceeds the character cap; when the full transcript fits it is returned unchanged; when it does not, the final message is intact, the kept prior messages are a contiguous suffix in original order, and the elision marker reports exactly the number dropped.
   - Kind: invariant and metamorphic (a message list under budget renders identically with extra budget).
   - Generator: needs a custom generator for messages with large text blocks so the cap is crossed within a handful of cases (shrink the cap by making it a parameter or generate blocks near the limit).
   - Purity: pure.
   - Value/cost: medium. The budget arithmetic reserves wrapper and marker widths up front, which is where off-by-ones live; the cap constant makes cases large, so run time needs watching.

8. **Gateway model resolution.**
   - Anchor: `inference-engine/router/gateway/src/routing.rs:124` (`resolve`), helper `:81` (`model_ref`).
   - Property: resolution never panics for arbitrary requested strings; surrounding whitespace on the requested id never changes the result; a `provider/model` prefix naming a configured provider (any ASCII case) always yields exactly one explicit target for that provider; a non-matching prefix leaves the whole string as the model.
   - Kind: invariant and metamorphic (whitespace/case).
   - Generator: needs a custom generator for provider lists (kinds, names, model allow-lists) and requested ids built from those names.
   - Purity: pure over an in-memory provider list.
   - Value/cost: medium. Routing is the gateway's core; example tests cover the documented cases, and generated provider lists would test the "first provider per class" default rule combinatorially.

9. **Catalog id and key validation.**
   - Anchors: `inference-engine/router/gateway/src/catalog.rs:101` (`check_id`), `:174` (`check_model_key`); `inference-engine/router/gateway/src/config.rs:131` (`list`).
   - Property: `check_id` accepts exactly ids with no surrounding whitespace and, when starting with `@`, matching `@preset/<slug>` with the documented slug alphabet on an allowed provider (oracle: a regex written independently from the prose); `list` output is trimmed, non-empty, duplicate-free and preserves first-seen order.
   - Kind: oracle/differential (regex) and invariant.
   - Generator: strings from a small alphabet that over-weights `@`, `/`, `.`, `_`, `-`, spaces, uppercase.
   - Purity: pure.
   - Value/cost: low to medium. Small functions with clear examples; worth adding only as cheap fillers next to the higher items.

10. **Session id extraction.**
    - Anchor: `inference-engine/router/gateway/src/telemetry/record.rs:52` (`read_session_id`).
    - Property: for a body whose `metadata.user_id` embeds `_session_<id>` with an id of at least 8 characters from `[A-Za-z0-9-]`, the function returns exactly that id (first qualifying occurrence); it never returns the account or user segments and never panics on arbitrary JSON.
    - Kind: round-trip (embed then extract) plus no-crash robustness.
    - Generator: needs a small custom generator composing the user-id string from random segments; arbitrary JSON for the robustness half.
    - Purity: pure.
    - Value/cost: low. Parsing a convention out of a string; the loop advances by one byte after a short id, which is the one thing worth fuzzing.

11. **Open WebUI arming merge and consumer canonicalisation (Python).**
    - Anchors: `inference-engine/scripts/openwebui_sync/planner.py:65` (`merge_arming`), `inference-engine/control/serving_protocol.py:131` (`canonical_consumers`).
    - Property: `merge_arming` keeps every string of `existing` that is not retired, in order, appends only new additions, never contains a retired id, and is idempotent (`merge(merge(e, a, r), a, r) == merge(e, a, r)`); `canonical_consumers` returns a duplicate-free subsequence of the fixed vocabulary order.
    - Kind: idempotence and invariant.
    - Generator: trivial lists of short strings, plus non-list junk for the "treated as absent" branch.
    - Purity: pure.
    - Value/cost: low. Simple list logic that example tests already cover; a Hypothesis test would be a quick win but not a discovery engine.

Not worth it: the gateway relay handlers (`router/gateway/src/relay.rs`) and the sidecar persona/session code are I/O-heavy glue around axum, child processes and sockets; generated inputs would mostly exercise stubs. The one exception is the relay's byte-for-byte forwarding of SSE bodies split at arbitrary chunk boundaries, which the existing differential harness covers with hand-picked splits (a generated split would be a medium-cost stateful test against the stub upstream, not a pure property).

Best first target: the sidecar usage clamp (`clamp_usage`), because it is pure, numeric, has a crisp conservation property (columns sum to the window), needs a trivial generator and sits in a crate that already has a unit-test module to extend.

## scripts

**Stack and tests today.** POSIX shell (aliases, `util/*.sh`), Perl modules and scripts (`util/cache-prune`, `util/debian-maintenance`), C (a small build system in `tools/build_system`, assembled from `parts/*.c`), one Bun tool (`tools/blamecount`). Tests are shell smoke scripts (`tests/*.sh`, `util/tests/*.sh`), in-process Perl unit scripts with a hand-rolled `ok`/`is_eq` harness, golden-output dumps for the cache-prune CLI, and a shell smoke test per tool. There is no pure-function test layer in shell; Perl has one (the unit scripts load the module and replace the command seam with fakes). Most shell scripts wrap system commands or the network and are glue.

Ranked candidates, best first:

1. **Docker size parser.**
   - Anchor: `scripts/util/cache-prune/perl/CachePrune/DockerResidue.pm:58` (`hbytes`).
   - Property: for every non-negative integer `n` and unit `u` in {B, kB, KB, MB, GB, TB}, `hbytes("{n}{u}")` equals `n * factor(u)` (oracle: exact integer arithmetic, with the decimal-fraction case floored); any token with an unknown unit or malformed number yields `undef`; only the first space-separated word counts.
   - Kind: oracle/differential (exact arithmetic or a second implementation in the host language) plus no-crash robustness.
   - Generator: needs a small custom generator for number-with-optional-fraction plus unit strings, mixed with junk.
   - Purity: pure Perl function; to test it from outside Perl, drive it as a black box through a tiny script that reads tokens and prints results.
   - Value/cost: high. The function floors via a float multiply (`($1 + 0) * $UNIT{$2}`), so large byte counts lose precision beyond 2^53, which is exactly what a numeric oracle exposes.

2. **ISO-8601 to epoch conversion.**
   - Anchors: `scripts/util/cache-prune/perl/CachePrune/DockerResidue.pm:106` (`ts`) and `:94` (`days_from_civil`).
   - Property: for every valid civil date-time and offset, `ts` equals the epoch computed by an independent oracle (GNU `date -u -d`, or a host-language date library) minus the offset; `days_from_civil` is monotone and increases by one per calendar day across leap years and century boundaries.
   - Kind: oracle/differential.
   - Generator: needs a custom generator for dates (year range including pre-1970 and 2100, month, day within the month, optional fraction, `Z` or `+-HH:MM`).
   - Purity: pure Perl.
   - Value/cost: high. Calendar arithmetic is a named best-fit domain. One thing a generator will immediately probe: the shape check accepts any day 1 to 31 for any month (February 30th is accepted and rolls over), so the property must say whether that is intended.

3. **Docker image reference normalisation.**
   - Anchors: `scripts/util/cache-prune/perl/CachePrune/DockerResidue.pm:77` (`norm`) and `repo` just after it.
   - Property: `norm` is idempotent (`norm(norm(x)) == norm(x)`); the result always contains either `@` or a `:` in its last path segment; `repo(norm(x))` equals `repo(x)` for references without a digest.
   - Kind: idempotence and metamorphic.
   - Generator: custom generator for image references (optional registry host with port, path segments, optional tag, optional digest).
   - Purity: pure Perl.
   - Value/cost: medium. Registry hosts with ports (`host:5000/app`) are the classic trap for tag detection; the code splits on `/` first, so it likely handles them, and a generator would confirm that cheaply.

4. **Dockerfile `FROM` argument substitution.**
   - Anchors: `scripts/util/cache-prune/perl/CachePrune/DockerResidue.pm:365` (`subst_args`), `:388` (`dockerfile_bases`).
   - Property: `subst_args` returns either `undef` or a string with no remaining `${VAR}`/`$VAR` references; it terminates for every input (including self-referential defaults) within its guard; a reference with no `$` is returned unchanged.
   - Kind: invariant and no-crash robustness.
   - Generator: needs a custom generator for reference templates and argument tables with values that themselves contain `$` references.
   - Purity: `subst_args` is pure; `dockerfile_bases` reads a file, so generate the file content into a temp file.
   - Value/cost: medium. Substitution loops with a recursion guard are a classic place for non-termination and silent wrong answers; the safety contract ("an unknown base never becomes a guess") is stated and testable.

5. **Kernel keep-set selection.**
   - Anchors: `scripts/util/debian-maintenance/debian-maintenance.pl:251` (`select_protected_kernels`), `:285` (`build_kernel_purge_list`), `:151` (`is_boot_critical_package`).
   - Property: for every list of installed kernels (sorted oldest to newest) and every running release present in the list, the protected set contains the running kernel and the newest N, protected and removable are disjoint and together cover the list, and nothing boot-critical is ever in the purge list.
   - Kind: invariant (a safety property for a destructive tool) and oracle/differential against a one-line model (the sorted-suffix rule).
   - Generator: needs a custom generator for kernel records (package name pattern, version, release) with the running kernel chosen from the list; the `/boot` readability check and `dpkg` calls are seams to fake, as the existing unit script already does.
   - Purity: pure once the seams are faked in-process.
   - Value/cost: high. The tool removes kernels; a safety invariant checked across thousands of generated lists is much stronger than the handful of hand-built cases.

6. **Path containment and guarded removal.**
   - Anchors: `scripts/util/cache-prune/perl/CachePrune/Actions.pm:119` (`guarded_remove`), `:133` (`path_contained`), `:177` (`outermost_marker_dirs`).
   - Property: `guarded_remove` never removes anything outside the root, the root itself, or the target of a symlink; `outermost_marker_dirs` returns an antichain (no result is a prefix of another) that covers every marker, and skips `.git` and `node_modules`.
   - Kind: invariant (safety) and stateful/model-based (generate a directory tree with symlinks in a temp dir, compare against a model of the tree).
   - Generator: needs a custom generator for small directory trees with files, symlinks, and nested markers.
   - Purity: needs a real temporary directory (cheap, no network); deletion is real, so run only inside a sandbox directory.
   - Value/cost: medium to high. Deletion code with symlink handling is high-stakes, but the generator and the model are the most expensive in this list.

7. **Election logic for destructive verbs.**
   - Anchor: `scripts/util/cache-prune/perl/CachePrune/Actions.pm:24` (`tier_elected`), plus `safe_elected` and `purge_elected` below it.
   - Property: under mode `report` nothing is elected; under `yes` a purge-tier verb is elected only with the include-purge flag set and an interactive-only note elects nothing; no input ever returns a value other than 0 or 1.
   - Kind: invariant (exhaustive in effect; the input space is small).
   - Generator: trivial enumeration of mode, tier kind and flags.
   - Purity: pure with the confirm seam faked.
   - Value/cost: low. The space is small enough that a table of cases is as good as generation.

8. **Byte formatting.**
   - Anchor: `scripts/util/cache-prune/perl/CachePrune/Measurement.pm:74` (`human_bytes`), `:83` (`human_bytes_signed`).
   - Property: for every non-negative integer the output is `<number>.<digit><unit>` with a unit from the list and a mantissa below 1024.0 before rounding; `human_bytes_signed(-n)` equals `-` followed by `human_bytes(n)`.
   - Kind: invariant and metamorphic.
   - Generator: trivial (integers across magnitudes).
   - Purity: pure.
   - Value/cost: low. A formatting helper; the one real hazard is rounding to `1024.0KB` at a unit boundary, which a numeric generator finds.

9. **C string and path helpers (via a harness).**
   - Anchors: `scripts/tools/build_system/parts/string.c:30` (`strsplit`), `:266` (`path_join_`), `:104` (`strjoin_`), `scripts/tools/build_system/parts/hash.c:72` (`hash_insert`), `scripts/tools/build_system/parts/strcache.c:117` (`strncache`).
   - Property: `strsplit` equals a reference split for strings over a small alphabet; `path_join_` never produces a double slash at a join and never reads past a NULL argument (it calls `strlen(s)` before its `if (s)` test, so a NULL argument crashes); the hash table agrees with a reference map under random insert/find sequences including growth past the 80 percent fill mark; `strncache(in, n)` for `n < strlen(in)` returns the first `n` characters (the bucket lookup compares the full input string, so a prefix hit looks suspect).
   - Kind: oracle/differential, stateful/model-based (hash table against a map) and no-crash robustness.
   - Generator: strings over a small alphabet; command sequences for the table.
   - Purity: pure C, but it must be compiled into a harness (a shared library loaded from a host-language property test, or a small driver program); the parts are unity-build fragments, so the harness includes them directly.
   - Value/cost: medium. Hand-written C containers are where property tests find memory and boundary bugs; cost is a compiler step plus a build, and the code is a vendored third-party tool, so findings may be report-only.

10. **Blame-count helpers.**
    - Anchors: `scripts/tools/blamecount/blamecount.js:251` (`isUnderStopDir`), `:343` (`mapWithConcurrency`), `:380` (`sortedClone`).
    - Property: `mapWithConcurrency` returns every input's result exactly once (as a multiset; the order is completion order, not input order) and never runs more than `limit` workers at once; `sortedClone` is idempotent and preserves values; `isUnderStopDir` equals a reference "some ancestor path is in the stop set" check.
    - Kind: invariant, idempotence, oracle/differential.
    - Generator: lists, nested objects, path strings; async functions with random delays for the concurrency bound (fast-check supports async properties).
    - Purity: pure functions in a bun-run file; they are not exported, so a test needs an export seam or a copy.
    - Value/cost: low to medium. Small helpers with an existing smoke test; the concurrency bound is the only non-trivial property.

Not worth it: `util/*.sh` helpers such as `youtube-id.sh`, `volume.sh`, `battery.sh` and the alias files call `curl`, `pactl`, `/sys` and git; their text-in/text-out cores are a line or two of `grep`/`cut`. The black-box workaround (drive the script from a host-language property test with fakes on `PATH`) costs more than the logic is worth.

Best first target: `select_protected_kernels` and its purge list in `debian-maintenance.pl`, because it is a destructive tool with a stated safety contract (never remove the running kernel or the newest N), the unit script already fakes the seams, and the invariant is a one-line model.

## semsearch

**Stack and tests today.** A small Rust library crate (about 1,800 lines of source): SQLite plus FTS5 index, query building, reciprocal-rank fusion, in-memory sign-code vector index, hybrid search. Tests are `#[cfg(test)]` unit tests in `fusion.rs`, `query.rs` and `vector.rs`, and four integration test files (`search`, `storage`, `vector`, `golden`) against on-tmpfs databases. The vector tests already use a hand-rolled seeded random generator and exact-order oracles, so the project is one step from property-based testing. The crate pins exact dependency versions and requires a recorded plan for any new dev-dependency.

Ranked candidates, best first:

1. **Reciprocal-rank fusion.**
   - Anchor: `semsearch/crates/semsearch/src/fusion.rs:29` (`fuse`).
   - Property: for every set of text ranks and legs, the output is a permutation of all candidates; it is sorted by fused score descending with ties broken by text rank then index; each leg's ranks form `1..=k` over exactly the candidates with a score on that leg; the fused score equals the sum of `weight / (60 + rank)` over legs plus the text term (oracle: a direct recomputation); the result is identical for the same input.
   - Kind: invariant and oracle/differential (naive recomputation).
   - Generator: needs a small custom generator: `n` candidates, optional text ranks forming a valid ranking, legs with optional scores (include equal scores to hit the tie-break and NaN-free floats).
   - Purity: pure.
   - Value/cost: high. Pure ranking logic with a tie-break chain; the existing test is one worked example.

2. **Sign-code nearest-neighbour index against a brute-force model.**
   - Anchors: `semsearch/crates/semsearch/src/vector.rs:139` (`Codes::nearest`), with `insert` at `:111` and `remove` at `:122`.
   - Property: after any sequence of inserts (including replacing an existing rowid) and removes, `len` equals the model's size and `nearest(query, pool)` returns, as a set, the first `pool` rowids of the model sorted by (Hamming distance, rowid); `pool == 0` returns empty. Note the function returns its result unsorted (it uses a partial selection and truncates), so compare as sets or sort first.
   - Kind: stateful/model-based (model: a map from rowid to code, brute-force sorted scan).
   - Generator: needs a stateful command sequence (insert/remove/query) with small dimensions (for example 1 to 130 bits so word boundaries at 64 are crossed) and few distinct rowids to force swap-remove paths.
   - Purity: pure in-memory.
   - Value/cost: high. Swap-remove with a position map is a textbook place for stale-index bugs, and the model is five lines.

3. **Query tokenisation and FTS expression building.**
   - Anchors: `semsearch/crates/semsearch/src/query.rs:19` (`tokenize_query`), `:35` (`quote_fts`), `:53` (`build_fts_query`).
   - Property: tokens are non-empty, lower-case, duplicate-free, at most 24, with no edge punctuation; every term in the built expression is a double-quoted string whose interior has no unpaired quote (so no arbitrary text can escape into FTS syntax); only the last term may carry `*`, and only when it is at least 3 characters; the expression is never built for a query with no terms.
   - Kind: invariant and no-crash robustness (arbitrary Unicode input).
   - Generator: arbitrary strings, weighted toward quotes, punctuation and non-ASCII; trivial.
   - Purity: pure for the builder; for the stronger claim "SQLite accepts the expression", run it against an in-memory FTS5 table (cheap, no files).
   - Value/cost: high. User input flows into an FTS5 query string, so "never a syntax error, never an injected operator" is the property that matters; Unicode case folding (`to_lowercase` can change length) is a real edge.

4. **Match normalisation and title scoring.**
   - Anchors: `semsearch/crates/semsearch/src/query.rs:73` (`normalize_for_match`), `:100` (`title_match_score`).
   - Property: `normalize_for_match` is idempotent, contains only alphanumerics and single spaces with no leading or trailing space; `title_match_score` is always within 0 to 1, is exactly 1.0 when the normalised title equals the normalised query phrase, and does not decrease when a term is appended to the title.
   - Kind: idempotence, invariant, metamorphic.
   - Generator: arbitrary strings; term lists derived from them.
   - Purity: pure.
   - Value/cost: medium. Cheap to write; the tiered scores are heuristic, so only the structural properties (range, exact-match, idempotence) are firm.

5. **Vector encodings.**
   - Anchors: `semsearch/crates/semsearch/src/vector.rs:49` (`to_blob`), `:53` (`from_blob`), `:63` (`sign_code_from_blob`), `:79` (`sign_code`), `:28` (`normalized`).
   - Property: `from_blob(to_blob(v)) == v` bitwise; `sign_code_from_blob(to_blob(v)) == sign_code(v)`; `normalized` returns a unit-norm vector within tolerance, rejects wrong dimension, non-finite or zero-norm input, and is invariant to positive scaling of the input.
   - Kind: round-trip, oracle/differential (two sign-code implementations agree), metamorphic (scale).
   - Generator: float vectors including subnormals and NaN/infinity for the rejection branch; trivial.
   - Purity: pure.
   - Value/cost: medium. An existing test already compares the two sign-code paths on examples; generated vectors add edge floats (negative zero, subnormal) cheaply.

6. **Store as a model-based state machine.**
   - Anchors: `semsearch/crates/semsearch/src/store.rs:377` (`upsert_source`), `:540` (`delete_source`), `:553` (`source_states`), search at `semsearch/crates/semsearch/src/search.rs:153`.
   - Property: after any sequence of upserts, deletes, reopen and search, `source_states` equals a map model (source to content hash and chunk count), a search returns at most one hit per source, never returns a deleted source, and a reopened index returns the same hits as before.
   - Kind: stateful/model-based (model: a map from source to chunks).
   - Generator: needs a stateful command sequence with a small pool of source names and short text drawn from a small vocabulary.
   - Purity: needs a real SQLite database file; tmpfs per case works but costs milliseconds per case, so case counts stay modest.
   - Value/cost: medium to high. This is the closest thing to an end-to-end invariant for the crate; it costs a state machine plus I/O, and is best taken after the pure items.

7. **Snippet building.**
   - Anchor: `semsearch/crates/semsearch/src/query.rs:140` (`make_text_snippet`).
   - Property: the snippet has at most 18 words before an optional trailing `...`, the `...` appears exactly when the text had more than 18 words, and the words of the snippet are a prefix of the input's whitespace-split words.
   - Kind: invariant.
   - Generator: arbitrary Unicode strings with varied whitespace; trivial.
   - Purity: pure.
   - Value/cost: low. Covered by an example test; fine as a one-property filler.

Not worth it: `search.rs` leg composition and SQL fetch helpers beyond the hit-count and determinism properties (the golden and vector integration tests already pin ranks), and the error type.

Best first target: `fusion::fuse`, because it is pure, the properties are conservation-and-order laws with a naive oracle, the generator is a few lines, and it needs no database; the vector index model (item 2) is the close second and better at finding a real bug.

## research

**Stack and tests today.** Bun scripts with no dependencies: the measurement driver and its statistics (`scripts/measure.mjs`, `scripts/lib/measure-*.mjs`) and the index renderer (`scripts/render-index.mjs`). Tests are `bun test` files (`scripts/measure.test.mjs`, `scripts/render-index.test.mjs`) with worked examples, published reference values (Clopper-Pearson, Newcombe worked examples), a seeded end-to-end run, and a golden report. Shell probes (`scripts/cpuprobe.sh`, `scripts/memprobe.sh`) are measured through the driver, not unit tested.

Ranked candidates, best first:

1. **Clopper-Pearson interval.**
   - Anchors: `research/scripts/lib/measure-stats.mjs:110` (`clopperPearson`), built on `:89` (`binomCdf`) and a bisection helper.
   - Property: for all `0 <= k <= n` the interval satisfies `0 <= lo <= k/n <= hi <= 1`; `lo` and `hi` are non-decreasing in `k` for fixed `n`; the interval is symmetric (`cp(k, n)` mirrored equals `cp(n - k, n)` reflected); the interval contains the Wilson interval's point and is no narrower than Wilson's (Clopper-Pearson is conservative); and `binomCdf` agrees with a direct sum of `BigInt`/exact binomial terms to a tolerance.
   - Kind: invariant, metamorphic (reflection), oracle/differential (exact summation; Wilson as a sanity bound).
   - Generator: trivial (`n` in 1 to a few thousand, `k` in `0..=n`).
   - Purity: pure.
   - Value/cost: high. Numeric code with logs and bisection; the existing tests pin a handful of values, and the structural properties catch the failure modes (monotonicity breaks, endpoint cases, large `n`) that point examples miss.

2. **Newcombe difference interval and the rate verdict.**
   - Anchors: `research/scripts/lib/measure-stats.mjs:134` (`newcombeDiff`), `:121` (`wilson`), `:146` (`rateVerdict`).
   - Property: `lo <= d <= hi` and both lie in `[-1, 1]`; swapping the two samples negates and swaps the bounds (`diff(a, b) = -diff(b, a)` reflected); `wilson` always contains `k/n` and stays within `[0, 1]`; `rateVerdict` never reports a direction when the interval contains 0 or `|d|` does not exceed the A/A half-width, and reports nothing without an A/A floor.
   - Kind: invariant and metamorphic (swap/reflection).
   - Generator: pairs `(k1, n1, k2, n2)` with `n >= 1`; trivial. Include `n = 0` to document what happens (the code returns `[0, 1]` for Wilson, but `newcombeDiff` computes `k/n` first and yields NaN).
   - Purity: pure.
   - Value/cost: high. This is the published statistical claim rule of the repo; a property test that the claim rule is symmetric and never over-claims is directly on the research product.

3. **Hierarchical bootstrap and percentile.**
   - Anchors: `research/scripts/lib/measure-stats.mjs:43` (`hierBootstrap`), `:28` (`percentile`), `:4` (`mulberry32`).
   - Property: `percentile(xs, q)` lies between `min(xs)` and `max(xs)`, is monotone in `q`, equals `min` at 0 and `max` at 1, and matches a straightforward sort-and-interpolate oracle (R type 7); every bootstrap replicate lies within the data range; with identical input and seed the output is byte-identical; with a single build it reduces to a plain bootstrap (all values drawn from that build); resampling a constant data set yields that constant.
   - Kind: invariant, oracle/differential (reference percentile), metamorphic (constant data, determinism).
   - Generator: lists of finite floats, nested for builds (1 to 6 builds of 1 to 20 values), small seeds.
   - Purity: pure and seeded.
   - Value/cost: medium to high. Deterministic by design, which makes it ideal for replay; `percentile` with a NaN or empty input is a corner worth pinning.

4. **Seeded schedule.**
   - Anchors: `research/scripts/lib/measure-run.mjs:169` (`schedule`), `research/scripts/lib/measure-stats.mjs:18` (`permutation`), `:15` (`randInt`).
   - Property: every round is a permutation of `0..nVariants` with pad lengths in `0..=padMax`; the schedule is reproducible from the seed; `randInt(rng, n)` stays in `[0, n)`; over many seeds the first-position counts are not all on one variant (a loose uniformity bound, flagged as a statistical property).
   - Kind: invariant and idempotence/determinism.
   - Generator: trivial small integers and seeds.
   - Purity: pure.
   - Value/cost: low to medium. The existing test checks permutation-ness on an example; generated sizes add the zero and one variant edges.

5. **Config validation.**
   - Anchor: `research/scripts/lib/measure-run.mjs:13` (`validateConfig`).
   - Property: for every generated valid config it returns `[]`; for a valid config with exactly one mutation (unknown key, wrong type, duplicate variant name, `aa` naming an unknown group, negative count) it returns a non-empty list mentioning the mutated field; it never throws on arbitrary JSON values.
   - Kind: invariant (accept valid, reject each mutation) and no-crash robustness.
   - Generator: needs a custom generator for valid configs (variants with argv, optional groups, aa, baseline, probe, metrics) and a mutation generator.
   - Purity: pure.
   - Value/cost: medium. A strict validator is a good fit for mutation-style properties, but the generator is the most code of the pure candidates in this repo.

6. **MEASURE protocol parser and shell quoting.**
   - Anchors: `research/scripts/lib/measure-run.mjs:79` (`parseProtocol`), `:95` (`shQuote`), `research/scripts/lib/measure-channel.mjs:119` (`invocationScript`).
   - Property: for every generated metric (name without whitespace, finite value, optional unit), the line `MEASURE name value unit` round-trips through `parseProtocol`; non-protocol lines are preserved in order in `other`; duplicates and malformed numbers are reported, never silently accepted; `shQuote(s)` fed to a real `sh -c 'printf %s <quoted>'` reproduces `s` for arbitrary strings without NUL (oracle: the shell itself).
   - Kind: round-trip and oracle/differential (the shell).
   - Generator: strings including single quotes, newlines, backslashes and Unicode for the quoting half; numbers rendered with varied formats for the parser half.
   - Purity: the parser is pure; the quoting oracle spawns `sh` (cheap, local, no network). The parser uses `Number(...)`, so inputs such as `0x10` parse as numbers; a generator that renders numbers in many formats will show whether that is intended.
   - Value/cost: medium. The quoting property is the load-bearing one for a tool that builds remote shell scripts from argv.

7. **Index renderer parsing.**
   - Anchors: `research/scripts/render-index.mjs:23` (`validDate`), `:32` (`parseCreated`), `:59` (`parseSummary`), `:52` (`truncate`), `:122` (`replaceRegion`).
   - Property: `validDate(s)` equals an oracle that checks the calendar with `Date` (the implementation already round-trips through `Date.UTC`, so the oracle should be a separate table of month lengths); `parseCreated` returns the date for any frontmatter block containing a valid `created:` line with optional quotes and surrounding whitespace; `truncate(s, max)` has length at most `max`, is idempotent and returns `s` unchanged when short; `replaceRegion` preserves everything outside the markers byte for byte and is idempotent when applied twice with the same block.
   - Kind: oracle/differential, round-trip, idempotence.
   - Generator: needs a small custom generator for frontmatter documents and markdown paragraphs; strings with markers, fences and comments for `parseSummary` (invariant: never throws, result is at most 280 characters plus the ellipsis).
   - Purity: pure (`collectProjects` reads the filesystem and is out of scope).
   - Value/cost: medium. The functions are small and example-tested; `replaceRegion` and `truncate` idempotence are the cheap wins.

Not worth it: `build-id.mjs` (shells out to git) and the channel process management (`Channel`, which spawns a shell and is tested end to end); the framing logic is reachable only through a live process, so a property test there would be a stateful test against a real `sh`, high cost for low discovery.

Best first target: `clopperPearson` and `newcombeDiff` together, because they are pure numeric code that backs the repo's published claims, the generators are integers, the properties are structural laws with oracles, and the pilot can run them under bun with no dependencies beyond the property-testing library.

## Cross-repo patterns

- **Pure numeric and ranking cores with a naive oracle.** `clamp_usage` (sum conservation), `fuse` (recompute the sum), `clopperPearson`/`newcombeDiff` (exact sums, reflection), `hbytes` and `human_bytes` (exact arithmetic). One style, "recompute the slow obvious way and compare", applies in four languages.
- **Two implementations of the same contract.** Rust and JavaScript number formatting, Rust and TypeScript validators, Rust and Python FNV-1a, two sign-code paths in semsearch, `ts` against GNU `date`. These are differential tests with a built-in oracle; the cross-process variants need a small harness (one driver that feeds generated cases to both sides), which could be shared across repos.
- **Safety invariants on destructive code.** Kernel keep-set, guarded removal, boot-critical package guard, the usage window. State the invariant once ("never removes X", "always sums to W") and check it over generated inputs; the model is usually one line.
- **Model-based state machines.** The sign-code index and the SQLite store (semsearch), the hash table (C), the catalog and session maps (inference-engine). Generate command sequences, replay against a map.
- **Idempotence and canonical forms.** `canon`, `norm`, `normalize_for_match`, `merge_arming`, `sortedClone`, `replaceRegion`, `truncate`. A one-line `f(f(x)) == f(x)` property per function.
- **Hand-rolled loops already exist.** semsearch's vector tests and the research statistics tests use seeded loops or fixed tables; the missing parts are shrinking, replay and a generator vocabulary, which is what a library supplies.
- **Shell and glue are the weak fit.** Shell, network and process-heavy code in all four repos is better served by black-box tests from a host language or by the existing smoke scripts; do not spend generator effort there.

## Survey log

- Read for each repo: the module doc comments and function signatures first, then the bodies of the functions that became candidates; line numbers were taken from the read output, not recalled. For inference-engine I read the router gateway routing and catalog code, the sidecar protocol and request modules, the console contract validator and its JavaScript-semantics helpers, and the Python control and sync planners; I did not read the llama, ONNX, TTS or console front-end code beyond their directory listings.
- The repo is large (about 60,000 lines across Rust, Python and mjs); the candidates are chosen for purity and a stated contract, not for coverage. Items I did not open: `onnx/server/schema.py` (a Python schema layer that looks like a candidate for Hypothesis round-trips), the Python dispatcher, the picker lineup builder (`router/model-picker-lineup.mjs`, which already has fixture-based invariants).
- Surprises: the gateway does no request/response translation (a same-protocol relay), so the "request translation" the survey asked about lives in the sidecar; the console crate carries a deliberate Rust twin of a TypeScript runtime and a JS-number formatter, which makes it the richest differential-oracle site; several functions have an obvious oracle already named in their own doc comments ("byte for byte", "twin").
- Things a generator would probe but that I did not run (flagged as suspicions, not findings): `ts` accepting February 30th; `hbytes` precision past 2^53; `path_join_` calling `strlen` on a possibly NULL argument before its NULL test; `strncache` comparing the full input in its bucket lookup when only the first `n` characters were hashed; `Codes::nearest` returning an unsorted result; `newcombeDiff` with `n = 0`; `parseProtocol` accepting hexadecimal numbers via `Number(...)`. None was executed; each needs a run to confirm.
- Scripts repo: the C code is a vendored third-party build system assembled by `#include`-style unity fragments, so property tests need a compiled harness and any finding is likely report-only. The Perl unit scripts are a hand-rolled harness; Perl-side property-testing libraries are from general knowledge only (see the tool survey).
- Cross-process differential tests (Rust against bun, Rust against Python) were counted as medium cost because they need a driver; I did not build one.
- Counts: inference-engine 11 candidates plus a not-worth-it note, scripts 10 plus a not-worth-it note, semsearch 7 (small repo, so fewer and shorter), research 7 plus a not-worth-it note.
