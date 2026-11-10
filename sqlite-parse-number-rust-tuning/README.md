# Can Rust match fast C for a SQLite `parse_number()` extension?

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). With no dependencies, `#![no_std]`, a stack buffer and the same inline fast path, Rust is as fast as `c-fast` or slightly faster, and its `.so` shrinks from 289 KB to 23 KB.

> Every line of text and code here was written by an LLM (Claude Code).

## What was built

One crate, [`rust-raw/`](rust-raw/lib.rs), with **zero dependencies**. It calls SQLite through the `sqlite3_api_routines` function table that SQLite hands to every loadable extension, which is what a C extension's `SQLITE_EXTENSION_INIT2` does. It avoids the per-call `Vec` with a 128-byte stack buffer, falling back to `sqlite3_malloc` for longer inputs. Two cargo features give four builds:

| Build | `nostd` | `fast` |
|---|---|---|
| `raw-std` | – | – |
| `raw-nostd` | ✓ | – |
| `raw-fast` | – | ✓ |
| `raw-nostd-fast` | ✓ | ✓ |

- **`nostd`**: `#![no_std]`, using `core` only. `str::parse::<f64>` lives in `core`, so the correctly rounded float parser stays.
- **`fast`**: a port of `c-fast`'s single pass. Integers are built while scanning, and decimals with ≤ 2^53 significand and ≤ 22 fractional digits use one exact division (Clinger's fast path). Everything else falls back to `str::parse::<f64>`, which, unlike `c-fast`'s `strtod` fallback, does not depend on the locale.

The four upstream extensions were rebuilt from upstream's source at commit `aa4e39e` and measured on the same machine.

## Results

Net nanoseconds per row (fastest of 15 alternating runs over 2M rows, minus a `sum(length(v))` baseline; method and harness unchanged from upstream). Lower is better.

| Dataset | plain C | fast C | rusqlite | sqlite-loadable | raw-std | raw-nostd | raw-fast | **raw-nostd-fast** |
|---|---|---|---|---|---|---|---|---|
| Mixed | 30.5 | 9.2 | 23.7 | 25.7 | 14.5 | 13.7 | 9.5 | **7.9** |
| Integers only | 8.3 | 7.0 | 18.2 | 18.5 | 10.7 | 11.0 | 7.0 | **5.5** |
| Decimals only | 52.4 | 9.9 | 28.3 | 27.6 | 17.8 | 17.8 | 11.7 | **8.7** |

A repeat run of the mixed dataset agreed within 0.5 ns ([`results/`](results/)). Machine: AMD Ryzen 9 7900X, container pinned to one core. Absolute numbers are about half of upstream's (a 2 vCPU VM), and the upstream versions rank the same way (plain C slowest on mixed and decimals, fastest of them on integers; `c-fast` well ahead), except that rusqlite and sqlite-loadable swap places, within 2 ns.

| | fast C | rusqlite | sqlite-loadable | raw-std | raw-fast | raw-nostd | raw-nostd-fast |
|---|---|---|---|---|---|---|---|
| Stripped `.so` | 14,224 B | 314,288 B | 291,184 B | 288,800 B | 289,232 B | **23,280 B** | **23,616 B** |
| Shared libraries it needs | libc | libc, libgcc_s, ld-linux | libc, libgcc_s, ld-linux | libc, libgcc_s, ld-linux | libc, libgcc_s, ld-linux | none | none |
| Dependencies | SQLite header | 20 crates | 62 crates | none | none | none | none |

## Findings

- **Most of the speed gap was wrapper overhead.** Calling the C API directly with a stack buffer (`raw-std`) took mixed data from ~24 ns to 14.5 ns. That build uses the same parsing algorithm as upstream's Rust.
- **The rest was the algorithm, not the language.** With `c-fast`'s fast path ported over, Rust matches `c-fast` (`raw-fast`: 9.5 vs 9.2 ns). The `no_std` build of the same code is consistently 1.5–3 ns faster again and beats `c-fast` on all three datasets. I didn't track down why `no_std` is faster for identical parsing code; code layout is the likely suspect, but that's unmeasured.
- **The 300 KB is `std`, not rusqlite.** The dependency-free `std` build is still 289 KB. Dropping `std` takes it to 23 KB, and the result links no shared libraries at all. It resolves only `abort`, `memcpy` and `memset` from the host process.
- **The last 9 KB over C is Rust's float parser.** 10.4 KB of the `no_std` file is core's Eisel-Lemire power-of-five table, plus 3.3 KB of `f64::from_str`. C borrows glibc's `strtod` instead. `opt-level = "s"`/`"z"` only gets to 22.8 KB. Getting to C's size would mean calling `strtod` from Rust too, which brings back the locale dependence.
- **The cost is `unsafe` code.** `rust-raw/lib.rs` is ~240 lines (all four variants, one file) with raw function-pointer slots, `transmute_copy` and unchecked buffer writes. That is closer to the C version's style than to the 30-line rusqlite version.

## Correctness

- Upstream `test.py`: all 8 extensions pass all 40 cases.
- Upstream `fuzz.py`, 4 seeds × 500k inputs × 8 extensions = 16M bit-exact comparisons against a correctly rounded Python reference: **no mismatches** ([`results/fuzz.txt`](results/fuzz.txt)).

## Setup and reproduce

Everything runs in Docker; nothing is needed on the host except Docker with Compose. The image ([`Dockerfile`](Dockerfile)) contains:

- `rust:1.99.1-slim-trixie` base: rustc/cargo 1.99.1, Debian 13
- `gcc` 14.2 + `libc6-dev`: the C extensions
- `libsqlite3-dev`: `sqlite3ext.h` (SQLite 3.46.1)
- `python3` 3.13 with its `sqlite3` module (SQLite 3.46.1, extension loading enabled): test, fuzz and benchmark host
- `libclang-dev`: bindgen for sqlite-loadable
- `binutils`: `size`/`readelf` for the size table
- `git` + `ca-certificates`: fetch upstream at commit `aa4e39e`

The build fetches upstream, applies [`harness.patch`](harness.patch) (it only adds the four `raw-*` builds to the extension lists in `test.py`, `fuzz.py` and `bench.py`), and builds all eight extensions.

```bash
docker compose build
docker compose run --rm exp python3 test.py
docker compose run --rm exp python3 fuzz.py 1        # seed
docker compose run --rm exp python3 bench.py mixed   # or: int, real
```

`compose.yaml` pins the container to CPU 4 for stable timings; change `cpuset` to suit your machine.

Building `rust-raw` alone needs only a Rust toolchain:

```bash
cd rust-raw
cargo build --release --features nostd,fast
```

```sql
.load ./target/release/libparse_number
select parse_number('-$1,234.56');  -- -1234.56
```

See [`notes.md`](notes.md) for the working log.
