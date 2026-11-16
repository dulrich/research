# Property-testing guide suspicions: of nine reading-only suspicions, five are confirmed defects, one is out of contract, one needs an owner decision, two are refuted

We ran every defect the fleet property-testing guide suspected from reading code but never executed, against the pinned targets: five confirmed defects (`root -` sentinel, `parseWidths`, `ts` calendar roll-over, `path_join_` NULL, `strncache` prefix key), one confirmed but out of contract (non-UTF-8 IPC paths), one that needs an owner decision (`parseProtocol` radix forms), and two refuted (`hbytes` above 2^53, `Codes::nearest` order). A tenth suspicion, `newcombeDiff` with `n = 0`, was already confirmed by the guide's pilot and is cited, not re-run. The `hbytes` check also surfaced a defect nobody suspected: 4,415 of 300,000 decimal sizes come out one byte low.

This follows up [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/), which listed these as "suspected, unconfirmed" (its README and `survey/others.md`). No property-testing library is used: each check is the direct example, or an exhaustive small-domain enumeration for `hbytes`, that decides its suspicion.

## Verdicts

Verdict vocabulary, fixed before the run: `confirmed defect`, `confirmed, out of contract` (behaviour as suspected, but the code documents it), `refuted`, `needs owner decision` (behaviour as suspected, the contract is silent). The machine-readable rows are `results/verdicts.jsonl` (id, repo, anchor, verdict, observed, contract) and the table is `results/verdicts.md`. Every row was produced inside the container below.

| # | suspicion | repo, anchor | verdict |
|---|---|---|---|
| 1 | `SetRoot(Some("-"))` reads back as clear | crucible-dev-env, `ipc.rs:207`/`:233` | confirmed defect |
| 2 | non-UTF-8 paths are lossy | crucible-dev-env, `ipc.rs:228`-`:238` | confirmed, out of contract |
| 3 | `parseWidths` accepts `1.5`, `0x50`, `1e2` | crucible-tui, `scripts/sweep-options.ts:42` | confirmed defect |
| 4 | `parseProtocol` accepts `0x10`, `0b11`, `0o17` | research, `scripts/lib/measure-run.mjs:79` | needs owner decision |
| 5 | `hbytes` loses integers above 2^53 | scripts, `DockerResidue.pm:58` | refuted (decimal inputs: confirmed defect, found by the check) |
| 6 | `ts` rolls impossible dates over | scripts, `DockerResidue.pm:106` | confirmed defect |
| 7 | `path_join_` crashes on a NULL argument | scripts, `tools/build_system/parts/string.c:266` | confirmed defect (latent) |
| 8 | `strncache` misses on a prefix key | scripts, `tools/build_system/parts/strcache.c:117` | confirmed defect |
| 9 | `Codes::nearest` returns unsorted | semsearch, `crates/semsearch/src/vector.rs:139` | refuted |
| 10 | `newcombeDiff` with `n = 0` gives NaN | research, `scripts/lib/measure-stats.mjs` | cited from the guide's pilot (`property-based-testing-fleet-guide/notes.md:115`), not re-run |

## Per suspicion

Pinned commits: crucible-dev-env `26f69da8`, crucible-tui `65366f95`, research `af40b1fc`, scripts `f1b20d5c`, semsearch `17b39b5a`. Targets are cloned and never edited.

### 1. IPC `-` sentinel (confirmed defect)

- Contract: the module doc table (`ipc.rs:22`) defines `root <path>` and `root -` as set and clear. The codec `encode_field` (crucible-persist `field.rs:8`) escapes only `%`, `:`, TAB, LF and CR, so a path named `-` has no distinct wire form.
- Check: `checks/ipc.diff`, a `#[cfg(test)]` module applied to the clone; `cargo test -p crucible-compositor --lib ptgs_`.
- Observed: `SetRoot(Some("-")).to_line()` is `root -`, and `Request::parse` returns `Ok(SetRoot(None))`.

