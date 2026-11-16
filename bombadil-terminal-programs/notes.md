---
created: 2026-11-16
---

# Notes: Bombadil's terminal driver against terminal programs

## Spike (2026-11-16, scratch, indicative)

A first look, before any protocol, with the release binary `v0.7.10` (`bombadil-x86_64-linux`, static-pie, 17,972,264 B, sha256 `6f2664ca7d4067017b4efb26db5c29d6dcfecdc78131f96989d336f12420cc1b`; building from source would need Zig 0.16, absent on the host):

| check | result |
|---|---|
| install | the release binary runs with no toolchain |
| `bombadil terminal test --time-limit=20s --exit-on-violation -- mdview crucible-tui/README.md` (default specification, 100x40), 3 runs | runs; about 89 states/s; run 1 reported `noReplacementChars` (U+FFFD cells filling screen rows 38-39) after about 2 s; run 2 hit the 20 s limit with no violation; run 3 ended at about 6 s with exit 0 because a random `q` quit the pager |
| same against plain `less README.md`, 2 runs | no violation: run 1 hit the 20 s limit, run 2 ended at about 2 s by a random quit (exit 0) |

Lessons that shaped the protocol: the driver runs; a violation can appear within seconds; random input can quit the program early (an early clean exit is a completed run, not a full-budget observation); runs are timing-dependent and there is no seed flag; `mdview` pages through `less -R`, so a U+FFFD may be mdview's own output, `less -R` passing raw random input bytes through, or the driver's decoding, which is why control arms exist.

## Inventory

Rule: every command-line entrypoint of the two pinned repositories that presents an interactive terminal surface on a pty is a target; anything else is excluded with its reason. Pins: `crucible-tui` at `192552b767e7050a5638e98551072c8214e6d24b`, `crucible-term` at `12358e2b942eb74a54a9ae3f6a774cb7cd8e77d1`. Binary targets are the `[[bin]]` / `src/main.rs` entrypoints in `git ls-files` of each clone (`crucible-tui`: `crates/mdview/src/main.rs`, `crates/jsonedit/src/main.rs`; `crucible-term`: `crates/crucible-term/src/main.rs`, binary `cterm`; the other crates, `ofm` and `crucible-term-core`, are libraries).

| entrypoint | decision | reason |
|---|---|---|
| `mdview FILE` (default pager mode) | included | draws to the pty and pages through `less -R`; interactive |
| `mdview FILE --no-pager` / `--check` / `--licenses` / `--help` | excluded | print and exit; no interactive surface |
| `mdview --probe` / `mdview probe` | excluded | a one-shot terminal diagnostic that exits by itself; not an interactive surface |
| `jsonedit FILE` | included | interactive: launches the editor on a private copy and prompts on a parse failure |
| `jsonedit --check` / `--version` / `--help` | excluded | print and exit |
| `cterm` (client, default) | excluded | opens a Wayland window running a child; nothing is drawn to the pty the driver observes. `cterm --help` lists no pty-drawn mode |
| `cterm daemon` | excluded | per-user window daemon in the foreground; owns windows, draws nothing to its own pty |

Control arms (Decision: each target that delegates gets its delegate alone on equivalent input):

| arm | command | role |
|---|---|---|
| `mdview` | `mdview README.md` of the `crucible-tui` clone | target |
| `less-R` | `less -R RENDERED` | control for the pager mdview uses; `RENDERED` is mdview's output written once with `mdview --no-pager --color=always README.md` |
| `less` | `less RENDERED` | control with the pager's default raw-byte handling |
| `jsonedit` | `jsonedit doc.json` with `EDITOR=vi -n -u NONE`, `VISUAL` unset | target |
| `vi` | `vi -n -u NONE doc.json` | editor control, same editor on the same file content |

`vi` on this host resolves to `vim.basic`. `-n -u NONE` is no swap file and no user configuration, so concurrent lanes do not share state. Per-run files are fresh copies of one small JSON document.

## Run notes

(appended as the work proceeds)

### Setup and protocol (2026-11-16)

- `run.mjs setup`: binary verified by sha256 (copy of the spike's verified binary placed at the tool's own scratch path; the download path is in `run.mjs` and was not exercised, since the checksum of the existing copy matched), both clones at their pins (clean), `cargo build --release` for both, rendered output written once with `mdview --no-pager --color=always README.md` (288 lines), JSON document fixed.
- A 5-arm dry run (1 run x 8 s, 5 lanes, scratch output, discarded) checked the driver. It showed plain `less` exiting at once with status 1.
- Protocol run: 20 runs per arm, `--time-limit 60s`, 100x40, default specification, no `--exit-on-violation`, 4 lanes, interleaved in a seeded random order per round (seed 20261116). Started 08:28 UTC, last run began 08:44 UTC; the whole run took about 17 minutes. CPU pressure (`avg60`) read 0.00 after the run; it was not read during it.
- Observation that mattered at once: plain `less` on the rendered file asks "may be a binary file. See it anyway?" because the file holds ESC sequences, so almost every random first key quits it with status 1 (20 of 20 runs, within 2 ms). The arm is kept as run (fixed count, no rerun); see `triage.md` K1.
- Traces are about 0.5 MB per state (about 2.7 GB per 60 s run), so the driver scans each trace line by line, keeps one trace prefix per arm x property up to the first violation, and deletes the rest.
- Triage: `--reproduce` and `shrink` on the three retained prefixes (see `triage.md`). A first jsonedit reproduce attempt failed only because of a wrong relative path to the binary and was redone.
