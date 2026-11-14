---
created: 2026-11-13
---

# Notes: cpu-measurement calibration

Working log, appended as the investigation proceeds. Rigor level for every number below is stated where it is quoted; this file records what was tried and learned, `README.md` holds the report.

## 2026-11-13 setup

- Probe `scripts/cpuprobe.sh` (POSIX sh) runs the command under one `perf stat --no-big-num -e task-clock,instructions:u,cycles:u[,instructions:k,cycles:k] -o FILE` invocation. perf's default (non-CSV) output carries both the counters and the child's rusage "seconds user" / "seconds sys" lines, so one run gives every source; the `-x,` CSV mode has no user/sys lines, so the two modes cannot come from one run and default mode is parsed for everything. The cgroup `usage_usec` delta is read just before and after the perf invocation; the sibling busy fraction comes from two `/proc/stat` reads at the same points.
- Error handling (pinned before the runs): missing perf, a `<not supported>`/`<not counted>` counter, a missing or unparseable counter, user or sys line, an unreadable `cpu.stat`, a `--sibling` CPU missing from `/proc/stat` whose online file is unreadable or reads 1, and a sibling interval with no elapsed ticks all exit 1 with a stderr message and no MEASURE lines. An absent `/proc/stat` row with the online file reading 0 is a valid observation: `sibling_busy 0` plus a stderr note. A non-numeric `--sibling` (or one with a leading zero) exits 2. Checked with a fake `perf` that emits each failure form, in the image without caps (perf refuses: "No permission to enable task-clock event"), in an image without perf, and with `--sibling 99`.
- Image `cpucal:1` (debian:trixie-slim by digest, builder stage compiles `src/work.c`; runtime stage has linux-perf only, perf 6.12.117). Containers run with `--cap-add PERFMON --cap-add SYS_ADMIN` (both hosts have `perf_event_paranoid=3`).
- `src/work.c`: `work lat N` is one dependent LCG chain (4 cycles per iteration on both CPUs: a multiply of latency 3 plus an add); `work thr N` is four independent chains (multiplier-port bound).
- `run.sh` modes: `probe` (one fresh container), `later` (probe twice in one container, emit the second), `pair` (twice, emit first_*/second_*), `cpu-online`/`cpu-state` (privileged container writes/reads the online file; refuses cpu0). `--antagonist CPU` starts a same-workload `work MODE 100000000000` container pinned to CPU before the measured container and removes it on every exit path.
- The effective cpuset is printed by the container itself (`Cpus_allowed_list` of `/proc/self/status`) as `MEASURE cpuset_ncpus` and a `cpus_allowed_list` line (kept in `log.txt`).
- Laptop setup: `docker save cpucal:1 | ssh HOST docker load`; `run.sh` and the probe copied to `/var/tmp/cpucal/{cpu-measurement-calibration,scripts}` (the guard needs the folder name in the path). Remote files and the image's containers are removed at the end.
- `offline-run.sh` (class e): records the online file of cpu3 (must be 1), writes 0 through a privileged container, runs the config, and restores the recorded value on EXIT/INT/TERM/HUP with a readback line.

## Pilots (R9)

Pilot data live under `results/pilot/` (6 invocations, 1 warm-up round) for a-desktop, b, c-lat, c-thr, d-lat, d-thr and e-lat; they are excluded from inference. Desktop A/A half-widths of task-clock: 0.38% (b), 0.47% (c-lat), 0.59% (c-thr), 5% (a, whose short cells add start-up noise); laptop 0.3% (d-lat), 0.8% (d-thr). The pilot e-lat run also tested `offline-run.sh` end to end (pre-state 1, offline 0, readback 1). The claim runs use 30 invocations + 3 warm-up rounds per variant, as the memory calibration did. a-laptop and e-thr have no pilot.

## Claim runs (2026-11-13)

- Desktop classes (a-desktop, b, c-lat, c-thr) ran first, in one sequential batch, user live (load average 3-6 on 24 CPUs). All exited 0.
- A first laptop batch (a-laptop, d-lat, d-thr, e-lat, e-thr) failed: the laptop was restarted (orderly shutdown in its journal at 22:15, not initiated by this work) in the middle of a-laptop round 16, the ssh channel was lost, and the rest failed at once; the files under `/tmp` were gone after the restart. e-lat's `offline-run.sh` failed before offlining (run.sh was missing) and restored/read back cpu3 = 1. The partial results were deleted (a failed run is not a result), the remote directory moved to `/var/tmp/cpucal` (config and script defaults updated), and the whole laptop batch was rerun from the start with the same configs and seed; no cherry-picking among attempts.
- Laptop classes a-laptop, d-lat, d-thr and e-lat, e-thr: all exited 0. Class e readbacks (from `offline-run.sh`): e-lat `pre-state cpu3 online=1`, `offline-state cpu3 online=0`, `readback cpu3 online=1`; e-thr the same. A final `cat /sys/devices/system/cpu/cpu3/online` on the laptop after the batch printed `1`.
- The recorded host names in `env.json` were replaced by `12-core-desktop` / `2-core-laptop` after the runs (published-file rule); nothing else in the results was edited.
- Findings, in short: instructions are exact and linear (5 per iteration, 11 for the 4-chain mode); cgroup usage carries a fixed 10.5 ms (desktop) / 17.5 ms (laptop) over task-clock at N=0; the first run in a container shows no task-clock or cycles difference at 3e8 (about 1.2 ms less cgroup usage on later runs); unpinned runs are 2.2-2.6% faster at identical cycles (frequency); a busy sibling doubles throughput-bound CPU time and cycles (2.07x) and moves latency-bound code +0.3%; idle and offline siblings agree within 0.3% (offline has tighter cycle ranges).
- Probe error paths checked by hand (also pasted in the work report): image without perf, `--sibling 99`, `--sibling x` (exit 2), perf refusing counters without caps, fake perf output with `<not supported>`, `<not counted>`, a missing sys line, a missing counter and a non-numeric counter.
