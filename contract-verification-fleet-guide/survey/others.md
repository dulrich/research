# Contract candidates: inference-engine, scripts, semsearch, research

Survey of four public repos for security-sensitive code where a machine-checked contract (a stated precondition, postcondition or state invariant that a tool proves for all inputs, or for all inputs up to a bound) could be written, and an honest call on whether it is worth it. All four were read, never built or run: `inference-engine` at `db65a1e`, `scripts` at `dbf1d9d`, `semsearch` at `17b39b5`, `research` at `09c9740`. Every anchor is `repo/path:line` and was checked by reading that line at those commits. Anything about a tool that was not read from a source in front of me is marked "from general knowledge, unverified here". A suspected defect is a hypothesis from reading, labelled as such; none was executed.

Tool families used below, all from general knowledge, unverified here. Deductive contract verification for Rust: Verus (https://github.com/verus-lang/verus), which proves contracts with an SMT solver over a Rust subset and usually needs a verified twin of code that uses unsupported library types; Prusti and Creusot are in the same family. Bounded model checking for Rust: Kani (https://github.com/model-checking/kani), which checks assertions and panic freedom on the real code up to an unwinding bound. For C: bounded model checking with CBMC (https://github.com/diffblue/cbmc) and deductive verification with Frama-C and its WP plugin (https://frama-c.com). For shell, Perl, TypeScript and Python no mainstream contract verifier exists in my knowledge; the nearest substitutes are named per candidate (the Python tools CrossHair and Nagini exist, from general knowledge, and were not assessed).

Which properties a property test already covers or confirmed is in [property-based-testing-fleet-guide](../../property-based-testing-fleet-guide/) (its survey of these four repos is `survey/others.md` there) and [property-testing-guide-suspicions](../../property-testing-guide-suspicions/). Where a candidate below is the same property, it says so.

## inference-engine

**Stack and where the risk is.** Rust (the router gateway, the codex sidecar, the console server and its contract crate), Python (serving control, a drop-box request validator, an Open WebUI sync client), TypeScript and mjs (console front end, harness), POSIX shell smoke scripts. Untrusted input: HTTP requests and headers into the gateway and the sidecar, JSON request bodies, files in a drop-box directory that a container writes (the Python control side treats them as outside the trust boundary). Secrets: gateway keys (`x-gateway-key`), provider API keys, caller OAuth bearers passed through to an upstream, the sidecar key. Authentication: the static gateway key check, and the sidecar's presented-key check. Privilege: none beyond the process user; the sidecar spawns and signals a child process. `unsafe`: two places in the sidecar (a `getrandom` call and a `kill` call), found by grepping for `unsafe` in all Rust files; the gateway has none. The gateway is a same-protocol relay; the protocol translation and usage accounting live in the sidecar.

Ranked candidates, best first:

1. **Usage clamp conserves the window.**
   - **Anchor:** `inference-engine/sidecar/rs/src/protocol.rs:550` (`clamp_usage`), projection at `:538` (`usage_out`).
   - **Contract:** for every `Usage` and every `window`, `clamp_usage` returns `None` when `window == 0` or the three input columns sum to at most `window`; otherwise it returns `Some(u)` whose projection through `usage_out` has input columns summing to exactly `window` and the same `output`, and the function never panics (the `window - scaled.iter().sum::<u64>()` subtraction and the `scaled[i] += 1` increments never overflow).
   - **Class:** arithmetic or length safety.
   - **Language and what could check it:** Rust. Kani can in principle check the panic freedom and the sum equality on symbolic `u64` inputs; the `u128` multiply-and-divide in the scaling step and the three-element sort are the expensive part for a bit-level solver, and the cost was not measured here. Verus can in principle state it, but exact floor-division reasoning is nonlinear arithmetic that its solver handles poorly without helper lemmas, and the `Vec`, closure and `sort_by` use means a twin of the core would be needed.
   - **Blocks a verifier:** `u128` nonlinear division; `Vec`, iterator closures and `sort_by` in the body (Verus); loop unwinding of the remainder distribution (Kani).
   - **Value/cost:** a property test already proposed in the property guide covers this to sampled depth, which is likely enough for a conservation law with a one-line oracle; the verifier's extra value is "all `u64` inputs, no overflow", which is the one corner a sampler can miss. Best verifier candidate in this repo only because it is pure and numeric; still a medium call, not a clear win.

2. **Upstream credential flow: caller secrets are not forwarded, the provider key goes only to its provider.**
   - **Anchor:** `inference-engine/router/gateway/src/relay/upstream.rs:161` (`upstream_headers`), with `bearer_of` at `:63` and the match on credential policy at `:198`-`:230`.
   - **Contract:** the outbound header set is built from scratch; the caller's `x-gateway-key` and `authorization` reach the upstream only in the documented OAuth-passthrough case (as `authorization`, never as the gateway key), the provider key is sent only on a leg whose credential policy is the provider-key one, and a missing credential returns an error with no upstream call. Secondary precondition: `bearer_of`'s `expect` cannot fire, because the bytes come from an existing `HeaderValue`.
   - **Class:** secret handling.
   - **Language and what could check it:** Rust. The property is an information-flow property ("no inbound secret value appears in an outbound header unless allowed"), which neither Verus nor Kani states directly; both could check a weaker functional contract on the header map if the `http` crate's `HeaderMap` were given a specification or modelled.
   - **Blocks a verifier:** `HeaderMap`/`HeaderValue` from an external crate, `Arc<Provider>`, `format!`, closures, `?` on a struct error.
   - **Value/cost:** high as a contract, low as a verifier target. The nearest practical substitute is a differential property test that generates inbound header maps carrying distinguishable secret marker values and asserts which markers appear outbound for each credential policy (the existing tests are example-based). Not a verifier job.

3. **Authentication gates: one comparison per repo, two different comparators.**
   - **Anchors:** `inference-engine/sidecar/rs/src/protocol.rs:470` (`safe_equal`), `:479` (`presented_key`), used in `inference-engine/sidecar/rs/src/http.rs:185` (`front`); `inference-engine/router/gateway/src/auth.rs:20` (`check`).
   - **Contract:** `safe_equal(a, b)` is true exactly when `a == b` and both are non-empty, and its running time does not depend on where the inputs first differ; `check` returns `Ok` only when the `x-gateway-key` header equals one configured key and reads no other header; `presented_key` never panics on any header bytes.
   - **Class:** secret handling (authentication).
   - **Language and what could check it:** Rust. The functional part of `safe_equal` is a short fold; Verus or Kani can prove it equals `a == b` (bounded length for Kani, a loop invariant for Verus). The timing part cannot be stated in either tool, because neither models time; constant-time checking is a separate family of tools (from general knowledge, unverified here). From reading, `check` uses `k == t` (ordinary string equality), while the sidecar uses the constant-time fold; this is a hypothesis about a timing side channel at the gateway, not a measured one, and its exploitability over a network is a separate question.
   - **Blocks a verifier:** `HeaderMap` and `from_utf8_lossy` (external types); the timing property is out of reach of both tools.
   - **Value/cost:** low for a verifier (tiny functions, behaviour already pinned by the example test in `auth.rs`, which iterates a matrix of other headers that must be ignored); the useful action is a one-line hardening decision about the gateway comparator, which needs no verifier.

4. **Child process signalling: the pid is live when `kill` is called.**
   - **Anchors:** `inference-engine/sidecar/rs/src/persona.rs:125` (`kill_child`, the `unsafe` `libc::kill` at `:128`), set at `:298`, cleared at `:437`.
   - **Contract:** state invariant: `pid` is `Some(p)` only while the child spawned at `:298` has not been reported exited, `p > 0`, and `kill` is never called with 0 or a negative value (which would address a process group). The `// SAFETY` comment states this for the pid of a child this process spawned.
   - **Class:** `unsafe` or memory precondition (a process-ownership precondition rather than a memory one); also a state-machine safety property.
   - **Language and what could check it:** Rust with async tasks (tokio) and a shared `World`. Neither Verus nor Kani handles the async runtime; the pid-lifecycle part could be extracted into a small synchronous state machine and checked there, which is a model rather than the code. From reading, `x as i32` on a `u32` pid is positive for any real pid; the open question is the window between the child exiting and the exit handler clearing `pid`, during which a recycled pid could be signalled; I did not read how the child is reaped, so this is a question, not a finding.
   - **Blocks a verifier:** `tokio` async, `Mutex<World>`, process spawning.
   - **Value/cost:** medium as a contract to write down and assert at runtime (`debug_assert!(pid > 0)`); low for a verifier.

5. **Request-file reading and validation (Python).**
   - **Anchors:** `inference-engine/control/control_fs.py:100` (`safe_read_request_bytes`), `inference-engine/control/serving_protocol.py:282` (`validate_request`).
   - **Contract:** `safe_read_request_bytes` returns `None` unless the path is a regular file that is not a symlink, and never returns more than `max_bytes`; `validate_request` is fail-closed: it returns an accepted request only if every check in its documented order passes, and the `request_id` equals the trusted basename.
   - **Class:** parser or codec bound (a size bound before parse) and state-machine safety (check order).
   - **Language and what could check it:** Python. Nothing practical exists as a mainstream contract verifier; the nearest substitutes are property tests (generate JSON bodies by mutating a valid one, assert the accept/reject partition) and, for the file reader, tests against a temporary directory containing a symlink, a FIFO and an oversize file. CrossHair (symbolic checking of Python contracts) exists, from general knowledge, unverified here, and was not assessed.
   - **Blocks a verifier:** dynamic typing, `json`, `os` calls, dictionaries.
   - **Value/cost:** the design already does the careful thing (`lstat`, `O_NOFOLLOW|O_NONBLOCK`, `fstat`, a bounded read), so a contract would mostly restate it. Not worth a verifier; a property test of the validator is the cost-effective check, and the Rust console has a validator twin that the property guide already ranks as a differential candidate.

6. **Timestamp formatting never panics.**
   - **Anchor:** `inference-engine/sidecar/rs/src/logging.rs:155` (`iso_from_ms`).
   - **Contract:** for every `f64` input (NaN and infinities included, where `as i64` saturates), the `i64` calendar arithmetic does not overflow and the result is a well-formed `YYYY-MM-DDTHH:MM:SS.sssZ` string.
   - **Class:** arithmetic or length safety.
   - **Language and what could check it:** Rust. After the cast the body is integer arithmetic with constant divisors, which suits Verus on a twin of the integer core or Kani on the whole function; Kani's support for `f64::floor` was not checked (from general knowledge, floating-point support in bounded model checkers is partial).
   - **Blocks a verifier:** the `f64` to `i64` cast and `floor`; `format!` with padding.
   - **Value/cost:** medium-low. It runs in logging, the failure mode of an overflow is a debug panic, and the date algorithm is a well-known one; a property test round-tripping against a reference date library is cheaper.

7. **`getrandom` loop.**
   - **Anchor:** `inference-engine/sidecar/rs/src/sidecar.rs:127` (`random_bytes`, `unsafe` at `:132`).
   - **Contract:** on `Ok`, the returned buffer is fully written; each call passes the unfilled tail of `buf` with its true length; `got` never exceeds `n`.
   - **Class:** `unsafe` or memory precondition.
   - **Language and what could check it:** Rust. Kani can check the loop with the extern call stubbed by a nondeterministic return bounded by the requested length, which proves the loop's arithmetic and pointer ranges given the assumption that the kernel returns at most the requested count; the assumption is the whole safety argument and the verifier would only restate it.
   - **Blocks a verifier:** the extern `libc::getrandom` needs a hand-written stub.
   - **Value/cost:** not worth it. The `// SAFETY` comment already carries the argument.

8. **Small parsers: model ids, dot segments, session ids.**
   - **Anchors:** `inference-engine/sidecar/rs/src/protocol.rs:109` (`parse_model_id`), `inference-engine/sidecar/rs/src/http.rs:252` (`has_dot_segment`), `inference-engine/router/gateway/src/telemetry/record.rs:52` (`read_session_id`).
   - **Contract:** none of the three panics on any string (including slicing at `rest[at + 1..]` in `record.rs`, safe because `at` is the byte index of an ASCII `_`); `has_dot_segment` is true for every plain or percent-encoded `.` or `..` segment so such a path never reaches persona lookup; `parse_model_id` accepts only a known family with an optional provider prefix and an optional effort suffix.
   - **Class:** parser or codec bound.
   - **Language and what could check it:** Rust. Kani with bounded strings can check panic freedom; Verus's support for `str` methods such as `strip_suffix` and `rsplit_once` is thin (from general knowledge, unverified here).
   - **Blocks a verifier:** `str` library methods, `serde_json::Value`.
   - **Value/cost:** low. `has_dot_segment` is defence in depth (persona lookup is an exact match on configured names, so a traversal string would not match anyway). Property tests (listed in the property guide for `parse_model_id`) are the proportionate check.

Best first target in this repo: if only one contract is attempted, `clamp_usage`: pure, numeric, a crisp conservation law, and the one place a verifier proves "no overflow for any `u64`" that a sampler may miss. The most security-relevant contract is the credential flow in item 2, and it is a test target, not a verifier target.

## scripts

**Stack and where the risk is.** POSIX shell (dash-dialect shims and installers) plus bash for interactive aliases and a dotfile registry, two substantial Perl programs (an APT maintenance tool that runs as root, and a cache-pruning tool that deletes directories), a small vendored C build system, and a blame-count script in JavaScript. Untrusted input is mostly the host itself: package names and versions from `dpkg-query`, directory trees and symlinks, mount tables, Docker JSON. Privilege: `util/debian-maintenance/debian-maintenance.pl` re-executes itself under `sudo` and then purges kernel packages with `apt-get`; the cache pruner removes directories with `rm -rf --one-file-system`. Secrets: none found. Authentication: none. Memory handling: the C build system is the only place with raw `malloc`, `strcpy`, `memcpy`, variadic argument lists and `system()` calls. No Rust here. The C is a vendored third-party tool; findings on it are report-only.

Ranked candidates, best first:

1. **Kernel keep-set: the running kernel and the newest N are never purged.**
   - **Anchor:** `scripts/util/debian-maintenance/debian-maintenance.pl:255` (`select_protected_kernels`), with the sort in `:239` (`load_installed_kernels`) and the companion list in `:289` (`build_kernel_purge_list`).
   - **Contract:** given kernels sorted oldest to newest and a running release present in the list, the protected set holds the running kernel and the newest `$KEEP_NEWEST_KERNELS` packages, protected and removable partition the list, and a failure (running kernel absent, or a protected kernel without a readable `/boot/vmlinuz-<release>`) returns an empty list so nothing is purged. Precondition not checked by the function: the input is sorted; `load_installed_kernels` establishes it with a swap loop that calls `dpkg --compare-versions`.
   - **Class:** privilege or ordering invariant (a safety property of a destructive root tool).
   - **Language and what could check it:** Perl. Nothing practical exists; the nearest substitutes are the property test the property guide ranks as this repo's best first target, a runtime assertion after the call (protected and removable disjoint and covering), or a typed rewrite of the pure selection core (a few lines over a list of records), which a Rust verifier could prove but which costs more than the function is worth.
   - **Blocks a verifier:** the language has no verifier; the code also depends on `dpkg`, `/boot` and `uname` through fakeable seams.
   - **Value/cost:** a property test covers this; the contract is worth writing as a runtime assertion. Hypothesis from reading, not run: the keep-set is keyed by package name while the companion purge list is keyed by release (`build_kernel_purge_list` derives `linux-modules-<r>` and `linux-headers-<r>` from each removable image's release). If a signed and an unsigned image with the same release were both installed and the keep boundary fell between them, the removable one's release names would also name the protected one's modules and headers, and they would enter the purge list. The later check that `apt-get -s purge` removes exactly the listed packages would pass, because they are listed. It needs both variants of one release installed at once, which I did not check is possible.

2. **Purge ordering: simulate, confirm, then purge the same list.**
   - **Anchors:** `scripts/util/debian-maintenance/debian-maintenance.pl:384` (`unexpected_purge_removals`), `:393` (`run_kernel_cleanup`), `:155` (`is_boot_critical_package`), `:162` (`validate_no_boot_removals`).
   - **Contract:** the real `apt-get -y purge` runs only after `apt-get -s purge` over the same list removes nothing outside it and after an interactive confirmation; in the upgrade and autoremove paths no removal is boot-critical (`validate_no_boot_removals`).
   - **Class:** privilege or ordering invariant.
   - **Language and what could check it:** Perl calling external programs. Nothing practical exists; the nearest substitute is the existing unit script with faked command seams plus a test that records the command sequence. By reading, `@purge` is built once in `run_kernel_cleanup` and used for both the simulation and the purge, so the ordering holds. The kernel purge path does not call `is_boot_critical_package`, which is expected (the images it removes match that pattern); the guard there is the keep-set plus the exact-match simulation.
   - **Blocks a verifier:** external commands, interactive input, no verifier for Perl.
   - **Value/cost:** not worth a verifier; a recorded-command-sequence test is the proportionate check.

3. **Root self-elevation.**
   - **Anchor:** `scripts/util/debian-maintenance/debian-maintenance.pl:125` (`require_root`).
   - **Contract:** when not root, the only thing executed with elevated privilege is `sudo -- <absolute shim path or perl plus absolute script path> <original args>`; with no `sudo` the program refuses.
   - **Class:** privilege or ordering invariant.
   - **Language and what could check it:** Perl; nothing practical. The shim path comes from an environment variable that the invoking user controls, but it is passed to `sudo` as a command and `sudo` applies its own policy; I did not read the sudoers policy on any host, so whether this matters is outside what was read.
   - **Blocks a verifier:** no verifier for Perl; the property is about the `sudo` interface.
   - **Value/cost:** not worth it.

4. **Guarded removal: nothing outside the root, the root itself, or a symlink target is removed.**
   - **Anchors:** `scripts/util/cache-prune/perl/CachePrune/Actions.pm:119` (`guarded_remove`), `:133` (`path_contained`), `:177` (`outermost_marker_dirs`).
   - **Contract:** `guarded_remove` removes `$cand` only when the realpath of its parent plus its basename lies strictly under the root, returns 2 for the root itself, and removes a symlinked leaf as a link; `outermost_marker_dirs` returns directories no one of which is a prefix of another and which cover every marker, never entering `.git` or `node_modules`.
   - **Class:** privilege or ordering invariant (a destructive operation guarded by a path predicate).
   - **Language and what could check it:** Perl; nothing practical. The pure part is a string-prefix predicate over realpaths, which a typed rewrite could verify, but the risk is in the filesystem, not the predicate. Hypothesis from reading: the check and the `rm -rf` are separate steps on a path string, so a parent directory replaced by a symlink between them is a time-of-check to time-of-use window; I did not test whether `--one-file-system` or the realpath step closes it.
   - **Blocks a verifier:** the filesystem as shared mutable state; no verifier for Perl.
   - **Value/cost:** medium for a property test over generated directory trees with symlinks (the property guide ranks it medium-high and notes the generator is the expensive part); not worth a verifier.

5. **Variadic path join in C.**
   - **Anchor:** `scripts/tools/build_system/parts/string.c:266` (`path_join_`).
   - **Contract:** for every list of non-NULL, non-empty strings, the output buffer is large enough, written without overrun, and NUL-terminated; every `strlen` is evaluated only on non-NULL arguments.
   - **Class:** arithmetic or length safety (and memory handling).
   - **Language and what could check it:** C. A bounded model checker such as CBMC fits this function well: it is pure, string-only and has no external state, and CBMC handles variadic functions to my knowledge (from general knowledge, unverified here). Frama-C/WP could prove it with a hand-written specification of the variadic arguments, which is more effort and whose variadic support is limited (from general knowledge, unverified here).
   - **Blocks a verifier:** the variadic interface needs a bounded harness that fixes the argument count; strings must be bounded.
   - **Value/cost:** a bounded check here is plausible and cheap relative to the others in this repo. Reading-only hypotheses: (a) `l` is `strlen(s)` computed at `:296`, before the `if (s)` test at `:298`, so a NULL argument crashes (already confirmed by a run in the suspicions investigation, latent because no caller read passes NULL); (b) `escape` is declared at `:271` without a value and assigned only when `l > 1` at `:300`, so for a length-0 or length-1 argument the later read at `:308` is of an uninitialised variable; (c) for an argument that is empty, or exactly `/`, at a middle position, `s[l-1]` at `:308` reads the byte before the string and `l--` then wraps to the maximum `size_t`, which would make the following `memcpy` read and write far out of range. None of (b) and (c) was run, and I did not check that a real caller can reach them. A verifier would find (a), (b) and (c) at once; a property test already found (a).

6. **Hash table and string cache invariants.**
   - **Anchors:** `scripts/tools/build_system/parts/hash.c:30` (`hash_find_bucket`), `:72` (`hash_insert`), `scripts/tools/build_system/parts/strcache.c:117` (`strncache`).
   - **Contract:** state invariant: `fill` counts occupied buckets and stays below `alloc`, so `hash_find_bucket` always finds an empty bucket or the key and never returns -1 (an index of -1 would be an out-of-bounds write in `hash_insert`); `strncache(in, n)` returns the same pointer for equal `n`-byte prefixes.
   - **Class:** state-machine safety (and memory handling).
   - **Language and what could check it:** C. CBMC can check bounded insert sequences against a small `alloc`; unbounded invariants over the growth path need loop invariants, which is Frama-C/WP territory and laborious (both from general knowledge, unverified here).
   - **Blocks a verifier:** heap allocation of the bucket array, `int` fill and `alloc` arithmetic, a hash function over strings.
   - **Value/cost:** low to medium. The `strncache` defect (the lookup compares the full input with `strcmp`, so a prefix key never hits) is already confirmed by a run in the suspicions investigation, so "a property test already covers this".

7. **Destructive and shell-composed commands in the build system.**
   - **Anchors:** `scripts/tools/build_system/parts/init.c:71` (`system(sprintfdup("rm -rf %s/*", obj->build_dir))`), `scripts/tools/build_system/parts/gcc.c:64` (`system(cmd)` with unquoted paths and flags).
   - **Contract:** precondition: `build_dir` is non-empty, is not `/`, and contains no shell metacharacter or space before it is spliced into a shell command.
   - **Class:** privilege or ordering invariant (a precondition on a destructive call).
   - **Language and what could check it:** C. A verifier could prove a precondition on the string, but nothing in C tooling I know of models what `system()` does with the result, so the useful contract is a runtime check at the call site. Reading-only hypothesis: `build_dir` is `path_join(base_build_dir, build_subdir)`; with an empty base and an empty subdir the join is `/`, and with `clean_first` set the command would be `rm -rf //*`. It depends on how the project sets `base_build_dir`, which I did not trace.
   - **Blocks a verifier:** `system()` and shell semantics.
   - **Value/cost:** not worth a verifier; a runtime guard is a few lines.

8. **File reading and `~` expansion in C.**
   - **Anchors:** `scripts/tools/build_system/parts/fs.c:112` (`resolve_path`), `:305` (`read_whole_file`).
   - **Contract:** `resolve_path` never dereferences NULL (`getenv("HOME")` at `:129`-`:132` is passed to `strlen` unchecked); `read_whole_file` terminates, allocates `fsize + 1` for a valid size, and stops when `fread` returns no progress (the loop at `:323` has no exit on a zero read, and `ftell` at `:318` returns -1 on failure, which converts to the maximum `size_t`).
   - **Class:** arithmetic or length safety.
   - **Language and what could check it:** C with libc I/O. CBMC needs models of `fopen`, `fread` and `ftell`; its library models cover only part of these (from general knowledge, unverified here), so harnesses would stub them by hand. Both defects are hypotheses from reading and were not run.
   - **Blocks a verifier:** libc file I/O and `getenv`.
   - **Value/cost:** low; a reviewer finds both by reading, and the fix is two checks.

9. **Shell and Perl helpers: number and date parsing.**
   - **Anchors:** `scripts/util/cache-prune/perl/CachePrune/DockerResidue.pm:58` (`hbytes`), `:106` (`ts`); `scripts/util/dotfiles.sh:175` (`dotfile_add`, `cp -a --remove-destination -- "$filename" "$destination"`) and `scripts/link.sh` (`ln -sfn` into `$HOME`).
   - **Contract:** `hbytes` returns the exact integer byte count of a decimal size string; `ts` returns undef or dies for a string that is not a calendar time; `dotfile_add` writes only under the registry directory.
   - **Class:** arithmetic or length safety; parser or codec bound.
   - **Language and what could check it:** Perl and shell. Nothing practical exists for either; ShellCheck is a linter and does not prove a contract (from general knowledge). The nearest substitutes are the suspicions investigation's exhaustive small-domain enumeration, which already found `hbytes` returning one byte low for some decimal sizes and `ts` rolling impossible dates over, and fake-`PATH` smoke tests for the shell. `dotfile_add` takes the registered name from the caller's argument without a check that it stays inside the registry (a `..` component would escape); this is user-run code on the user's own files, a hypothesis from reading and low impact.
   - **Blocks a verifier:** no verifier for Perl or shell.
   - **Value/cost:** a property test already covers or confirmed the Perl cases; not worth it for the shell.

Not worth considering: `util/*.sh` helpers that wrap `curl`, `pactl`, `/sys` and git; their cores are one or two commands and the contract would be a restatement of the command's own documentation. I did not read `util/dotfiles.sh`, `util/ip.sh` or `aliases.sh` beyond the lines cited.

Best first target in this repo: a bounded model check of `path_join_` in C (item 5) is the only candidate where a verifier family fits and the function is small and pure; for the destructive Perl tools, contracts as runtime assertions plus the property tests the property guide already proposes.

## semsearch

**Stack and where the risk is.** One Rust library crate: an SQLite plus FTS5 index, query building, reciprocal-rank fusion, an in-memory sign-code vector index, hybrid search. The workspace sets `unsafe_code = "deny"` (`semsearch/Cargo.toml`), and grepping all Rust files for `unsafe` found nothing. Untrusted input: the query string (turned into an FTS5 expression), the index file itself (SQLite metadata and embedding blobs read back on open, which a tampered or corrupt file can control), and caller-supplied embedding vectors. Secrets and authentication: none. Memory handling: all safe Rust; the C code underneath (SQLite, through `rusqlite`) is out of scope.

Ranked candidates, best first:

1. **Sign-code store keeps its layout invariant.**
   - **Anchor:** `semsearch/crates/semsearch/src/vector.rs:91` (`Codes`), `:111` (`insert`), `:122` (`remove`), `:139` (`nearest`).
   - **Contract:** state invariant: `bits.len() == rowids.len() * words`; `pos` maps each stored rowid to its index and nothing else; `remove` (a swap-with-last) keeps both true; every code passed to `insert` has exactly `words` words.
   - **Class:** state-machine safety (and slice-bound safety: the `bits[i * w..(i + 1) * w]` slices in `nearest` and `insert` are in range only if the invariant holds).
   - **Language and what could check it:** Rust. Verus can in principle state the invariant on a twin that replaces the `HashMap` by a spec-level map (library map support was not checked here); Kani can check bounded operation sequences against the real struct, though `HashMap` is expensive for a bounded model checker (from general knowledge, unverified here).
   - **Blocks a verifier:** `HashMap<i64, usize>`, `Vec` slice arithmetic with multiplication (`i * w`, nonlinear), `select_nth_unstable`. The width precondition is a `debug_assert_eq!` at `:112`, which does not run in release builds, so in a release build a wrong-width code would corrupt the layout silently; callers in `store.rs` derive the width from a length-checked blob, so I did not find a path that triggers it.
   - **Value/cost:** medium-high as a stateful property test (the property guide lists a model-based test against a brute-force scan, not piloted); medium as a verifier target. The invariant is the best statement in this repo of "what must stay true across operations", and promoting the `debug_assert_eq!` to a returned error is a cheap hardening.

2. **Query to FTS5: user text cannot become index syntax.**
   - **Anchors:** `semsearch/crates/semsearch/src/query.rs:19` (`tokenize_query`), `:35` (`quote_fts`), `:53` (`build_fts_query`).
   - **Contract:** every emitted per-term expression is a double-quoted string whose inner quotes are doubled, the only unquoted character appended is a trailing `*` on the last term, and the joined expression has a fixed shape `("phrase") OR (t1 AND t2 ...)` for any input string.
   - **Class:** parser or codec bound.
   - **Language and what could check it:** Rust, string manipulation. Kani with a bounded input could check the syntactic shape; Verus's string reasoning is thin (from general knowledge, unverified here). The semantic half ("SQLite's FTS5 parser reads this as the intended expression") cannot be checked by either, because it lives in SQLite. From reading, the tokenizer's character set (`is_term_char` at `:10`) never includes `"`, so the quote-doubling in `quote_fts` is not reached through this caller, which makes the injection safety hold twice over.
   - **Blocks a verifier:** `str` library methods (`to_lowercase`, `split` with a closure, `trim_matches`), and the external SQLite parser for the semantic half.
   - **Value/cost:** medium. Security-relevant (query injection) but cheap to cover with a property test that feeds arbitrary strings to `MATCH` against a real SQLite and asserts no syntax error (a differential against the real parser, which is the only oracle that reaches the semantic half). The property guide already ranks the shape invariant as a candidate.

3. **Index-file decoding: embedding dimension and blob length.**
   - **Anchors:** `semsearch/crates/semsearch/src/store.rs:218` (the `embedding_dim` metadata parse), `:235` (`blob.len() != space.dim * 4`), `semsearch/crates/semsearch/src/search.rs:292` (`blob.len() != query.len() * 4`), `semsearch/crates/semsearch/src/vector.rs:53` (`from_blob`), `:63` (`sign_code_from_blob`).
   - **Contract:** for every metadata string and blob read from an index file, loading returns `Err(Corrupt)` or a consistent state, and never panics or builds a table whose word width disagrees with the codes inserted.
   - **Class:** parser or codec bound.
   - **Language and what could check it:** Rust. The arithmetic is simple enough for Kani on the pure length check, or for Verus on a twin. Hypothesis from reading, not run: `space.dim * 4` is unchecked `usize` multiplication on a number parsed from the file, so a corrupt `embedding_dim` near the top of `usize` panics in a debug build and wraps in a release build; after wrapping, the length test could pass for a short blob while `Codes::new(dim)` computes a width from the original huge `dim`.
   - **Blocks a verifier:** `rusqlite` row access (external, I/O); only the pure length arithmetic can be isolated.
   - **Value/cost:** low as a verifier target. The fix is `checked_mul` and a bound on `dim`, and a property or example test that opens an index with a corrupt metadata value; a proof adds little beyond that.

4. **Reciprocal-rank fusion.**
   - **Anchor:** `semsearch/crates/semsearch/src/fusion.rs:29` (`fuse`).
   - **Contract:** the output is a permutation of the candidate indices, sorted by fused score descending with the documented tie-breaks; each leg's assigned ranks are distinct and begin at 1; the function never indexes out of bounds for any `text_ranks` and any leg score vector shorter or longer than `n`.
   - **Class:** arithmetic or length safety (and a sort-order invariant).
   - **Language and what could check it:** Rust. Kani can check panic freedom and the permutation property for a small bounded `n` (the sort is the costly part); Verus would need a twin because of `sort_by` with closures.
   - **Blocks a verifier:** `sort_by` with a comparator closure, `f64` arithmetic.
   - **Value/cost:** low for a verifier. The property guide ranks it its best first target as a property test with a naive oracle, and that covers it; the code is not security-sensitive beyond the fact that a panic would take down a search call.

5. **Two implementations of the sign code agree.**
   - **Anchors:** `semsearch/crates/semsearch/src/vector.rs:63` (`sign_code_from_blob`) and `:79` (`sign_code`).
   - **Contract:** for every blob whose length is a multiple of the element width, `sign_code_from_blob(blob)` equals `sign_code(from_blob(blob))`; and `out[i / 64]` is in range for every `i`.
   - **Class:** arithmetic or length safety (equivalence of two implementations).
   - **Language and what could check it:** Rust. Kani can check equivalence for bounded dimensions on the real code (`f32` comparisons are supported to my knowledge; from general knowledge, unverified here); a seeded unit test at `:268` already compares them on generated vectors including edge values.
   - **Blocks a verifier:** none structural; the cost is the unwinding bound.
   - **Value/cost:** low-medium. An existing test covers the equivalence on sampled inputs; a bounded proof would add the all-values guarantee at small dimensions only.

6. **Schema rebuild quoting.**
   - **Anchor:** `semsearch/crates/semsearch/src/store.rs:353` (`execute_batch(&format!("DROP TABLE IF EXISTS \"{}\";", name.replace('"', "\"\"")))`).
   - **Contract:** every table name read from `sqlite_master` of an untrusted index file is quoted so it cannot end the statement.
   - **Class:** parser or codec bound (identifier quoting).
   - **Language and what could check it:** Rust plus SQLite. The quoting is the standard doubling, correct by reading; nothing in either tool states "SQLite parses this as one identifier". A test that creates a table named with a quote and a semicolon and rebuilds is the substitute.
   - **Blocks a verifier:** the SQLite parser.
   - **Value/cost:** not worth a verifier; one example test.

Best first target in this repo: the `Codes` layout invariant (item 1), as a model-based test first and a verifier target second; the one concrete hardening is `checked_mul` in item 3.

## research

**Stack and where the risk is.** Bun scripts with no dependencies under `scripts/`: a measurement driver (`measure.mjs` and `scripts/lib/`), interval statistics, an index renderer, and two small shell probes that run inside a measured container. Little is security-sensitive. Untrusted input: the standard output of the measured commands (the line protocol is `MEASURE <metric> <value> [unit]`), the bytes coming back over a remote channel the driver opens (an `ssh` shell or similar), and the author's own JSON config. Secrets, authentication and `unsafe`: none; no privilege beyond the user's. The probes pass capabilities such as `PERFMON` only when the invoker grants them (the header of `cpuprobe.sh` says so); I read only the header of each probe and none of the shell body past it.

Ranked candidates, best first:

1. **Line protocol parse.**
   - **Anchor:** `research/scripts/lib/measure-run.mjs:82` (`parseProtocol`), with the line grammar and the decimal-only number pattern just above it.
   - **Contract:** every line starting `MEASURE` either yields exactly one finite decimal value under a metric name or one protocol error; a metric name is recorded at most once; no input changes the prototype of the result object.
   - **Class:** parser or codec bound.
   - **Language and what could check it:** JavaScript. No practical contract verifier exists for JavaScript or TypeScript in my knowledge (from general knowledge, unverified here); the nearest substitutes are a property test over generated lines and a one-line fix of the representation. The earlier question whether hexadecimal and binary literals are accepted is resolved in the current code: the decimal pattern rejects them (the suspicions investigation recorded it as needing an owner decision at an earlier commit). Hypothesis from reading, not run: the result is a plain object `{}` and the duplicate test is `m[1] in metrics`, so a variant printing a metric named `constructor` or `toString` is reported as a duplicate on first sight, and a metric named `__proto__` assigns the prototype rather than creating an entry; a `Map` or `Object.create(null)` removes the question. The input comes from the experiments the author runs, so this is correctness, not an attack surface.
   - **Blocks a verifier:** no verifier for the language.
   - **Value/cost:** low. A property test, or the one-line representation change, covers it.

2. **Remote channel framing.**
   - **Anchors:** `research/scripts/lib/measure-channel.mjs:92` (`run`), `:71` (`#line`), `:14` (`LOOP`, the remote POSIX shell loop).
   - **Contract:** state invariant: once any framing error, timeout or EOF occurs the channel is broken for good and no later call returns data; each response header carries the per-run nonce and the echoed sequence number, and a mismatch is an error, never a retry; a header line is bounded before it is buffered further; the payload is consumed by length, never by content.
   - **Class:** state-machine safety (and a parser bound on the header).
   - **Language and what could check it:** JavaScript on the host and dash-dialect shell on the remote side. Neither has a practical verifier. A protocol model in a model checker such as TLA+ would be a separate artefact that the code does not reference (from general knowledge); the proportionate substitute is a property test that feeds the response bytes in random chunk sizes and with injected corruption and asserts the error-or-correct-data outcome.
   - **Blocks a verifier:** the language; child-process I/O and timers.
   - **Value/cost:** not worth it. The code is careful (length-prefixed framing, nonce, sequence number, fail-loud with no coercion) and has example tests; the contract is already stated in the file's header comment.

3. **Shell quoting of argv.**
   - **Anchor:** `research/scripts/lib/measure-run.mjs:98` (`shQuote`), used by `invocationScript` in `research/scripts/lib/measure-channel.mjs`.
   - **Contract:** for every string without a NUL, a POSIX shell reading `shQuote(s)` as one word yields exactly `s`.
   - **Class:** parser or codec bound (quoting).
   - **Language and what could check it:** JavaScript, an arbitrary-string function. The property guide lists the round trip through a real `sh` as a differential test; that is the oracle that reaches the shell's semantics, which no verifier here models.
   - **Blocks a verifier:** the shell's semantics.
   - **Value/cost:** a property test is the right tool and the property guide already proposes it; the function is one line and its argument is the standard single-quote replacement.

4. **Index renderer: marker replacement and project collection.**
   - **Anchors:** `research/scripts/render-index.mjs:122` (`replaceRegion`), `:88` (`collectProjects`).
   - **Contract:** the output differs from the input only between the two markers, which must occur exactly once and in order; an investigation folder without a valid creation date fails the run rather than being skipped.
   - **Class:** parser or codec bound.
   - **Language and what could check it:** JavaScript; nothing practical. The function uses slicing rather than `String.prototype.replace`, so a `$&` in the generated block is not interpreted, which I checked by reading.
   - **Blocks a verifier:** the language.
   - **Value/cost:** not security-sensitive; the existing tests and the repo's `--check` mode already guard it. Not worth it.

5. **Statistics.**
   - **Anchors:** `research/scripts/lib/measure-stats.mjs:28` (`percentile`), `:89` (`binomCdf`), `:134` (`newcombeDiff`).
   - **Contract:** interval and percentile functions return values inside their documented ranges for every valid input.
   - **Class:** arithmetic or length safety (floating point).
   - **Language and what could check it:** JavaScript floating point; nothing practical proves floating-point numerical properties for it. Already examined with property tests in the property guide's pilot (an antisymmetry property on `newcombeDiff`, and its `n = 0` defect).
   - **Blocks a verifier:** floating-point semantics; no verifier for the language.
   - **Value/cost:** not worth it, and not security-sensitive.

Best first target in this repo: none for a verifier. If anything is touched, the `parseProtocol` representation change in item 1.

## Cross-repo pattern

- **The Rust code that is worth a verifier is small and pure; the security-relevant Rust code is not.** `clamp_usage`, the `Codes` layout invariant and the length arithmetic on index-file metadata are pure, numeric or structural, and fit Verus or Kani in principle. The code that carries the secrets and the privilege (the credential flow in `upstream_headers`, the authentication gates, the child-process signalling) runs through `HeaderMap`, `Arc`, `Mutex` and async tasks, which neither tool handles directly. The fleet's security contracts are mostly information-flow or ordering properties over such types, where the proportionate check is a differential or model-based property test.
- **Most security-sensitive code outside Rust has no verifier family at all.** The root and destructive tools are Perl and shell; the contracts that matter (never purge the running kernel, never remove outside the root, simulate before purging) are real and short, and the honest substitute is a runtime assertion plus a property test over generated inputs with faked command seams, which the property guide already ranks. A typed rewrite of a few lines of selection logic to verify it costs more than the logic.
- **C is the exception where a verifier family fits and the code is small.** The vendored build system is variadic, string and allocation heavy: the kind of code bounded model checking suits, and the reading found several candidate defects (`path_join_`, `read_whole_file`, `resolve_path`) that such a tool would settle at once. The caveat is that it is third-party, so the output is a report, and `system()` command construction (the `rm -rf` and `gcc` lines) is outside what any C verifier models.
- **A property test already covers or confirmed several of the best properties.** The suspicions investigation confirmed `path_join_` on NULL, the `strncache` prefix key and the `hbytes` and `ts` defects by running them; the property guide ranks `clamp_usage`, `fuse`, the kernel keep-set and `guarded_remove` as first targets. For each of these, the verifier's extra value over the property test is only the all-inputs guarantee on a bounded numeric corner.
- **Candidate defects found by reading here, all unrun.** Kernel companion packages keyed by release against a keep-set keyed by package (scripts); `path_join_` on an empty or lone-slash middle argument and an uninitialised `escape` (scripts); `fs.c` `getenv` and `ftell`/`fread` handling (scripts); `rm -rf` on an empty build directory (scripts); unchecked `dim * 4` on index-file metadata (semsearch); a plain-object metric map in `parseProtocol` (research); the gateway's ordinary string comparison of its key (inference-engine). Contracts written for them would have caught each, which is the practical value of writing a contract before choosing a tool.
- **What was not read.** `inference-engine`: the console server's HTTP handlers and the TypeScript front end, the Python Open WebUI sync, the ONNX and llama service scripts. `scripts`: the interactive alias files, `util/dotfiles.sh` beyond the cited lines, the blame-count script. `semsearch`: the benchmark example and the integration tests. `research`: the probe scripts beyond their headers, and the test files.
