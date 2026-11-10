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

## Not done

- Calling `strtod` from `no_std` Rust for the slow path would remove the 10 KB float table and get near C's size, but brings back the locale dependence.
- Finding out why `no_std` is faster than `std` for the same code (compare `perf annotate` of the two hot loops).
