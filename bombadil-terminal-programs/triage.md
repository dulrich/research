# Triage of violation kinds

Specification: the default one (properties `exitSuccess`, `noReplacementChars`). The full 100-run protocol (see `README.md`) produced one violated property, `exitSuccess`: any run whose program exits with a positive exit code and no signal. `noReplacementChars` was violated in 0 of 100 runs. `exitSuccess` violations fall into three kinds, one per arm that showed any. Per-run evidence is in `results/runs.jsonl` (`first_violation_s`, `program_exit_code`); the full 60 s traces are about 2.7 GB each and are not kept, so each kind was triaged from a trace prefix cut at the first violating state (every action up to and including the violation; replay is by recorded actions, so a prefix is a valid trace).

How each attempt was run: `bombadil terminal test --reproduce <prefix> -- <same command>` and `bombadil terminal shrink --trace <prefix> --time-limit 60s -- <same command>`, on a fresh copy of the input file, with the same environment as the protocol run (`EDITOR=vi -n -u NONE`, `VISUAL` unset).

## K1. `less RENDERED`: exit 1 within two states (20 of 20 runs)

- **Trace reading.** State 0 (before any input): screen row 0 reads `"<path>" may be a binary file.  See it anyway?` with the cursor after it. The next random key (`΋` in the retained run; any key other than `y`) answers the prompt and `less` exits with status 1 at state 1, 1.9 ms after the first state. All 20 runs ended this way, in 1.5-2.0 ms.
- **Source of the bytes.** The prompt is `less`'s own output. `RENDERED` is `mdview --no-pager --color=always` output, which contains ESC sequences, and plain `less` (no `-R`) treats a file with control bytes as binary and asks first. `less -R` on the same file does not ask (arm `less-R`: 0 of 20 `exitSuccess` violations, program exit code 0 in all 11 early exits).
- **`--reproduce`:** reproduced (1 of 1): `Exited as process terminated with exit code 1`, violation of `exitSuccess`.
- **`shrink`:** "Reproduced 3/3 calibration runs"; shrunk the one action to 0 actions ("Actions: 1 -> 0"): the violation needs no input beyond the first action.
- **Verdict: delegate (pager), and a control-arm artefact.** Neither `mdview` nor Bombadil is implicated; the arm is not equivalent to what `mdview` runs (`mdview` pages with `less -R`). The arm is degenerate: it measures `less`'s binary-file prompt, not exploration. It is reported, not rerun (fixed run count). A plain-text rendering would be the equivalent control for plain `less`; that arm was not run.

## K2. `vi -n -u NONE doc.json` (editor control): exit 1 after Ex-mode input (2 of 20 runs)

- **Trace reading** (retained run, 485 states, violation at 3.15 s): the screen rows are Vim Ex-mode output (`:` prompts followed by `E492: Not an editor command: ...` and `E501: At end-of-file`), reached by a random `Q`. The last actions are `x`, a tab, one more character and `\r`; at that state the exit status is `{"signal":null,"code":1}`.
- **Source of the bytes.** All of it is Vim's own output and exit status. No fleet program is in this arm.
- **`--reproduce`:** reproduced (1 of 1): "Exited after reproduction finished", violation of `exitSuccess`.
- **`shrink`:** failed at calibration: "the violation did not reproduce in any of the 3 calibration run(s)". The calibration runs share one working directory and one input file, which the earlier replays may have modified (not investigated further), so the failure is not evidence about shrinking in general.
- **Verdict: delegate (editor).** Cause (Ex-mode exit with a positive status) read from the trace; the second violating run (run 11, 17.4 s) was not retained, so its cause is undetermined beyond exit status 1.

## K3. `jsonedit doc.json`: exit 1 after the editor exits 1 (1 of 20 runs)

- **Trace reading** (retained run, 1550 states, violation at 10.23 s): the same Ex-mode screens as K2 (the configured editor is Vim, so `EDITOR` took effect). At the final state the screen is a single line: `jsonedit: editor exited with exit status: 1; buffer kept at <temporary path>`, and the exit status is `{"signal":null,"code":1}`. The last action is `\r`.
- **Source of the bytes.** The Ex-mode screens and the editor's exit status come from Vim (same pattern as K2). The one-line message and the process exit come from `jsonedit`, which reports the editor's failure and exits non-zero (its documented failure path, with the buffer kept). That `jsonedit` follows its editor's failure is the behaviour, not a defect found here.
- **`--reproduce`:** reproduced (1 of 1): "Exited after reproduction finished", violation of `exitSuccess`.
- **`shrink`:** ran to the 60 s limit and stopped: "1549 -> 1549 actions", reproduced 3/3 in calibration; no smaller trace was found in 9 runs in the time given.
- **Verdict: delegate (editor).** `jsonedit` forwarded the editor's non-zero exit status with a clear message. Default `exitSuccess` cannot distinguish a program's deliberate error exit from a crash.

## No kind to triage

`noReplacementChars` (U+FFFD on screen): 0 of 20 in every arm, including `mdview` and `less -R`. The U+FFFD violation seen once in the three-run spike (`mdview`, about 2 s) was not seen in the 20 `mdview` runs; the cause of the spike observation is unresolved (the spike trace is not committed). No fleet-program defect was confirmed.
