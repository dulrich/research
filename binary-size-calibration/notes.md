---
created: 2026-11-15
---

# Notes: binary-size calibration

Working log, appended as the investigation proceeds. `README.md` is the report; this file records commands, versions and deviations. Rigor for every byte count: exact on this toolchain and host, n=1 per setting unless stated (class A shows why that is enough here); cross-host and cross-toolchain determinism were not tested.

## 2026-11-15 setup

- Corpus, taken with `git archive <commit> <path> | tar -x -C var/size-corpus/<name>` (gitignored `var/`; the source repos were only read):
  - `router`: public repo `inference-engine`, path `router/gateway`, `HEAD` commit `5311920f8b54e4d14be6d14750b1e44cc360d811`. Final stage `scratch`. Binary `inference-router`, `--bin inference-router`.
  - `tracker`: a private fleet web tool, path `initiative_tracker` at the fleet repo's `HEAD` commit `22b8dab1bbd12a3c08d83244ec31b6f85a293562` (the last commit touching that path is `f1855be2d21d1d3a89b7e8d8cfda1b971312ee36`). Final stage `alpine:3.24`. Binary `initiative-tracker`, built with `-p initiative-tracker-server --bin initiative-tracker`. Its repo name is withheld here because it is a private repo name.
- Both crates carry `[profile.release]` `opt-level=3`, `lto=true`, `codegen-units=1`, `panic="abort"`, `strip=true`; both fleet Dockerfiles build with `cargo auditable build --release --locked` in `rust:1.99.1-alpine3.24`, which `Dockerfile` here reproduces (cargo-auditable 0.7.7, `musl-dev`).
- `Dockerfile` (stages `base`, `build`, `out`, `attrib`, `attrout`) takes the crate directory as build context, `COPY . .`, `cargo fetch --locked`, then `cargo auditable build --release --locked`. `BUILD_ENVS` carries the single-setting change as `CARGO_PROFILE_RELEASE_*` environment variables, so no Cargo.toml was modified. `GIT_SHA=unknown` is the build id (the fleet Dockerfiles forward the same variable). The binary leaves through `docker build --output`.
- Tools image `bsc:tools` (`size-cal.sh tools`): rustc/cargo 1.99.1, gcc 15.2.0 (Alpine), musl-dev 1.2.6-r3, binutils 2.45.1-r1, bloaty 1.1-r31 (Bloaty McBloatface 1.1), cargo-bloat 0.12.1-r0. Raw: `results/tools-musl.txt`. Debian stage for the glibc contrast, `rust:1.99.1-trixie` (`bsc:tools-gnu`): rustc 1.99.1, gcc 14.2.0 (Debian 14.2.0-19), glibc 2.41 (Debian GLIBC 2.41-12+deb13u4); raw `results/tools-gnu.txt`.
- Host: Docker 29.9.3 (buildx 0.39.0, containerd image store), kernel 7.2, 24 CPUs, live workstation. Host tools: GNU binutils 2.44 (`size`, `readelf`, `objcopy`), gzip 1.13, zstd 1.5.7, coreutils 9.7, diffutils 3.10, GNU awk 5.2.1. All present; no new host interpreter.
- `size-cal.sh build router base1 --no-cache --attrib` took about 2m15s; the router image matches the spike's 5,618,832 B.

## 2026-11-15 builds

- Determinism: `base1`, `base2`, `base3` per crate, each `--no-cache` (toolchain image layers, `cargo install cargo-auditable` and `cargo fetch` included). Variants (`os`, `oz`, `thin`, `lto-off`, `cgu16`, `unwind`, `nostrip`, `debug`, `gnu`) were built with the layer cache warm, up to 4 in parallel on the busy host; class A shows byte counts do not depend on that.
- Variant env: `os`/`oz` `CARGO_PROFILE_RELEASE_OPT_LEVEL=s|z`; `thin` `..._LTO=thin`; `lto-off` `..._LTO=off`; `cgu16` `..._CODEGEN_UNITS=16`; `unwind` `..._PANIC=unwind`; `nostrip` `..._STRIP=false`; `debug` `..._STRIP=false ..._DEBUG=true`. `strip=true` removes debuginfo, so `debug=true` alone would change nothing: the `debug` row is two settings changed from baseline (`strip=false` and `debug=true`) and is also the companion build for `bloaty -d compileunits`. The `nostrip` row isolates `strip=false`.
- Second-commit stand-ins (no fleet repo touched): `gitsha` builds the unchanged tree with `GIT_SHA=0123456789abcdef`; `ver` builds a scratch copy (`var/size-ctx/`) with only the package version string changed from 0.1.0 to 0.1.1 (Cargo.toml and the matching Cargo.lock entry), same `GIT_SHA`.
- `gnu`: `--flavor gnu`, Debian stage, default host target `x86_64-unknown-linux-gnu`, dynamic glibc (`NEEDED`: libgcc_s.so.1, libm.so.6, libc.so.6). Built without issue, so E1 needed no deviation.
- Attribution (`--attrib`, musl only): `bloaty -d sections|symbols|compileunits` and `cargo bloat --crates` inside the `attrib` stage. Two things learned: `cargo bloat` always runs its own `cargo build` (without cargo-auditable), so its file and `.text` totals come from a different build than the driver's binary; and the first run of `bloaty --csv` ran after that rebuild, so the `.csv` and `.json` outputs share a denominator (the cargo-bloat build), not the driver binary's. The attribution table states both denominators.
- Images (`size-cal.sh image`): the crate's own Dockerfile (from the corpus copy) built as `bsc:router-img` and `bsc:tracker-img` with `GIT_SHA=unknown`. The binary copied out of each image has the same SHA-256 as the driver's `base1` build. `docker history --human=false` gives layer bytes; the containerd store's `.Size` equals unpacked layer bytes plus compressed blob bytes (router 5,820,416 + about 2.58 MB = 8,399,821), so it is not an on-disk or download number by itself.
- Scratch images removed at the end (`docker image rm`); `var/` stays gitignored.
