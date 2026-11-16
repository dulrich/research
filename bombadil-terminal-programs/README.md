# Bombadil's terminal driver against the fleet's terminal programs

Does Bombadil's experimental terminal driver run on terminal programs, and does the default specification find anything? (a) It runs: `bombadil terminal test` drove `mdview`, `jsonedit`, `less` and `vi` for 100 runs of up to 60 s each at 100x40, about 150 states/s, with no driver failure; `cterm` cannot be driven (it opens a window, not a pty surface). (b) It found nothing attributable to a fleet program: the default properties are `exitSuccess` and `noReplacementChars`; `noReplacementChars` was never violated (0 of 20 in every arm, including a U+FFFD seen once in a 3-run spike), and the 23 `exitSuccess` violations were all non-zero exit statuses of a delegate (plain `less` declining to show a file with control bytes, Vim leaving Ex mode with status 1, and `jsonedit` forwarding that Vim exit with its own message), none from `mdview` (0 of 20).

Bombadil is Antithesis's property-based tester for web and terminal UIs; this is an exploration of its terminal driver (release `v0.7.10`, "experimental"), run as the first test the repository's `property-based-testing-fleet-guide/` recommended: the default-specification one-liner against each program. Per-run data is in `results/runs.jsonl`, the summary in `results/summary.md`, the per-kind reading in `triage.md`, and the working log in `notes.md`.

## Targets and arms

Pins: `crucible-tui` at `192552b767e7050a5638e98551072c8214e6d24b`, `crucible-term` at `12358e2b942eb74a54a9ae3f6a774cb7cd8e77d1` (both public). Every binary entrypoint of the two repositories was classified (full table in `notes.md`):

- **Included:** `mdview FILE` (pages through `less -R`), `jsonedit FILE` (runs `$VISUAL`, then `$EDITOR`, then `vi`).
- **Excluded:** `mdview --no-pager`, `--check`, `--licenses`, `--probe` (print or probe and exit); `jsonedit --check` (prints and exits); `cterm` and `cterm daemon` (a Wayland window and a per-user window daemon; nothing is drawn to the pty the driver observes, and `cterm --help` lists no pty-drawn mode).

| arm | command | role |
|---|---|---|
| `mdview` | `mdview README.md`, the `README.md` of the `crucible-tui` clone | target |
| `less-R` | `less -R RENDERED` | control for the pager `mdview` uses; `RENDERED` is `mdview --no-pager --color=always README.md` written once |
| `less` | `less RENDERED` | control with plain `less` (see the threat below: not equivalent) |
| `jsonedit` | `jsonedit doc.json`, a 5-line valid JSON file copied fresh per run | target |
| `vi` | `vi -n -u NONE doc.json` | editor control |

`jsonedit` ran with `VISUAL` unset and `EDITOR=vi -n -u NONE` (the effective editor command; `vi` resolves to Vim 9.1, no swap file, no user configuration), and the editor control ran the same command on the same file content.

## Method

Per arm 20 runs, `--time-limit 60s`, 100x40, default specification, without `--exit-on-violation`, so each property's first violation per run is recorded. Four Bombadil processes ran at once; arms were interleaved in a seeded random order per round (seed 20261116). The run count was fixed beforehand and not rerun. Each row records the arm, run, round, seed, start, requested limit, actual duration (first to last state), wall time, states, throughput, exit reason, program exit code, Bombadil's exit status and each property's first-violation time. `run.mjs` is the driver (`setup`, `run`, `summary`); `bun test run.test.mjs` covers its pure functions.

## Results

Runs with a violation, k of 20, with the Clopper-Pearson 95% interval. Rates are descriptive per arm: no arm-versus-arm rate claim is made. Timings are incidental and indicative (not the full `timing` protocol).

| arm | `exitSuccess` | `noReplacementChars` | exit reasons | median duration | median states/s |
|---|---|---|---|---|---|
| `mdview` | 0/20 (0-17%) | 0/20 (0-17%) | time limit 11, program exit 9 (all status 0) | 59.0 s | 148 |
| `less-R` | 0/20 (0-17%) | 0/20 (0-17%) | time limit 9, program exit 11 (all status 0) | 7.5 s | 132 |
| `less` | 20/20 (83-100%) | 0/20 (0-17%) | program exit 20 (all status 1, within 2 ms) | 0.002 s | n/a (2 states) |
| `jsonedit` | 1/20 (0-25%) | 0/20 (0-17%) | time limit 19, program exit 1 (status 1) | 59.0 s | 151 |
| `vi` | 2/20 (1-32%) | 0/20 (0-17%) | time limit 18, program exit 2 (status 1) | 59.0 s | 151 |

