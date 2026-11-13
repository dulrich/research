---
created: 2026-11-11
---

# Notes: live-host-measurement-confounds

Working log, appended as the work proceeds (what was tried, what was learned).

## 2026-11-11 Harness, controller, pilot, frozen schedule

- Image: the round-5 toolchain image was copied from the laptop (`docker save | docker load`), tagged `lhmc-r5`, id `sha256:e78e6c8e143e...f1759a`, equal to the id recorded in `sqlite-parse-number-rust-tuning/results/round5/toolchains.txt`. The local tag of the same repository on the workstation is a different image and is not used.
- `cv` reference build: crucible-vault commit `38f52df8` ("pre" build of the memory-release spike: it showed the allocator bad mode, settled anon above ~75 MiB, in 2 of 6 clean scenario-A cycles). Built with `cargo build --release -p cv --bin cv` from a detached worktree against the sibling `semsearch` checkout into the folder's gitignored `var/`. Any later build (for example `54ed2c24`, direct reply serialisation) is not used here and would be labelled "current build".
- Scratch vault: a private copy of the author's vault (symlinks and `.git` removed, config neutralised: schedules empty, pipelines disabled, no maildir, provider base URLs pointing at a closed local port) plus a read-only `search.db` backup, both under `var/scratch/` and never committed. The vault is bind-mounted read-only into every block; only the daemon's state, cache and a fresh copy of `search.db` are writable.
- Container placement: every measured process runs in a throwaway or long-lived container created with `--cgroup-parent lhmc.slice` (Docker uses the systemd cgroup driver, so containers would otherwise live under `system.slice`, which I2 fences to CCD0). `lhmc.slice` is a top-level slice that the controller starts and gives `AllowedCPUs` of CCD1 at I2/I3 only; at I0/I1 it carries no restriction. Using it at every level keeps the cgroup placement identical across isolation levels.
- Controller `ctl`: `apply <I> <L> [--perf]` / `restore` / `readback [--expect ...]` / `abort` / `dropcache`; root steps run in a short-lived privileged container that `nsenter`s into the host namespaces. I2 uses `systemctl set-property --runtime ... AllowedCPUs=0-5,12-17` on `user.slice`, `system.slice` and `init.scope` (all three accepted; the fallback to a cgroup v2 isolated partition was not needed) and `AllowedCPUs=6-11,18-23` on `lhmc.slice`. I3 adds EPP `performance` on CCD1 and boost off. The pre-state (AllowedCPUs, per-CPU EPP, boost, `perf_event_paranoid`) is recorded at the first apply and restored from that record. The cell runner restores from an EXIT/INT/TERM trap and reads back after every cell. The guard (MemAvailable < 4 GB or memory `full` avg10 > 5, or an abort flag) stops antagonists, restores at once and marks the cell invalid. Cache eviction (`dropcache`) is an operation, refused unless `LHMC_AFK=1`, and is never claimed as restored.
- Effective-cpuset evidence (I2 pilot cell): with I2 applied the driver shell reports `Cpus_allowed_list` 0-5,12-17; `user.slice`, `system.slice`, `init.scope` show `cpuset.cpus.effective` 0-5,12-17; a probe container created with `--cgroup-parent lhmc.slice --cpuset-cpus 8` (K1, K4) reports `Cpus_allowed_list` 8 and `cpuset.cpus.effective` 8, and the 6-11 containers (K2, K3, K3s) report 6-11, so the placements match the I2 definition and the SMT siblings (CCD1 cores 18-23) carry no measured work. `cell-env.json` records these per cell, plus governor, EPP, current frequency and boost of the measured CPU (the driver's `env.json` reads CPU 0 only).
- Pilot (excluded from inference; 2 invocations + 1 warm-up round per variant; raw output under the gitignored `var/pilot/`): per-class wall of a pilot class run, I0 / I2 cell: K1 (30 variants, 90 driver invocations) 42 s / 42 s (0.47 s per invocation, about a third of round 5's 1.3 s with its ssh channel); K2 (6 blocks) 431 s (71.8 s per block, BLOAD 40 s + drain + 20 s idle); K3 (6 blocks) 246 s / 247 s (41 s per block); K3s (6 runs) 105 s / 104 s (17.5 s each); K4 warm 3 s; K4 cold-local 11 s / 9 s. I1: K1 47 s, K4 warm 2 s; I3: K1 43 s with the read-back (EPP `performance` on CCD1, boost 0, `perf_event_paranoid` 2) correct. Every cell ended with a restore and `READBACK OK (restored)`.
- A first K2 block failed the driver protocol because `cv jobs stats` prints p95 as `5.3s`; the block now converts to ms. The first K3 attempts showed `search` errors until the bench image got `ca-certificates` (the daemon builds its HTTP client from the system roots), so the container now has them.
- Bad mode in the pilot: with the shortened scenario A (3 passes, 30 s idle) settled `RssAnon` was 68-72 MiB in the normal blocks and 78-98 MiB in 6 of 12 blocks (I0 and I2), so the bad mode (> 75 MiB) can appear. Caveat: with a 30 s idle window (the reference runs used 120 s) a high settled value may also be a not-yet-released state, so the analysis must report it as "settled at 30 s idle" and not equate it with the reference's 120 s figure. Another `cv` daemon was running on the workstation from a different task during the pilot (I0 cell); it was not controlled for.
- K3s (12 threads, 5 s churn, 12 s idle): 13 heaps (arena count does not reach the 8 x cores cap with 12 threads), peak about 418 MiB, settled about 415 MiB at I0 and I2; run-to-run spread is below 1 MiB, so K3s is a low-noise reference and the arena cap itself is not exercised on this host (cap 192 on 24 CPUs).
- Not run today: antagonist smoke (L1-L4; the user was present; deferred to the first minutes of the first overnight window), `drop_caches` and the cold K4 path (`k4-cold`; the whole-cache variant is smoked in the first overnight window, `k4-cold-local` drops only the files' own pages and was smoked), the `Llive` day cells.
- Schedule (`schedule.json`, from `gen-schedule.mjs` with the pilot cost model): the full-count design needs about 10.1 h of AFK benchmark in three windows (3.2 h, 3.2 h, 3.7 h) plus about 1.8 h of day cells, against the planned ~5.5 h over two nights. K2 (72 s per block, 22 blocks per cell, about 26 min) and K3 (41 s per block, about 15 min) dominate. Trims already applied (cells, never classes): `k2` is dropped from the L4 cells and from all I3 loaded cells, `k3` runs only in L0 and L3 cells, the L0 reference cells that bracket each window carry only the cheap classes, loaded cells run once. Further trimming to two windows would remove K2 or K3 from every loaded cell and is not done: the 10 invocations per variant per cell floor is kept, so a third window is the fallback the plan named.

## 2026-11-11 Schedule amendment

- Why: the 30 s idle window of K3 mixes not-yet-released allocator states with the real bad mode (a one-block check at 120 s idle gave settled 87.1 MiB, bad mode 1), and the historical metric is defined at 120 s. The first schedule also put each isolation level in its own night, so the comparison between isolation levels (I3 vs I0, I2 vs I0) was confounded with the night.
- Changes: new class `k3-120` (scenario A, 10 invocations per variant, A/A pair, warm-up 1, same placement as `k3`, metric names identical, class name distinguishes it; `configs/k3-120.json`, accepted by `cell` and `runk.sh`). It is added next to `k3` (so every loaded cell keeps a matching 30 s quiet cell) in exactly three cells: I0 L0 full, I2 L0 full and I2 L3. A `k3-120` block measured 131 s wall (30 s was 41 s) and printed all MEASURE lines (view_p95_ms, daemon_cpu_s, anon_settled_mib, cpuset_n, daemon_errors, anon_peak_mib, bad_mode). Every night window's start and end reference blocks now also carry a K1-only quiet cell (`cross_level: true`) for each of I0, I2, I3 not otherwise in that window, so the controls' own effect on K1 can be estimated within a night. The three windows keep their cells (I0 | I2 | I3 and I1); of the splits tried, that one was the most even.
- Estimated wall (cost model in `gen-schedule.mjs`): windows 11507 s, 11507 s, 13195 s (3.2 h, 3.2 h, 3.7 h; 36209 s, 10.1 h) before; 15317 s, 18203 s, 14119 s (4.3 h, 5.1 h, 3.9 h; 47639 s, 13.2 h) after. The day cells are unchanged (6530 s).

## 2026-11-11 Day cells: Llive on the workstation, quiet baseline on the laptop

- Frozen inputs: `results/live/frozen-inputs.sha256` lists the sha256 of `schedule.json` and every `configs/*.json` taken before the first cell; each equalled `git show HEAD:<file> | sha256sum`. The data was produced from the committed harness and configs unchanged.
- Workstation day cells (run in schedule order, no synthetic load, no cache drop, the user working normally): `I0-Llive-day` 13:34-14:27 (wall 3175 s, estimate 3265 s) and `I2-Llive-day` 14:27-15:20 (wall 3178 s, estimate 3265 s). Both ended `status=ok` with `READBACK OK (restored)`; no `INVALID`, no re-run. Per-class walls (s) I0 / I2: k1 178 / 181, k2 1583 / 1579, k3 905 / 909, k3s 453 / 453, k4-warm 12 / 11, k4-cold-local 39 / 39. `container_probe_error` entries in the I0 K1 `env.json` are the unpinned container having no cpuset to read, as designed.
- Llive PSI trace (0.5 s sampler, `sampler.tsv` per cell; avg10 `some` percentages; n = samples): I0 cpu median 0.00 / max 0.54, memory max 0.00, io median 0.10 / max 22.83 (n 6327); CCD0 utilisation median 6.4 % / max 94.6 %, CCD1 median 0.7 % / max 94.3 %, MemAvailable minimum 35.6 GiB. I2 cpu median 1.06 / max 77.59, memory max 1.23, io median 0.11 / max 50.67 (n 6320); CCD0 median 6.3 % / max 100 %, CCD1 median 1.6 % / max 50.4 %, MemAvailable minimum 30.6 GiB. The I0 cell was close to idle (CPU pressure median 0 and mean 0.01), the I2 cell had a busier user session (cpu pressure mean 11.8); the user's activity is observational and differs between the two cells.
- Collected per class (workstation, per cell): K1 390 driver invocations (30 variants), K2 and K3 22 daemon blocks each (2 variants, 1 warm-up + 10), K3s 26 runs, K4 warm and K4 cold-local 26 runs each; no failed invocations and no missing metrics in any class. K3 here settles at 30 s idle (reported as "settled at 30 s idle"). `k3-120` and the whole-cache `k4-cold` are not part of the day cells.
- Laptop (quiet baseline): measured with the persistent ssh channel and `--host`; configs under `results/laptop/configs/`, run details in `results/laptop/README-run.txt`. The scratch copy (frozen scripts, `cv` binary, `k3s` binary, the scratch vault with `search.db`) was shipped to one scratch directory on the laptop, and the `lhmc-bench` image loaded with `docker save | docker load`. The harness's invocation guard requires the scripts to live under a directory named like this folder, so the copy kept that directory name inside the scratch directory (no script was edited). One untimed K3 block (pinned to CPUs 1-2, tuning not yet applied) printed all MEASURE lines before tuning. Quiet counts: K3 22 invocations (wall 1124 s), K2 22 (2001 s), K3-120 22 (3100 s), K3s 26 (467 s); 0 failed or missing-metric invocations. K1 not run. Descriptive only: K2 and K3 record view p95, daemon CPU, settled and peak anon, bad mode and cpuset size (the daemon saw the 2 pinned CPUs); K3s records its heap count and settled and peak RSS.
- Overlap: laptop K3, K2 and K3-120 ran concurrently with the workstation day cells (K3 13:37-13:56 and K2 13:56-14:29 during `I0-Llive-day`/start of `I2-Llive-day`, K3-120 14:29-15:21 during `I2-Llive-day`); K3s ran after both cells. The laptop driver is an ssh client on the workstation; its load was not separated from the user's.
- Laptop tuning (`results/laptop/tuning-readbacks.txt`): before: governors 4x `schedutil`, `no_turbo=0`, online 0-3, `perf_event_paranoid=3`, `unattended-upgrades`/`smartmontools`/`cron`/`iwd` `active`, `ssh`/`systemd-networkd`/`systemd-resolved`/`docker` `active`, containers `command-center` and `inference-engine-router`. The default route and the ssh source address were the wired interface. After apply: 3x `performance` (CPU 3 offline, its governor unreadable), `no_turbo=1`, online 0-2, `perf_event_paranoid=2`, the four services `inactive`, the others `active`, the two containers still running. After restore (EXIT trap, at the end of the K3s run): governors 4x `schedutil`, `no_turbo=0`, online 0-3, `perf_event_paranoid=3`, the four services `active`.
- Deletion verified: the laptop scratch directory (including the vault copy) was removed and `ls` reports it absent; the `lhmc-bench` image was removed from the laptop; its two containers were never touched. Raw per-block `requests` and daemon logs stay under the gitignored `var/`; `env.json` hostname fields hold `{host}`.

## 2026-11-12 Night 1: antagonist smoke and the `night1` window

- Frozen inputs: `results/night1/frozen-inputs.sha256` lists the sha256 of `schedule.json` and every `configs/*.json`, taken before the first cell; each equalled `git show HEAD:<file> | sha256sum`.
- Antagonist smoke (`results/night1/smoke.txt`; each load applied at I2 for 45 s while the 0.5 s sampler ran, then `ctl restore` and `ctl readback --expect restored`): the L1, L2, L3 and L4 containers were created with cpuset 0-5,12-17 and the process and cgroup both report 0-5,12-17; CCD1 utilisation stayed at or below 1 %. L1 CCD0 utilisation mean 99.9 %; L2 90.7 % (PSI cpu some max 23.3); L3 MemAvailable 54.0 -> 42.6 GB with memory PSI 0 and CCD0 about 40 %; L4 io PSI some mean 61 / max 85 with CCD0 about 2 %. Every restore ended `READBACK OK (restored)`. `ctl dropcache` with `LHMC_AFK=1` returned 0 (the k4-cold path was then exercised in six night cells). The guard trip path is untested: `ctl` has no documented knob for its thresholds (MemAvailable < 4 GB, memory full avg10 > 5) and is frozen.
- Cells (schedule order, `cell run ... --afk`; wall vs estimate in s; all `status=ok`, none `INVALID`, none re-run, none deferred; every one ended `READBACK OK (restored)`; the window started 01:17 and ended 05:21, so nothing crossed 07:00):

  | cell | block | wall | est |
  |---|---|---|---|
  | I0-L0-ref-start | ref-start | 699 | 790 |
  | I2-L0-ref-start | ref-start (k1 only) | 181 | 231 |
  | I3-L0-ref-start | ref-start (k1 only) | 203 | 231 |
  | I0-L4-rep1 | body | 311 | 331 |
  | I0-L3-rep1 | body | 1612 | 1696 |
  | I0-L1-rep1 | body | 2236 | 2308 |
  | I0-L2-rep1 | body | 2254 | 2308 |
  | I0-L0-full | body | 6058 | 6170 |
  | I0-L0-ref-end | ref-end | 690 | 790 |
  | I2-L0-ref-end | ref-end (k1 only) | 181 | 231 |
  | I3-L0-ref-end | ref-end (k1 only) | 202 | 231 |

  Total 14,627 s against 15,317 s estimated. Per-class walls are in each cell's `walls.tsv`; `results/night1/driver.log` has the run log (start/end clock times).
- Host trace per cell (0.5 s sampler; avg10 `some` PSI percentages; median / max): I0-L0-full cpu 0.00 / 8.02, io 0.06 / 24.27, MemAvailable min 50.3 GB. I0-L0 ref-start / ref-end cpu max 0.06 / 0.00, io max 25.9 / 27.1. I0-L1 CCD0 util median 100 %, cpu PSI max 1.29. I0-L2 CCD0 median 75.6 %, cpu PSI median 9.45 / max 13.14. I0-L3 CCD0 median 34.2 %, memory PSI some/full max 0.00, io max 37.4, MemAvailable min 39.0 GB (about 12 GB held by the load). I0-L4 io PSI median 45.1 / max 60.9, memory PSI some/full max 0.18, MemAvailable min 51.3 GB. I2 refs: cpu PSI median 2.5 / max 2.95; I3 refs 2.1 / 2.56 (the measured CPU's CCD1 sits at about 8 % in these k1 cells, as the driver runs there). Memory `full` never exceeded 0.18 anywhere.
- Guard events: none (no `GUARD TRIP` in the controller or guard logs); the memory-pressure cell stayed far from the 4 GB threshold.
- Data hygiene: absolute paths and the host name in generated outputs were rewritten to repo-relative paths and `{host}`; raw block logs stay in the gitignored `var/`. Largest committed night-1 file is below 2 MB.
- Not covered here: nights 2 and 3, analysis.

## 2026-11-12 Night 2: the `night2` window

- Frozen inputs: `results/night2/frozen-inputs.sha256` lists the sha256 of `schedule.json` and every `configs/*.json`, taken before the first cell; each of the 10 equalled `git show HEAD:<file> | sha256sum`.
- Night-1 carry-over: night 1 had no invalid or deferred cell, so nothing was carried over and nothing was re-run (no `-r2` cells).
- Cells (schedule order, `cell run ... --afk`; wall vs estimate in s; all `status=ok`, none `INVALID`, none re-run, none deferred; every one ended `READBACK OK (restored)`; the window ran 05:24 to 10:20, so nothing came near the 11:00 AFK end). I2 is the isolated level (measured CPUs 6-11,18-23 on CCD1, everything else on CCD0), so the I2 refs are the within-night reference for the I2 body cells; the I0 and I3 k1 refs are the cross-level references.

  | cell | block | wall | est |
  |---|---|---|---|
  | I2-L0-ref-start | ref-start | 692 | 790 |
  | I0-L0-ref-start | ref-start (k1 only) | 180 | 231 |
  | I3-L0-ref-start | ref-start (k1 only) | 201 | 231 |
  | I2-L2-rep1 | body | 2432 | 2308 |
  | I2-L0-full | body | 6053 | 6170 |
  | I2-L3-rep1 | body | 4475 | 4582 |
  | I2-L1-rep1 | body | 2302 | 2308 |
  | I2-L4-rep1 | body | 319 | 331 |
  | I2-L0-ref-end | ref-end | 698 | 790 |
  | I0-L0-ref-end | ref-end (k1 only) | 180 | 231 |
  | I3-L0-ref-end | ref-end (k1 only) | 201 | 231 |

  Total 17,733 s against 18,203 s estimated (only I2-L2-rep1 ran longer than its estimate, by 124 s). Per-class walls are in each cell's `walls.tsv`; `results/night2/driver.log` has the run log with start/end clock times. The k4-cold path (`ctl dropcache` under `--afk`) ran in the five cells that include it (I2 ref-start, I2-L0-full, I2-L3-rep1, I2-L4-rep1, I2 ref-end).
- Host trace per cell (0.5 s sampler; avg10 PSI percentages; `some` unless stated; median / max): I2-L0 ref-start cpu 18.33 / 45.16, ref-end 18.10 / 45.38, io max 43.4 / 47.0, memory `full` max 0.30 / 0.00; I0 refs cpu 0.00 / 0.16 and 0.00 / 0.02, io max 35.8 / 30.5; I3 refs cpu 1.99 / 2.31 and 2.00 / 2.36, io max 7.1 / 0.5; I2-L0-full cpu 0.00 / 42.12, io max 42.0, MemAvailable min 50.6 GB; I2-L1 cpu 3.06 / 25.63, CCD0 util median 100 %; I2-L2 cpu 15.58 / 33.65, CCD0 util median 89 %, memory `full` max 2.12 (highest of the night); I2-L3 cpu 0.00 / 25.00, io max 29.6, MemAvailable min 39.2 GB (about 12 GB held by the load), CCD0 util median 33.9 %; I2-L4 io max 65.7, cpu max 12.61. MemAvailable never fell below 39.2 GB and memory `full` never exceeded 2.12 against the guard's 5.
- Guard events: none (no `GUARD TRIP` or `INVALID` in any cell); the guard-trip path remains untested.
- Data hygiene: absolute paths and the host name in generated outputs were rewritten to repo-relative paths and `{host}`; raw block logs stay in the gitignored `var/`. Largest committed night-2 file is below 2 MB.
- Not covered here: night 3, analysis.

## 2026-11-13 Night 3: the `night3` window

- Kernel fact: the workstation rebooted at 2026-11-13 02:00 (boot time 02:00:36) into kernel `7.2.12+deb13-amd64`; `uname -r` at the window start, the `kernel` field of the first cell's `env.json` (`I3-L0-ref-start/k1/env.json`) and the end-of-window `uname -r` all read `7.2.12+deb13-amd64`. Nights 1 and 2 ran 7.2.11. No reboot occurred during the window.
- Frozen inputs: `results/night3/frozen-inputs.sha256` lists the sha256 of `schedule.json` and every `configs/*.json`, taken before the first cell; each of the 10 equalled `git show HEAD:<file> | sha256sum`.
- Carry-over: nights 1 and 2 had no invalid or deferred cell, so nothing was carried over (no `-r2` cells).
- Cells (schedule order, `cell run ... --afk`; wall vs estimate in s; all `status=ok`, none `INVALID`, none re-run, none deferred; every one ended `READBACK OK (restored)`). The window ran 04:06 to 07:50. The I0 and I2 refs are k1-only cross-level references.

  | cell | block | wall | est |
  |---|---|---|---|
  | I3-L0-ref-start | ref-start | 723 | 790 |
  | I1-L0-ref-start | ref-start | 698 | 790 |
  | I0-L0-ref-start | ref-start (k1 only) | 178 | 231 |
  | I2-L0-ref-start | ref-start (k1 only) | 179 | 231 |
  | I1-L0-full | body | 3171 | 3284 |
  | I3-L1-rep1 | body | 723 | 720 |
  | I3-L2-rep1 | body | 835 | 720 |
  | I3-L0-full | body | 3218 | 3284 |
  | I3-L4-rep1 | body | 325 | 331 |
  | I3-L3-rep1 | body | 1630 | 1696 |
  | I3-L0-ref-end | ref-end | 713 | 790 |
  | I1-L0-ref-end | ref-end | 689 | 790 |
  | I0-L0-ref-end | ref-end (k1 only) | 177 | 231 |
  | I2-L0-ref-end | ref-end (k1 only) | 180 | 231 |

  Total 13,639 s against 14,119 s estimated (I3-L1-rep1 ran 3 s and I3-L2-rep1 115 s longer than estimated; the rest shorter). Per-class walls are in each cell's `walls.tsv`; `results/night3/driver.log` has the run log with start/end clock times. The k4-cold path (`ctl dropcache` under `--afk`) ran in every cell that includes it.
- Host trace per cell (0.5 s sampler; avg10 PSI percentages; `some` unless stated; cpu median / max, then other maxima): I3 ref-start cpu 17.10 / 44.70, ref-end 17.33 / 45.33; I1 ref-start 16.68 / 43.25, ref-end 17.45 / 43.54 (io max 43.1 / 37.9); I0 refs 0.00 / 0.03 and 0.00 / 0.04; I2 refs 2.66 / 2.93 and 2.70 / 2.99; I1-L0-full 0.00 / 42.81, io max 43.1; I3-L0-full 0.06 / 44.30, io max 39.9; I3-L1 10.00 / 20.82, CCD0 util median 100 %; I3-L2 23.23 / 40.81, CCD0 util median 92.1 %, memory `full` max 1.00; I3-L3 0.15 / 26.28, io max 44.9, MemAvailable min 39.9 GB (about 12 GB held by the load), CCD0 util median 34.1 %; I3-L4 0.97 / 1.18, io max 67.0. Memory `full` never exceeded 1.00 against the guard's 5; MemAvailable never fell below 39.9 GB.
- Guard events: none (no `GUARD TRIP` or `INVALID` in any cell); the guard-trip path remains untested.
- Data hygiene: absolute paths and the host name in generated outputs were rewritten to repo-relative paths and `{host}`; raw block logs stay in the gitignored `var/`. No night-3 file exceeds 2 MB (results/night3 totals 4.9 MB).
- Not covered here: analysis.
