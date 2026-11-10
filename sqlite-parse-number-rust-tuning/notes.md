---
created: 2026-11-10
---

# Notes: can Rust match the fast C `parse_number()`?

## Goal

Follow-up to [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust). That investigation found the optimised C extension (`c-fast`) was ~2× faster than the Rust versions and 20× smaller (14 KB vs ~300 KB). Its notes listed three Rust ideas it didn't take all the way: `#![no_std]`, an inline fast path like `c-fast`'s, and a stack buffer instead of the per-call `Vec`. This investigation tries all three and measures how close Rust gets.

## Environment

Everything builds and runs inside the Docker image defined in `Dockerfile` (`docker compose build`):

- Base image `rust:1.99.1-slim-trixie` (rustc 1.99.1, Debian 13)
- gcc 14.2, `libsqlite3-dev` (SQLite 3.46.1 headers), `python3` 3.13 with its `sqlite3` module (SQLite 3.46.1), `libclang-dev` (needed by sqlite-loadable's bindgen), `binutils`, `git`
- The upstream investigation is fetched at commit `aa4e39e` and its four extensions are rebuilt with upstream's own commands
- Host: AMD Ryzen 9 7900X; the compose service is pinned to one core (`cpuset: "4"`)

## Approach

One new crate, `rust-raw/`, with no dependencies at all. Instead of rusqlite or sqlite-loadable it uses the `sqlite3_api_routines` function table that SQLite passes to an extension's entry point, the same way a C extension's `SQLITE_EXTENSION_INIT2` does. The slot indices were taken with `offsetof()` from `sqlite3ext.h`; SQLite only appends to this table, so they are stable.

Two cargo features give four builds:

- `nostd`: `#![no_std]`, using `core` only, with a panic handler that calls `abort`.
- `fast`: a port of `c-fast`'s single pass. Integers are built directly, and decimals with ≤ 2^53 significand and ≤ 22 fractional digits use one exact division (Clinger's fast path). Without it, the cleaned text is copied to a buffer and parsed with `str::parse`, which is the upstream Rust algorithm.

Every build uses a 128-byte stack buffer, falling back to `sqlite3_malloc` for longer inputs; there is no per-call `Vec`. `core`'s `str::parse::<f64>` is available without `std`, so even the `no_std` build keeps Rust's correctly rounded float parser. That parser is also the slow-path fallback in `fast`, where `c-fast` uses `strtod`, so this fallback doesn't depend on the locale.

The upstream `test.py` / `fuzz.py` / `bench.py` are used unchanged except for `harness.patch`, which adds the four new builds to their extension lists.

## Log

- The first `load_extension` failed with `undefined symbol: sqlite3_std_init`, because SQLite derives the entry-point name from the file name. Each build now goes to `rust-raw/<variant>/libparse_number.so`.
- All 8 extensions pass the 40 hand-written cases.
- Size: the `std` build with raw FFI is still 289 KB, about the same as sqlite-loadable (291 KB) and rusqlite (314 KB). So the wrapper crates are not what makes Rust big; `std` is.
- `no_std`: 23.3 KB (23.6 KB with `fast`). It imports only `abort`, `memcpy` and `memset`, and it has no `NEEDED` libraries, not even libc. Those symbols come from the host process at load time.
- Where the remaining ~23 KB goes: 12.4 KB of `.rodata`, of which 10.4 KB is core's `POWER_OF_FIVE_128` table for Eisel-Lemire, plus 3.3 KB of `f64::from_str` code. The C versions don't carry a float parser; they call glibc's `strtod`.
- `opt-level = "s"` / `"z"` on the `no_std` builds: 22.8–23.0 KB. That's not worth it, because the table sets the floor.
- Fuzz: 4 seeds × 500k × 8 extensions, no mismatches (`results/fuzz.txt`).
- Benchmarks (`results/bench_*.txt`), net ns/row, mixed / int / real:
  - c-fast 9.2 / 7.0 / 9.9
  - raw-std 14.5 / 10.7 / 17.8: just removing the wrapper and the `Vec`
  - raw-fast 9.5 / 7.0 / 11.7: ties c-fast
  - raw-nostd-fast 7.9 / 5.5 / 8.7: beats c-fast on all three
  - rusqlite 23.7 / 18.2 / 28.3; sqlite-loadable 25.7 / 18.5 / 27.6
- A repeat of mixed matched within 0.5 ns, so the 1.5 ns gap between raw-fast and raw-nostd-fast is real. Its cause is unmeasured: the parsing code is identical, and I suspect code layout or inlining differences between the two link configurations.
- Upstream numbers on a 2 vCPU VM were ~2× ours; the plain C / c-fast / Rust ordering held, with rusqlite and sqlite-loadable swapping places.

## Round 2: the three follow-ups

Three follow-ups: `strtod` for the slow path, why `no_std` is faster, and how much `unsafe` is actually needed.

