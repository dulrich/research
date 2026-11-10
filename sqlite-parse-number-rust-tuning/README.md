# Can Rust match fast C for a SQLite `parse_number()` extension?

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). Rust with no dependencies and the same inline fast path matches `c-fast`'s speed, even with the parser written in 100% safe Rust. Dropping `std` takes the `.so` to 24 KB, and handing the rare slow path to `strtod` takes it to 6 KB. That first looked smaller than the C file, but the gap was linker defaults: with the same linker and size flags, C is a little smaller (4.6–5.0 KB vs 5.5 KB).

> Every line of text and code here was written by an LLM (Claude Code).

## What was built

Two crates, both with **zero dependencies**. Each calls SQLite through the `sqlite3_api_routines` function table that SQLite hands to every loadable extension, which is what a C extension's `SQLITE_EXTENSION_INIT2` does.

[`rust-raw/`](rust-raw/lib.rs) is written like the C: raw pointers, a 128-byte stack buffer with unchecked writes (falling back to `sqlite3_malloc`), and every parsing function an `unsafe fn`. Cargo features select:

- **`nostd`**: `#![no_std]`, using `core` only. `str::parse::<f64>` lives in `core`, so Rust's correctly rounded float parser stays.
- **`fast`**: a port of `c-fast`'s single pass. Integers are built while scanning, and decimals with ≤ 2^53 significand and ≤ 22 fractional digits use one exact division (Clinger's fast path). Anything else falls back to `str::parse::<f64>`, which, unlike `c-fast`'s `strtod`, doesn't depend on the locale.
- **`strtod`** (implies `fast`): the slow path calls the C library's `strtod` instead, as `c-fast` does.

[`rust-safe/`](rust-safe/) is the same `fast` algorithm with `unsafe` kept to the FFI boundary:

- **Parser:** [`parse.rs`](rust-safe/parse.rs) is `#![forbid(unsafe_code)]`. It uses slices, iterators and checked indexing, and the rare slow path allocates a `Vec`.
- **FFI glue:** [`lib.rs`](rust-safe/lib.rs) holds every `unsafe`, about 30 lines. That covers reading API slots, turning `argv` and the text pointer into a slice, the entry point, and, in the `nostd` build, a global allocator over `sqlite3_malloc` plus the panic handler's `abort`.

| | `unsafe` blocks | `unsafe fn` definitions | parsing code in unsafe context |
|---|---|---|---|
| `rust-raw` | 2 | 11 | all of it (~170 lines) |
| `rust-safe` | 6 + 1 `unsafe impl` (allocator) | 5 (FFI only) | none (`forbid(unsafe_code)`) |

The four upstream extensions were rebuilt from upstream's source at commit `aa4e39e` and measured on the same machine.

## Results

Net nanoseconds per row (fastest of 15 alternating runs over 2M rows, minus a `sum(length(v))` baseline; method and harness unchanged from upstream). Lower is better. A second mixed run is in [`results/`](results/).

| Build | Mixed | Integers | Decimals | Stripped `.so` | Shared libs needed |
|---|---|---|---|---|---|
| plain C | 31.1 | 7.7 | 52.5 | 14,224 B | libc |
| **fast C (`c-fast`)** | **9.9** | **5.8** | **9.6** | **14,224 B** | libc |
| rusqlite | 24.0 | 16.9 | 26.9 | 314,288 B | libc, libgcc_s, ld-linux |
| sqlite-loadable | 24.6 | 16.7 | 27.8 | 291,184 B | libc, libgcc_s, ld-linux |
| raw `std` | 15.1 | 9.9 | 18.2 | 288,800 B | libc, libgcc_s, ld-linux |
| raw `nostd` | 14.3 | 10.1 | 18.0 | 23,280 B | none |
| raw `fast` | 10.6 | 6.4 | 12.1 | 289,232 B | libc, libgcc_s, ld-linux |
| raw `nostd,fast` | 7.6 | 5.9 | 8.6 | 23,616 B | none |
| raw `nostd,strtod` | 7.9 | 4.7 | 8.6 | 6,072 B | none |
| raw `fast` + 64-byte align | 8.8 | 6.2 | 9.7 | 309,520 B | libc, libgcc_s, ld-linux |
| raw `nostd,fast` + 64-byte align | 8.9 | 5.8 | 9.5 | 24,640 B | none |
| **safe `std`** | **8.0** | **5.5** | **9.4** | 289,424 B | libc, libgcc_s, ld-linux |
| **safe `nostd`** | **8.0** | **5.5** | **9.3** | 24,912 B | none |

Machine: AMD Ryzen 9 7900X, container pinned to one core. Absolute numbers are about half of upstream's (a 2 vCPU VM), and the upstream versions rank the same way, except that rusqlite and sqlite-loadable trade places within 1 ns.

## Findings

