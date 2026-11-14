---
created: 2026-11-13
---

# Notes: memory-measurement calibration

Working log, appended as the investigation proceeds. Rigor level for every number below is stated where it is quoted; this file records what was tried and learned, `README.md` holds the report.

## 2026-11-13 setup

- Probe `scripts/memprobe.sh` written (POSIX sh). It starts the command in the background, samples `memory.stat` (anon, file) and the command's `/proc/<pid>/status` (VmHWM, RssAnon, State) every `--interval` seconds, reads `memory.peak` after the command exits, and emits `MEASURE` lines. Settled anon needs a boundary: `--boundary-line STR` (the command prints the line, flushed; stdout is routed through a fifo and passed through) or `--boundary-file F`. Windows are offsets from the first sample that sees the boundary and are sampled only while the command is alive.
- Image `memcal:1` built from `Dockerfile` (debian:trixie-slim pinned by digest, builder stage compiles `src/alloc.c` and `src/churn.c`).
- Quick smoke runs (indicative, single runs): a 64 MiB allocation gives anon 64.30, VmHWM 65.35, but `memory.peak` 73.6 MiB, about 9 MiB above anon plus file at any sample; with a concurrent 256 MiB file write `memory.peak` 336.8 and file high-water 256.2. A container-level peak therefore has a start-up charge on top of the process, which class (a) isolates with a 0 MiB variant.
- The driver accepts variants that emit different metric sets (class d's bare variant has no probe metrics).
- `--help`/usage errors checked by hand: non-numeric, negative, zero interval, settle without boundary, empty or duplicate settle elements, existing boundary file all exit 2.

## Pilot (R9)

Pilot data live under `results/pilot/` and are excluded from inference.

- Pilots a, b, d (6 invocations, 1 warm-up round each): spread is tiny (anon sources identical to 0.01 MiB, `memory.peak` CIs about 1 MiB wide), so the claim runs use 30 invocations (3 warm-up rounds), cheap at about 1.5 s per invocation. A 0 MiB variant (`a0`) was added to class a after the pilot to measure the container start-up charge directly.
- Pilot c (c12 and c2, 4 blocks each, no warm-up, pilot data): settled anon at 120 s is 413.7-416.8 MiB for both cpusets; 0 s, 30 s and 120 s windows differ by at most 0.1 MiB (no release after the boundary); 13 arenas in every block; no second mode. The synthetic churn program therefore does not reproduce the daemon's bimodal retention or its 30 s to 120 s fall, and its level does not move between 2 and 12 CPUs at this resolution (4 blocks per cpuset, a lead only).
- Bad-mode threshold fixed from the pilot before the claim runs (R9): `anon_settled_<S>s_mib` above 420 MiB, about 3 MiB over the pilot maximum (416.84), so a block counts as bad only if it retains more than anything the pilot saw. With a unimodal pilot the threshold is a tail rule, not a mode separator; the rate's value here is the demonstration of the metric and the resolution (20 blocks: a 0/20 rate has a Clopper-Pearson upper bound near 0.17).
- Claim runs launched in one sequential batch a, b, d, c (`results/<class>/`), config files from `gen-configs.mjs --bad-mib 420`. CPU PSI is read at the start and end of the batch (see below).
- PSI cpu 'some' read about 3 minutes after the batch started (a running): avg10=0.03 avg60=0.21 avg300=0.81.

## Claim runs (2026-11-13, 15:00-19:00 local, batch a, b, d, c)

- a, b, d: 30 invocations + 3 warm-up rounds each; c: 20 invocations + 1 warm-up round. All four exited 0. Class c needed 105 container runs of about 140 s.
- CPU PSI (some) sampled once a minute during the batch: 200 samples, avg60 mean 2.98, maximum 39.5, above 10 in 7 samples (user live).
- Class a: all sources carry a constant offset vs the known size; the 0 MiB variant isolates it (process RssAnon +0.12, VmHWM +1.4, cgroup anon +0.3, memory.peak +9.5). Slope a256-a16 recovers 240.0 MiB.
- Class b: file write adds the file size to memory.peak (+257.7 / +258.0 over class a) and to file high-water (256.0), nothing to anon beyond the 1 MiB writer buffer.
- Class c: unimodal retention (about 415 MiB), no release between 0, 30 and 120 s, CPU count effect at most 0.2%, MALLOC_ARENA_MAX=2 -7%; bad-mode 0/20 everywhere.
- Class d: probe leaves the program's VmHWM unchanged, adds about 1.4 MiB to memory.peak.
- The recorded hostname in env.json was replaced by `measurement-host` after the runs (published-file rule).