- **`strtod` (`rust-raw` feature `strtod`, implies `fast`)**: the slow path NUL-terminates the stack buffer and calls libc's `strtod`. With `nostd`: **6,072 B** (`size`: 3.4 KB), importing only `abort` and `strtod`; `memcpy`/`memset` are gone too. It's smaller than c-fast's 14,224 B, which is mostly gcc's page-aligned layout. Speed is the same as `nostd,fast` because the slow path is rare. Its slow path depends on the locale, just like c-fast's.
- **Why `no_std` is faster**: perf isn't usable here (not installed, and `perf_event_paranoid=3`), so I compared disassembly. Unstripped `fast` vs `nostd,fast`: `parse_number_func` is 245 vs 243 instructions, identical apart from address constants and two `lea`s on the cold panic path. The function starts at offset 48 mod 64 in the `std` build and 32 in the `no_std` one. For an A/B test, I built both with `-C llvm-args=-align-all-functions=6 -C llvm-args=-align-loops=64`, and the gap closed (mixed 8.8 vs 8.9, repeat 8.6 vs 8.7; int 6.2 vs 5.8; real 9.7 vs 9.5). It's code placement, not `std`. The aligned builds are not the fastest, either: unaligned `nostd,fast` happened to land on a better placement (7.6–7.9 mixed). Lesson: differences under about 2 ns here are layout noise. Even `raw-fast` itself measured 9.5, 10.6 and 9.6 on mixed across three image builds.
- **Minimising `unsafe` (`rust-safe/`)**: the same fast algorithm, with the parser in its own module under `#![forbid(unsafe_code)]`. It uses slice patterns for trimming, `slice::Iter` for the loop (`as_slice().first()` for the `£` lookahead), `i64::try_from` for the range check, and `Vec` + `str::parse` on the slow path. `lib.rs` holds every `unsafe`, about 30 lines under `#![deny(unsafe_op_in_unsafe_fn)]`, each with a SAFETY comment: `slot()` (an `unsafe fn`), the `xFunc` body (deref `argv`, `from_raw_parts` for the text), the entry point, and with `nostd` a `GlobalAlloc` over `sqlite3_malloc`/`sqlite3_free` (refusing alignment > 8) plus `abort` in the panic handler. `static mut` became an `AtomicPtr`.
  - Results: safe `std` 8.0 / 5.5 / 9.4 and safe `nostd` 8.0 / 5.5 / 9.3 (repeat mixed 8.4 / 7.9), against c-fast 9.9 / 5.8 / 9.6. Sizes: 289,424 B and 24,912 B.
  - Safe code costs nothing measurable here. `std` vs `nostd` makes no speed difference, only a size difference.
- All 13 extensions: 40/40 tests; fuzz 4 seeds × 500k × 13 with no mismatches. The `strtod` builds match too, because SQLite runs in Python's C numeric locale.
- One mistake on the way: the regenerated `harness.patch` again had `a/a/` paths from `git diff --no-index` run on nested directories, so the image build failed at `git apply` until I fixed them.

## Not done

- Getting the safe crate down to strtod size without giving up locale independence would need a smaller correctly rounded slow path, e.g. a simple big-decimal algorithm instead of core's Eisel-Lemire tables. That's possible, but it's a lot of code for a path money data never takes.
- Confirming the placement explanation with hardware counters (frontend stalls / DSB misses) on a machine where perf is allowed.

## Round 3: can c-fast shrink?

The round-2 claim that Rust `nostd,strtod` (6,072 B) is smaller than `c-fast` (14,224 B) was never checked against flag parity, so I built size-only variants (a new last Dockerfile stage; `results/sizes_round3.txt`).

- gcc's default `-O2 -s` build is 14,224 B but only 3,134 B of `size` content. `-Os` alone changes nothing on disk (still 14,224 B), because the file is padding.
- `-Wl,-z,noseparate-code` alone: 6,032 B. GNU ld's default `separate-code` puts each LOAD segment on its own 4 KB file offset.
- rustc links with its bundled LLD 23.1.1 (`-C link-arg=-Wl,--version` prints it). `readelf -l` shows LLD packs the segments at unaligned file offsets, so the Rust file never paid that padding. `c-fast` linked with the same LLD (`gcc -B<gcc-ld dir> -fuse-ld=lld`): 5,784 B, already smaller than Rust's 6,072 B.
- All size flags (`noseparate-code`, `--build-id=none`, `-z norelro`, `--hash-style=gnu`, no unwind tables, `-ffunction-sections -fdata-sections --gc-sections`, strip `.comment`/`.note.gnu.property`): `c-fast` 4,752 B at `-O2`, 4,560 B at `-Os`, 5,008 B with LLD. The same link flags plus the same strip on Rust `nostd,strtod`: 5,456 B. `-C force-unwind-tables=no` changed nothing (panic=abort already has none), and `opt-level=s` saved another 64 B.
- Conclusion: with the linkers matched, C is ~0.3 KB smaller (5,784 vs 6,072 B), and with every size flag on both, ~0.7–0.9 KB smaller. The headline and findings in the README are corrected. These builds were only measured for size, not speed.
- Also noticed while preparing the next round: on this host, run-to-run spread of `bench.py mixed` for `c-fast` on one pinned core is 8.2–10.7 ns across three runs while other work loads the machine. That is the same scale as the ±1.5 ns placement effect from round 2, so the earlier "differences under ~2 ns are noise" caveat stands.