- **Rust's speed gap was wrapper overhead plus algorithm, not the language.** Calling the C API directly with a stack buffer (raw `std`) took mixed data from ~24 to ~15 ns. Porting `c-fast`'s fast path took it to `c-fast`'s level.
- **Safe Rust is just as fast.** The safe crate, with bounds-checked slices, an iterator loop and a `Vec` on the rare slow path, runs at 8.0 / 5.5 / 9.3 ns against `c-fast`'s 9.9 / 5.8 / 9.6. The safe hot loop walks a slice iterator, so it has no per-byte bounds checks to pay for; the one array index, `POW10[frac]`, is guarded by `frac <= 22` (I didn't confirm in the disassembly that the compiler drops that check). Either way, the `unsafe` in `rust-raw`'s parser bought nothing measurable. The only `unsafe` that's needed is the FFI boundary, which no SQLite extension in any language can avoid.
- **`no_std` doesn't make the code faster; code placement does.** Without `no_std`, the raw fast build ran 1.5–3 ns slower than the `no_std` one, even though its hot function compiles to the same instructions: 245 vs 243, differing only in address constants and the cold panic path. When I forced 64-byte function and loop alignment on both builds, the gap disappeared (mixed 8.8 vs 8.9, repeat 8.6 vs 8.7). Placement alone moves these numbers by about ±1.5 ns, and the aligned builds didn't land on the fastest placement. Treat sub-2 ns differences in the table as layout luck, including the raw/safe builds' small lead over `c-fast`. The safe `std` and safe `nostd` builds tie, which is consistent with this.
- **The 289 KB is `std`, not rusqlite.** Every `std` build is ~289 KB with no dependencies at all. Without `std` it's 23–25 KB, and the file links no shared libraries: it resolves `abort`, `memcpy` and `memset` (or `strtod`) from the host process when it's loaded.
- **Most of the remaining size is Rust's float parser.** 10.4 KB of the `no_std` file is core's Eisel-Lemire power-of-five table, plus 3.3 KB of `f64::from_str`. Calling `strtod` for the slow path drops all of it: **6,072 B, 3.4 KB of actual content**. The price is the same as `c-fast`'s: the rare slow path reads the decimal point from the host's locale. Since the slow path is rare, speed is unchanged. `opt-level = "s"`/`"z"` only reaches 22.8 KB, because the float table sets the floor.
- **Rust is not smaller than C once the linkers match (round 3).** The 14 KB vs 6 KB gap was the linkers, not the languages. gcc links with GNU ld, whose default `-z separate-code` pads each segment to a 4 KB file offset; rustc links with LLD, which does not. Linking `c-fast` with the same LLD gives 5,784 B against Rust's 6,072 B. With the same size flags on both (`-z noseparate-code`, no build-id, no RELRO, no unwind tables, `--gc-sections`, `.comment` stripped), `c-fast` is 4,752 B (`-O2`) or 4,560 B (`-Os`), and Rust `nostd,strtod` is 5,456 B ([`results/sizes_round3.txt`](results/sizes_round3.txt)). The Rust file has about 0.6 KB more content (3,378 vs 2,782 B `size`). These are size-only builds and were not benchmarked.

| Want | Build |
|---|---|
| Fastest with least `unsafe` | `rust-safe` (`std` is fine) |
| Small file, still safe and locale-independent | `rust-safe` `nostd` (25 KB) |
| Smallest Rust file | `rust-raw` `nostd,strtod` (6 KB, 5.5 KB with size link flags; locale-dependent slow path, like `c-fast`) |
| Smallest file overall | `c-fast` with size flags (4.6 KB) |

## Correctness

- Upstream `test.py`: all 13 extensions pass all 40 cases.
- Upstream `fuzz.py`, 4 seeds × 500k inputs × 13 extensions = 26M bit-exact comparisons against a correctly rounded Python reference: **no mismatches** ([`results/fuzz.txt`](results/fuzz.txt)). In the C locale the image runs in, the `strtod` builds also match exactly.

## Setup and reproduce

Everything runs in Docker; nothing is needed on the host except Docker with Compose. The image ([`Dockerfile`](Dockerfile)) contains:

- `rust:1.99.1-slim-trixie` base: rustc/cargo 1.99.1, Debian 13
- `gcc` 14.2 + `libc6-dev`: the C extensions
- `libsqlite3-dev`: `sqlite3ext.h` (SQLite 3.46.1)
- `python3` 3.13 with its `sqlite3` module (SQLite 3.46.1, extension loading enabled): test, fuzz and benchmark host
- `libclang-dev`: bindgen for sqlite-loadable
- `binutils`: `size`/`readelf` for the size table
- `git` + `ca-certificates`: fetch upstream at commit `aa4e39e`

The build fetches upstream, applies [`harness.patch`](harness.patch) (it only adds the nine new builds to the extension lists in `test.py`, `fuzz.py` and `bench.py`), and builds all 13 extensions. The 64-byte-aligned builds use `RUSTFLAGS="-C llvm-args=-align-all-functions=6 -C llvm-args=-align-loops=64"`. A last stage builds the round-3 size-only variants into `/work/sizes/`: `c-fast` with GNU ld and with the LLD that rustc ships (reached with `gcc -B<rustc gcc-ld dir> -fuse-ld=lld`), and Rust `nostd,strtod` with the same size link flags. List them with `docker compose run --rm exp sh -c 'cd sizes && ls -l'`.

```bash
docker compose build
docker compose run --rm exp python3 test.py
docker compose run --rm exp python3 fuzz.py 1        # seed
docker compose run --rm exp python3 bench.py mixed   # or: int, real
```

`compose.yaml` pins the container to CPU 4 for stable timings; change `cpuset` to suit your machine.

Building one crate alone needs only a Rust toolchain:

```bash
cd rust-safe && cargo build --release --features nostd
```

```sql
.load ./target/release/libparse_number
select parse_number('-$1,234.56');  -- -1234.56
```

See [`notes.md`](notes.md) for the working log.