### 2. Non-UTF-8 IPC paths (confirmed, out of contract)

- Contract: the `to_line` doc (`ipc.rs:217`): "Paths must be UTF-8 (lossy otherwise)."
- Check: same diff, `OpenFolder`, `Capture` and `SetRoot` of `/tmp/a\xFFb`.
- Observed: all three lines carry `/tmp/a` plus U+FFFD plus `b` and do not round-trip. This is the documented behaviour, so it is out of contract and not a defect.

### 3. `parseWidths` (confirmed defect)

- Contract: the doc (`sweep-options.ts:31`) describes a comma list (`80,100,160`), a range (`40-360`) or a mix; the range form accepts digits only, and widths are terminal columns. The error text says "positive numbers", which is the only wording that could be read to allow `1.5`.
- Check: `checks/js.mjs` imports the function from the clone.
- Observed: `1.5` gives `[1.5]`, `0x50` gives `[80]`, `1e2` gives `[100]`, all through `Number(...)`.

### 4. `parseProtocol` (needs owner decision)

- Contract: `measure.mjs --help` and `methods/timing.md:108`: `MEASURE <metric> <number> [unit]`. Neither text names a radix or exponent form.
- Check: `checks/js.mjs` imports the function from the research clone.
- Observed: `0x10` gives 16, `0b11` gives 3, `0o17` gives 15 (and `1e3` gives 1000). Whether that is intended is the owner's call.

### 5. `hbytes` (refuted; decimal finding by the check)

- Contract: the comment at `DockerResidue.pm:53`: a decimal human size to integer bytes.
- Check: `checks/hbytes.pl` with `perl -I<scripts clone>/util/cache-prune/perl`: the 2^53 forms, then every `w.fffU` for w 0..99, fff 000..999, U in kB, MB, GB against exact integer arithmetic (300,000 inputs).
- Observed: `9007199254740993B` gives `9007199254740993` and `9007199254740993kB` gives `9007199254740993000`, so the suspicion is refuted for these forms. The enumeration found 4,415 of 300,000 inputs one byte low, no other mismatch; the first is `1.001kB`, which gives 1000 instead of 1001. This decimal finding is a confirmed defect, labelled as found by the check (`found_by_check` on row 5).

### 6. `ts` on impossible dates (confirmed defect)

- Contract: the comment at `DockerResidue.pm:104`-`:105`: "A shape that matches but is no calendar time is an error, as in jq."
- Check: `checks/ts.pl` calls `ts` on `2023-02-28`, `02-29`, `02-30`, `03-01`, `03-02`, `04-30`, `04-31` and `05-01` at `T00:00:00Z`.
- Observed: `02-29` equals `03-01`, `02-30` equals `03-02`, `04-31` equals `05-01`; none raises an error.

### 7. `path_join_` with NULL (confirmed defect, latent)