Early exits are completed runs: random keys quit the programs (`q` in `less`/`mdview`'s pager), so 9 of 20 `mdview` runs and 11 of 20 `less-R` runs ended before the time limit with status 0. Durations of 59.0 s against a 60 s limit are the first-to-last-state span; wall time per run is in the rows.

## Triage verdicts

Details, `--reproduce` and `shrink` outcomes and trace readings are in `triage.md`.

| kind | arm | verdict |
|---|---|---|
| K1 `exitSuccess`: `less` exits 1 after answering its own "may be a binary file" prompt | `less` (20/20) | delegate (pager); a control-arm artefact, not equivalent to `mdview`'s `less -R` |
| K2 `exitSuccess`: Vim exits 1 after Ex-mode input | `vi` (2/20) | delegate (editor) |
| K3 `exitSuccess`: `jsonedit` forwards its editor's exit status 1 with a message | `jsonedit` (1/20) | delegate (editor); `jsonedit` behaves as designed |

`--reproduce` reproduced all three retained traces (1 of 1 each). `shrink`: K1 reduced to 0 actions, K3 ran to its 60 s limit without reduction, K2 failed at calibration (0 of 3; the calibration runs share an input file that earlier replays may have modified). No violation was attributed to a fleet program, and none came from Bombadil itself. The `exitSuccess` property treats every non-zero exit as a violation, so deliberate error exits are indistinguishable from crashes under the default specification.

## Validity threats

- **Default specification only.** Two properties (`exitSuccess`, `noReplacementChars`) say little about what a program should do; a custom specification was not written and is outside the pre-registered question.
- **Timing dependence.** The driver samples when output goes quiet for 5 ms by default; there is no seed option, and reproduction is best-effort by recorded trace. Throughput and durations depend on host load.
- **Early quits.** Random input quits programs (and Ex mode in Vim), so many runs spend a fraction of the budget; the `less` arm spent about 2 ms. State counts differ by arm, so k/20 per arm is not a per-state rate and arms are not compared.
- **Control-arm equivalence.** Plain `less RENDERED` is not equivalent to `mdview`'s pager invocation: the file holds ESC sequences, so it triggers `less`'s binary-file prompt and the arm degenerates (K1). `less -R` is the equivalent control. A plain-text rendering for the `less` arm was not run (fixed arm list, no rerun).
- **Host not quiet.** The host was an ordinary working machine, load not controlled; arms were interleaved so load affects all arms alike. CPU pressure (`avg60`) read 0.00 after the run and was not sampled during it.
- **Spike did not replicate.** The spike (3 `mdview` runs, 20 s, `--exit-on-violation`) saw one U+FFFD violation at about 2 s; 20 protocol runs of `mdview` saw none, and the cause of the spike observation is unresolved.
- **Retained evidence.** The 60 s traces are about 2.7 GB each; only a prefix up to the first violation of each arm and property was kept (three prefixes), so a second `vi` violation (run 11) is known by exit status only.
- **One host, one pin, one Bombadil release.**

## Setup and dependencies

All commands from the repository root. Network is used only by `setup`, for the one binary download.

- **Bombadil:** release `v0.7.10`, `bombadil-x86_64-linux` (static-pie), 17,972,264 bytes, sha256 `6f2664ca7d4067017b4efb26db5c29d6dcfecdc78131f96989d336f12420cc1b`, from `https://github.com/antithesishq/bombadil/releases/download/v0.7.10/bombadil-x86_64-linux`. It runs with no toolchain (building from source would need Zig 0.16, which the host lacks). `setup` verifies the checksum and refuses a mismatch; the binary lives in the git-ignored scratch directory `var/btp`.
- **Targets:** `git`, a Rust toolchain (rustc 1.99.1, cargo 1.99.1, Rust 2024 edition) and the two repositories' own build requirements; both are built with `cargo build --release` in clones under `var/btp/src` (clones, binaries and traces are never committed).
- **Runtime:** `bun` 1.4.4 for `run.mjs` (no npm dependencies; imports two helpers from this repository's `scripts/lib`), `less` 668, `vi` is Vim 9.1 (`vim.basic`), a Linux host with a pty, `head`.
- **Run:** `bun bombadil-terminal-programs/run.mjs setup`, then `bun bombadil-terminal-programs/run.mjs run` (about 17 minutes at 4 lanes), then `bun bombadil-terminal-programs/run.mjs summary`. `run --out FILE --runs N --limit SECONDS --lanes N --arms a,b` for other budgets. Disk: about 11 GB of transient trace data with 4 lanes.

## Credits

Bombadil is by Antithesis: [github.com/antithesishq/bombadil](https://github.com/antithesishq/bombadil). The first-test recommendation comes from this repository's `property-based-testing-fleet-guide/`. Targets: [`crucible-tui`](https://github.com/dulrich/crucible-tui) and [`crucible-term`](https://github.com/dulrich/crucible-term).
