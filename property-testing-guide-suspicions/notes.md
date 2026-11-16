---
created: 2026-11-15
---

# Property-testing guide suspicions: working notes

A working log. Each step appends a dated entry: what was tried, what was learned.

## 2026-11-15: spike, before the protocol

Rigor: indicative (one run each, host and container, no repetition). Before this folder existed the orchestrator ran every check once against the pinned targets (crucible-dev-env `26f69da8`, crucible-tui `65366f95`, research `af40b1fc`, scripts `f1b20d5c`, semsearch `17b39b5a`). Spike results, which the protocol below was written to re-derive and not to reproduce:

- `SetRoot(Some("-"))` gave `root -`, which parsed to `SetRoot(None)`.
- A non-UTF-8 path came back lossy (`/tmp/a�b`), and the `to_line` doc says paths must be UTF-8.
- `parseWidths` accepted `1.5`, `0x50` and `1e2`; `parseProtocol` accepted `0x10`, `0b11` and `0o17`.
- `hbytes` was exact for the integer forms above 2^53 but one byte low for some decimals (`1.001kB` gave 1000; 4,415 of 300,000 `w.fffU` inputs).
- `ts` rolled `02-29`, `02-30` and `04-31` over to the next month; `path_join("a", NULL)` died with SIGSEGV; two `strncache("abcdef", 3)` calls returned different pointers.
- `Codes::nearest` returns unsorted, and its only caller sorts.
- Rust check cost 21 s warm on the host, 45 s cold in the container; every other check under a second (indicative).

## 2026-11-15: protocol implementation

- Verdict vocabulary fixed before the run (`checks/verdicts.mjs`): `confirmed defect`, `confirmed, out of contract`, `refuted`, `needs owner decision`. Each verdict is a pure function of the observed facts (`checks/judge.mjs`); the checks never see the spike table.
- The Rust check is `checks/ipc.diff`, a `#[cfg(test)]` module appended to `crates/crucible-compositor/src/ipc.rs` in the clone; the driver applies it with `git apply`, runs `cargo test`, and reverts with `git checkout -- .` even when the test fails. Clones are clean after a run.
- Everything that produces a verdict runs inside the Compose image as the host user; cargo home and the target dir live under `var/ptgs-work`, so no root-owned file appears.
- The C probe includes the target's single translation unit with `main` renamed, and forks for the NULL case.
- `hbytes` enumeration: exact value is computed in integers (`(w*1000+fff)*(unit/1000)`), compared with the module's result.
- `Codes::nearest` is a reading check (the driver greps the clone's source for the sort-free body and the caller's `sort_unstable`), labelled as reading in the row.

## 2026-11-15: pinned run results

Nine rows, one per suspicion; all verdicts match the spike. The one addition is in row 5: the enumeration found 4,415 of 300,000 decimal inputs one byte low, recorded as `found_by_check` on that row. Reachability of the two C defects is from reading the callers: no caller of `path_join_` was found that passes NULL; `strncache` is reached with a prefix key at the dependency-file parser.