- Contract: the first loop guards `if(s)` before `strlen(s)`; the second loop calls `strlen(s)` first. No doc forbids NULL.
- Check: `checks/probe.c` includes the target's `_build.c` with `main` renamed, and calls `path_join("a", NULL)` in a forked child.
- Observed: the child is killed by signal 11 (SIGSEGV).
- Reachability, from reading: no caller found that can pass NULL. Callers: `_build.c:196` (`source_dir` is a literal, `sources[i]` is non-NULL by the loop condition), `parts/init.c:58` and `:61` (a literal and a calloc'd string), `parts/gcc.c:94`-`:95` (`dir_name` and `base_name` return `strcache` results), `parts/fs.c:260` and `:276` (a directory entry name). The defect is real but not reachable from the callers read.

### 8. `strncache` (confirmed defect)

- Contract: `strncache(in, n)` interns the first n bytes of `in`; `string_cache_find_bucket` (`strcache.c:49`) compares the full `in` with `strcmp` against the stored n-byte copy (`:58`), so a longer key never matches.
- Check: the same probe: two `strncache("abcdef", 3)` calls, then `strncache("abc", 3)`.
- Observed: the two calls return different pointers and `fill` grows from 1 to 2; the exact key `"abc"` hits.
- Reachability, from reading: reachable. `parts/gcc.c:35` calls `strncache(s, dlen)` where `s` points into the remaining dependency text and `dlen` is one path's length, so for any path that is not last in the text the key is longer than `n` and never hits the cache. Each such path adds an entry, and equal paths are not shared.

### 9. `Codes::nearest` (refuted, from reading)

- Contract: the doc at `vector.rs:138`: "The `pool` nearest rowids by Hamming distance (ties: lower rowid first)", which names the selected rowids and not an output order.
- Check: a reading check, labelled as such. The driver reads the clone's source: the body ends with `select_nth_unstable` then `truncate` and no sort, and the only caller (`search.rs:280`-`:281`, through `Vectors::nearest` at `vector.rs:249`) calls `candidates.sort_unstable()` before use.
- Observed: unsorted as suspected, but nothing depends on the order, so it is not a defect.

## Setup

Everything that produces a verdict runs in a Docker Compose image, as the host user. The image is built from `Dockerfile`: `oven/bun:1.4.4` (the bun binary is copied out) on `rust:1.99.1-trixie`, plus the system packages of the compositor's own CI list: `pkg-config`, `libwayland-dev`, `libwayland-bin`, `wayland-protocols`, `libinput-dev`, `libgbm-dev`, `libdrm-dev`, `libseat-dev`, `libxkbcommon-dev`, `libudev-dev`, `libpixman-1-dev`, `libegl1-mesa-dev`, `libgles2-mesa-dev`, `libdisplay-info-dev`, `libffi-dev` and `patch`. Toolchain versions inside the image: rustc 1.99.1, gcc 14.2.0, perl 5.40.1, bun 1.4.4, GNU patch 2.8, git 2.47.3.

Host needs: bun (the driver; 1.4.4 used), git, and Docker with Compose. Network is needed only at image build (base images and apt) and at the first cargo fetch of the compositor's crates; the checks themselves use no network.

## Reproduce

From the repository root:

```bash
bun property-testing-guide-suspicions/run.mjs setup
docker compose -f property-testing-guide-suspicions/compose.yaml build
bun property-testing-guide-suspicions/run.mjs run
```

`setup` runs on the host: it clones each target from a sibling directory of this repository (override with `--src DIR`) into the gitignored scratch directory named in `bun run.mjs --help` at the pinned commit, and creates a work directory beside it (cargo home, target dir, probe binary). `run` starts the container as the host user (the driver exports `PTGS_UID` and `PTGS_GID`; run compose by hand with `PTGS_UID=$(id -u) PTGS_GID=$(id -g) docker compose -f property-testing-guide-suspicions/compose.yaml run --rm checks`), which applies the Rust diff to its clone and reverts it, so every clone is clean afterwards. `run --out FILE` writes the rows to FILE and leaves `results/` untouched. The first cargo build in the container takes about 45 s (indicative, one run, cold); every other check takes under a second.

Layout: `run.mjs` (driver), `checks/` (`ipc.diff`, `js.mjs`, `hbytes.pl`, `ts.pl`, `probe.c`, `all.mjs` the check runner, `judge.mjs` the pure verdict functions, `verdicts.mjs` the vocabulary and table), `results/`, `notes.md` (the working log, including the pre-protocol spike).

## Credits

Builds on the suspicions listed by [property-based-testing-fleet-guide](../property-based-testing-fleet-guide/) and its pilot. Targets are the fleet's own crucible-dev-env, crucible-tui, research, scripts and semsearch repositories, read at the pinned commits above. Docker base images: [oven/bun](https://hub.docker.com/r/oven/bun) and [rust](https://hub.docker.com/_/rust).
