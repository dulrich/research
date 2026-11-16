# Binary-size calibration: which size, which build settings, how far attribution tools agree

On the fleet's musl toolchain (Rust 1.99.1, Alpine 3.24, `cargo auditable build --release --locked`), release binary sizes are exactly reproducible: three clean `--no-cache` builds of each of two web binaries gave the same SHA-256 and 0 differing bytes (router 5,618,832 B; tracker 7,281,208 B), so a single build per build setting is enough for an exact byte count on this toolchain and host. A rebuild can change bytes without changing size: a different build id or a changed package version changes 0.1 to 2.6 million bytes inside `.text`, `.rodata`, `.eh_frame` and `.note.gnu.build-id` while file bytes stay put, so a hash is not a size and equal sizes do not mean equal builds. Which size to quote depends on the question: file bytes for disk, gzip or zstd bytes for transfer, the `PT_LOAD` memory sizes for mapped memory, layer bytes for the image; the `size -A` total is none of those (it counts `.bss` and non-loaded sections). Build settings dominate: `opt-level=s` and `z` cut the file by 25 to 40%, `strip=false` adds 45 to 54%, `debug=true` adds about 9x, while `lto` off or thin, `codegen-units=16` and `panic=unwind` each add 0.6 to 7.8%; the dynamic glibc target is 2.3% smaller but pulls in a libc the image must carry. `cargo-bloat` attributes 93.7 to 99.0% of `.text` to crates (with a large `[Unknown]` bucket), `bloaty` accounts for every byte of the file by section and needs a debug-enabled build for per-compile-unit data, and in the `scratch` image the binary is 96.5% of the unpacked layers but in an `alpine` image only 19.0%.

Rigor for every number: exact on this toolchain and host (byte counts, n=1 per setting, justified by class A); cross-host and cross-toolchain-version determinism were not tested. Nothing here is a timing claim.

## Method

- **Corpus** (two web binaries, both fleet crates with the same release profile: `opt-level=3`, `lto=true`, `codegen-units=1`, `panic="abort"`, `strip=true`): `router` is the `router/gateway` crate of the public `inference-engine` repo (commit `5311920f8b54e4d14be6d14750b1e44cc360d811`, `scratch` final stage), and `tracker` is a private fleet web tool's `initiative_tracker` crate (commit `22b8dab1bbd12a3c08d83244ec31b6f85a293562`, `alpine:3.24` final stage). Both were extracted with `git archive` into `var/size-corpus/` and are not committed.
- **Builds** only in Docker, from `Dockerfile` in this folder (the fleet's recipe: `rust:1.99.1-alpine3.24`, `musl-dev`, cargo-auditable 0.7.7, `cargo auditable build --release --locked`). A host musl build fails (`aws-lc-sys` needs a musl C compiler), as it does for the fleet. Each variant changes one thing from the baseline through `CARGO_PROFILE_RELEASE_*` environment variables; `GIT_SHA=unknown`.
- **Driver** `size-cal.sh` (POSIX sh): `tools`, `build`, `measure`, `image`; run `./size-cal.sh --help`. `measure` uses host `size -A`, `readelf -lW`, `gzip -9`, `zstd -19` and `sha256sum`; `cmp -l | wc -l` counts differing bytes; `objcopy` dumps sections for the section-level diffs. `bloaty` and `cargo-bloat` run only inside the image.
- The raw outputs are in `results/` (`A/`, `B/`, `C/`, `D/`, `E/`, plus the tool version listings); every number below traces to a file there. Percentages are against each crate's own `base1` build.

## A. Determinism

Three `--no-cache` builds per crate (the whole toolchain stage re-runs each time) are byte-identical: `results/B/sizes.tsv` rows `base1`..`base3`.

| crate | builds | SHA-256 (first 16) | file bytes | differing bytes (`cmp -l`, vs base1) |
|---|---|---|---|---|
| router | base1, base2, base3 | 594b2aa35c0cda3f | 5,618,832 | 0, 0 |
| tracker | base1, base2, base3 | 921fe8e81d65a632 | 7,281,208 | 0, 0 |

The router size matches the pre-study spike's 5,618,832 B and the binary copied out of the router image built from the crate's own Dockerfile has the same hash as `base1` (the tracker image's binary too), so the driver's build is the fleet recipe's build. Builds ran under host load (up to 4 in parallel) with no effect on the bytes, so load does not matter for byte counts.

What moves bytes without moving size (`results/A/`):

| variant (vs base1) | router: file bytes | router: differing bytes | tracker: file bytes | tracker: differing bytes | sections that differ (router) |
|---|---|---|---|---|---|
| `GIT_SHA` changed | 5,618,832 | 118,101 | 7,281,208 | 660,661 | `.note.gnu.build-id`, `.rodata`, `.text`, `.rela.dyn`, `.data.rel.ro` |
| package version 0.1.0 to 0.1.1 | 5,618,832 | 2,262,964 | 7,281,208 | 2,648,156 | those, plus `.data`, `.eh_frame`, `.eh_frame_hdr`, `.got` |

Every variant has the same file bytes as the baseline and the same `.text` byte count, but a different hash. Embedded identity text differs, and so does the GNU build-id note (a hash over the content), and `.dep-v0` (the cargo-auditable dependency list, a compressed JSON of 1,961 B in the router) changes with the version: its inflated JSON has the same length with `0.1.1` in place of `0.1.0`, but the compressed bytes differ (1,961 vs 1,964 B; tracker 1,602 vs 1,604 B). The `size -A` sum moved by +3 (router) and +2 (tracker) for the version change while the file did not grow, because the section headers that follow `.dep-v0` land on an alignment boundary: equal file size is partly alignment luck. This explains the spike's observation that the running fleet image's router binary has the router's size but another hash: an older commit differs by build id (and, depending on the diff, by symbol hashes), not by size. I did not extract or run a fleet image's binary here, so that last link is inferred from these variants, not measured against it.

So with identical sources, lockfile, toolchain image and `GIT_SHA`, size and hash are exact and one build suffices. With any other change, equal size is not evidence of an equal build.

## B. Which size answers which question

For the two baseline binaries (`results/B/sizes.tsv`, `size-A-*-base1.txt`, `loads-*-base1.txt`):

| source | router | tracker | question it answers |
|---|---|---|---|
| file bytes (`stat`) | 5,618,832 | 7,281,208 | disk footprint of the artifact; layer content |
| `size -A` total | 5,633,502 | 7,278,982 | none directly: sums every section, including `.bss` (21,792 B router, NOBITS, not in the file) and `.comment`/`.dep-v0` (not loaded) |
| `.text` (`size -A`) | 4,356,021 | 4,695,144 | code size; the denominator for attribution tools |
| `PT_LOAD` `FileSiz` sum | 5,610,200 | 7,269,903 | bytes the kernel maps from the file (99.84% of the file) |
| `PT_LOAD` `MemSiz` sum | 5,631,992 | 7,277,823 | virtual mapped size before any page is touched (an upper bound for resident, not a measure of it; `methods/memory.md` covers resident memory) |
| `gzip -9` | 2,394,411 | 3,198,285 | a transfer size for gzip-served files (42.6% / 43.9% of the file) |
| `zstd -19` | 1,864,246 | 2,677,467 | a transfer size for zstd-served files (33.2% / 36.8%) |
| image layer bytes (`docker history --human=false`) | 5,623,808 + 196,608 | 7,286,784 binary layer | unpacked bytes the image adds per layer (class E) |

Notes: the router's `.eh_frame` is 258,104 B (4.6% of the file) even with `panic=abort`. The binary layer in an image is a little larger than the file (tar overhead; 5,623,808 vs 5,618,832).

## C. Settings, one change at a time

Baseline fleet profile; n=1 per setting, justified because class A shows rebuilds are byte-identical (`results/C/settings.tsv`; exact bytes in `results/B/sizes.tsv`). Percent is against `base1` of the same crate.

| change | router file | file % | router `.text` | `.text` % | tracker file | file % | tracker `.text` | `.text` % |
|---|---|---|---|---|---|---|---|---|
| baseline | 5,618,832 | | 4,356,021 | | 7,281,208 | | 4,695,144 | |
| `opt-level=s` | 3,513,488 | -37.47 | 2,548,693 | -41.49 | 5,496,248 | -24.51 | 2,923,944 | -37.72 |
| `opt-level=z` | 3,386,512 | -39.73 | 2,324,869 | -46.63 | 5,307,832 | -27.10 | 2,594,035 | -44.75 |
| `lto=thin` | 5,939,472 | +5.71 | 4,518,501 | +3.73 | 7,457,336 | +2.42 | 4,777,704 | +1.76 |
| `lto=off` | 5,890,424 | +4.83 | 4,406,085 | +1.15 | 7,326,240 | +0.62 | 4,578,344 | -2.49 |
| `codegen-units=16` | 5,844,112 | +4.01 | 4,544,821 | +4.33 | 7,580,216 | +4.11 | 4,952,616 | +5.48 |
| `panic=unwind` | 6,057,104 | +7.80 | 4,627,669 | +6.24 | 7,821,880 | +7.43 | 5,061,256 | +7.80 |
| `strip=false` | 8,634,432 | +53.67 | 4,356,021 | 0.00 | 10,563,520 | +45.08 | 4,695,144 | 0.00 |
| `strip=false` + `debug=true` (two settings) | 49,362,040 | +778.51 | 4,362,165 | +0.14 | 68,483,280 | +840.55 | 4,750,664 | +1.18 |
| target `x86_64-unknown-linux-gnu` (E1, see below) | 5,488,240 | -2.32 | 4,236,632 | -2.74 | 7,109,616 | -2.36 | 4,526,906 | -3.58 |

Reading it:
- `strip=true` is the single largest knob on the file, but `.text` does not change with it (`.text` is identical in the `strip=false` build). `strip=false` keeps `.symtab`/`.strtab` and the precompiled standard library's `.debug_*` sections (`results/D/router-nostrip/bloaty-sections.txt`).
- `.text` and the file move differently: `lto=off` shrinks the tracker's `.text` by 2.49% while its file grows 0.62%. A size claim that names only one of them can be wrong about the other.
- The `debug` row changes two settings from the baseline, because `strip=true` discards `debug=true`; it is not a pure one-flag contrast. It is the companion build for per-compile-unit attribution.
- Directions agree on both crates for every setting except the `.text` of `lto=off`. The magnitude differs (`opt-level=s`: -37.5% vs -24.5% of the file), so a setting's percent is a property of the crate, not a constant.

**E1, the glibc target (a target/linkage contrast, not a one-flag contrast).** Built in `rust:1.99.1-trixie` (rustc 1.99.1, gcc 14.2.0 Debian 14.2.0-19, glibc 2.41-12+deb13u4), default target `x86_64-unknown-linux-gnu`, the same profile and the same `cargo auditable build --release --locked`. The result is a dynamically linked PIE with `NEEDED` libgcc_s.so.1, libm.so.6 and libc.so.6 (`results/C/linkage-*.txt`), against the baseline's static-pie musl binary with no `NEEDED`. It changes the C library, the allocator, the linker's libc contribution and the C dependency's build (aws-lc), so the -2.3% is a linkage difference; it ignores the libc the final image would need to carry. Not a number to compare with the profile rows.

## D. Attribution against the file

Attribution needs an unstripped build (`strip=false`), and compile units need DWARF, so there are two builds per crate: `nostrip` (no `-g` for the crate, but the standard library's own debuginfo) and `debug` (the companion, `debug=true`). Denominators differ by tool, so each tool is reported against its own: `cargo-bloat` rebuilds with plain `cargo build` (no cargo-auditable) and reports against that build's file and `.text`; `bloaty` (the CSV runs) analysed the same rebuilt binary. `results/D/attribution.tsv` has all columns.

| build | file (driver build) | `.text` | cargo-bloat file | cargo-bloat crates sum | % of `.text` | of which `[Unknown]` | bloaty sections file total | bloaty compile units file total |
|---|---|---|---|---|---|---|---|---|
| router `nostrip` | 8,634,432 | 4,356,021 | 8,632,264 | 4,083,310 | 93.73 | 619,760 (14.22) | 8,632,264 | 8,632,264 |
| router `debug` | 49,362,040 | 4,362,165 | 49,357,904 | 4,089,712 | 93.75 | 621,382 (14.24) | 49,357,904 | 49,357,904 |
| tracker `nostrip` | 10,563,520 | 4,695,144 | 10,562,080 | 4,650,110 | 99.04 | 1,747,759 (37.22) | 10,562,080 | 10,562,080 |
| tracker `debug` | 68,483,280 | 4,750,664 | 68,490,848 | 4,705,472 | 99.04 | 1,799,484 (37.87) | 68,490,848 | 68,490,848 |

- The cargo-bloat build is not the driver's build: its file is 2,168 B smaller for router `nostrip` (its build has no `.dep-v0`, the rest is unexplained), 1,440 B smaller for tracker `nostrip`, and 7,568 B larger for tracker `debug`. Its `.text` total equals the driver build's `.text` in all four rows. I report the difference and did not investigate the tracker `debug` growth.
- `bloaty -d sections` and `-d compileunits` sum to exactly the file bytes by construction (it adds `[Unmapped]`, `[ELF Headers]` and `[section ...]` buckets), and its VM total equals the `PT_LOAD` `MemSiz` sum (router 5,631,992; tracker 7,277,823 in the `nostrip` builds), a cross-check against class B.
- `cargo-bloat` is by its own warning a guess: `[Unknown]` is 14 to 38% of `.text`, mostly C code (aws-lc, 1.3 MiB in the router) and symbols it cannot place; "crates" are not a partition of the code.
- Compile units: with `nostrip` bloaty finds 233 (router) and 293 (tracker) DWARF units (the standard library's), so 5.66% of the router's file bytes and 50.11% of the tracker's file bytes (63.26% of its VM) sit in non-DWARF buckets: a non-debug build gives a misleading compile-unit table. With the `debug` companion: 486 (router) and 357 (tracker) units, non-DWARF buckets 4.94% / 1.86% of file / VM (router) and 3.25% / 1.33% (tracker).
- Run on the baseline (stripped) binary, `bloaty -d compileunits` fails with "missing debug info" (`results/D/router-base1/bloaty-compileunits.txt`).

## E. Binary share of the image

Images are the crates' own Dockerfiles built as `bsc:router-img` and `bsc:tracker-img` (`results/E/`):

| image | binary (file) | sum of layer bytes (`docker history`) | binary share | other layers |
|---|---|---|---|---|
| router, `scratch` | 5,618,832 | 5,820,416 | 96.53% | CA bundle 196,608 |
| tracker, `alpine:3.24` | 7,281,208 | 38,363,136 | 18.97% | base 9,080,832; `apk upgrade` + git 20,959,232; web assets 1,036,288 |

The containerd image store's `.Size` (router 8,399,821; tracker 56,057,160) equals the unpacked layer bytes plus the compressed layer blobs (`docker save`: 2,594,304 and 17,711,104), so it is neither a disk number nor a download number; use layer bytes (unpacked) and the saved or pulled compressed bytes separately. gzip of the binary is 92.3% of the router's compressed image and 18.1% of the tracker's.

## What a size standard has to say

- Name the question first (disk, transfer, mapped memory, image), then the source; `size -A` is not any of them.
- State toolchain image, target, `[profile.release]` settings (`opt-level`, `lto`, `codegen-units`, `panic`, `strip`, `debug`), lockfile and the build id; every one of these moves bytes, and the profile changes the size by tens of percent.
- With identical inputs the number is exact and needs no repetition; with any changed input equal size does not prove an identical artifact, and the hash is what identifies it.
- Attribution tools report a share of a stated denominator with the unattributed residue; compile-unit data needs a debug build and is incomparable with the stripped artifact.
- Report image bytes separately from binary bytes and say whether they are unpacked or compressed.

## Limits

- Two crates (one `scratch`, one `alpine`), both built from the same profile; the settings' percentages are per-crate. The corpus is a snapshot of two commits.
- Exactness is claimed for this toolchain image, base (Alpine 3.24 / Debian trixie), Docker and BuildKit on one host. Cross-host determinism (different CPU count, Docker version, base image rebuild with newer packages) and other toolchain versions were not tested. The tools image installs Alpine packages at build time: a later Alpine point release of `musl-dev` could change the musl C library and so the bytes.
- Variant builds ran with a warm cache; only class A's determinism builds were `--no-cache`.
- `cargo-bloat` and `bloaty` totals are against their own builds; I did not make them share a binary.
- The fleet running image's binary was not extracted or compared.
- Image numbers are from one Docker (containerd image store); other stores report other `.Size` values.

## Setup (to reproduce)

- Docker 29.9.3 with buildx 0.39.0 (containerd image store), network access for base images, Alpine packages and crates.io.
- Images: `rust:1.99.1-alpine3.24` (rustc/cargo 1.99.1), `rust:1.99.1-trixie`, `alpine:3.24`, `oven/bun:1.3` (only for the tracker's own Dockerfile image build). Alpine packages in the tools image: `musl-dev` 1.2.6-r3, `binutils` 2.45.1-r1, `bloaty` 1.1-r31, `cargo-bloat` 0.12.1-r0; `cargo-auditable` 0.7.7 via `cargo install --locked`.
- Host: GNU binutils 2.44 (`size`, `readelf`, `objcopy`), gzip 1.13, zstd 1.5.7, coreutils 9.7, diffutils 3.10, GNU awk 5.2.1, POSIX sh; no Rust, Python or Node needed on the host.
- Steps: extract the two crates with `git archive` into `var/size-corpus/router` (path `router/gateway`) and `var/size-corpus/tracker` (path `initiative_tracker`); `./size-cal.sh tools`; `./size-cal.sh build router base1 --no-cache`; `./size-cal.sh build router nostrip --env CARGO_PROFILE_RELEASE_STRIP=false --attrib`; `./size-cal.sh measure router base1`; `./size-cal.sh image router`; remove the images with `docker image rm`. `notes.md` has the command log and the variant list.

## Credits

- [bloaty](https://github.com/google/bloaty) (Google), [cargo-bloat](https://github.com/RazrFalcon/cargo-bloat) (Yevhenii Reizner), [cargo-auditable](https://github.com/rust-secure-code/cargo-auditable) (Rust Secure Code WG).
- The [Rust](https://www.rust-lang.org/) toolchain and its docker images, [musl libc](https://musl.libc.org/), [Alpine Linux](https://alpinelinux.org/), GNU binutils.
- The research-repo pattern is [Simon Willison's](https://github.com/simonw/research).
