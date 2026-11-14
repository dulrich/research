---
created: 2026-11-14
---

# Notes: glibc thread-arena retention

Working log, appended as the investigation proceeds. Every number below is **indicative** (small n, single machine, live host) unless a later entry says otherwise; `README.md` will hold the report.

## 2026-11-14 pre-investigation spike

Pre-investigation spike (native host, single runs, indicative; glibc 2.41):

- A worker thread allocates a ~25 MiB burst that is 70% fastbin-sized (requests of 16-115 B), frees it in allocation order, and `malloc_trim(0)` is called from the main thread. 26.0 MiB stays resident after the trim, deterministically (5/5 seeds, fifo/lifo/random free order, tcache on or off). `malloc_info` shows one free block, the thread arena's top chunk. `malloc_trim` only shrinks the main arena's top, and fastbin frees never reach `heap_trim`.
- Controls release it: a burst with no fastbin-sized chunks (0.2 MiB), `GLIBC_TUNABLES=glibc.malloc.mxfast=0` (0.2), the same burst on the main thread (26.0 to 0.8 after trim; it stays 26.0 without trim).
- One live 48 B chunk at fraction F of the burst leaves (1-F) x burst after trim: F 0.1/0.5/0.9/0.99 gave 23.4/13.0/2.7/0.4 MiB. Free memory below the highest live chunk sits in bins, which `malloc_trim` madvises.
- Metastable: one later >= 64 KiB non-mmapped malloc+free in the same arena runs `heap_trim` and releases the whole top (26.0 to 0.2).
- A 100 MiB thread burst keeps 39.6 MiB: thread heaps are at most 64 MiB, so only the last sub-heap's top is retained.
- A 4-worker pool with random burst sizes gave a broad continuous spread (7-102 MiB over 30 seeds), not two modes.
- Trap: GCC elides a `malloc`+`free` pair unless the pointer is `volatile` (the late free uses a volatile pointer).

## 2026-11-14 setup

- `src/retain.c` merges the spike's burst and pool programs. Flags: `--main`, `--mib`, `--fast-pct` (default 70), `--pin-at F`, `--bad-p p`, `--trim`, `--trim-threshold BYTES`, `--late-max D`, `--pool W --requests R [--pool-q Q]`, `--idle S`, `--seed N`; bad arguments exit 2, `--help` exits 0.
- Pin semantics: `--bad-p p` is the **bad-mode probability**. One uniform draw `u` in [0,1) decides: `u < p` means no pin (bad mode, burst retained), else a live 48 B pin at fraction 0.99 (good mode). So p=0 never draws bad and p=1 always does. `bad_drawn` is 1 iff no pin was placed (also for no pin option), 0 under a pin, and -1 in pool mode.
- Thread mode keeps the burst's thread alive through the idle period (the spike joined it); the late free runs on that thread. The boundary is printed by the main thread after the free and the optional trim, and the late-free delay is drawn uniformly in [0, D] and counted from the monotonic time taken just before `BOUNDARY` is printed. `release_delay_s` is that drawn delay when a late free applies to a bad-mode burst, else -1; `release_actual_s` is the delay measured when the free returned. With a late free the retention is released by `heap_trim`; the arena stays attached.
- Image `gar:1` (Dockerfile): debian:trixie-slim pinned by the digest `memory-measurement-calibration/Dockerfile` uses, `retain.c` compiled with gcc in a builder stage. Recorded in the image: gcc `gcc (Debian 14.2.0-19) 14.2.0`, glibc `ldd (Debian GLIBC 2.41-12+deb13u4) 2.41`. The glibc version is 2.41, as in the spike.
- `run.mjs` runs one `docker run --rm --cpuset-cpus $CAL_PIN` (default 6-11,18-23) container with `scripts/memprobe.sh` bind-mounted, `--boundary-line BOUNDARY`, and prints all `MEASURE` lines; `--bad-mib N` adds `bad_mode_<S>s` 0/1 lines (the calibration's probe-churn rule). `--tunables` passes `GLIBC_TUNABLES`.
- `gen-configs.mjs` writes `configs/mech.json` and `configs/pilot/{p,settle}.json`. Ground-truth and self-report metrics (`bad_drawn`, `release_delay_s`, `release_actual_s`, `self_rssanon_boundary_mib`, `self_rssanon_mib`) are `level` entries, not rates: `bad_drawn` is -1 in pool mode and the release times are seconds (-1 = none), so a 0/1-only rate entry would fail or mislead. The WP-2 analysis reads them from `raw.jsonl` instead.
- Smoke (single runs through `run.mjs`): thread burst 24.83 MiB settled anon after trim; main arena 0.96; `--fast-pct 0` 1.05; `mxfast=0` 1.12; a late free (delay 0.116 s) released to 1.14 by the 0 s window. This reproduces the spike.
- No fixed seed is used in claim-style runs: each invocation draws from `/dev/urandom` (the seed is on stderr).

## 2026-11-14 mechanism class (batch 1)

Command: `bun scripts/measure.mjs run --config glibc-arena-retention/configs/mech.json --out glibc-arena-retention/results/mech --host measurement-host` (18 variants, 6 invocations + 1 warm-up round, interleaved, config from `bun glibc-arena-retention/gen-configs.mjs`). Rigor: indicative. Container: 25 MiB payload thread burst, 70% fastbin-sized, `--trim`, cpuset 6-11,18-23, probe interval 0.1 s, windows 0 s and 3 s, idle 5 s; one fresh container per invocation. CPU PSI `some` (from `/proc/pressure/cpu`): start avg10=0.00 avg60=0.00 avg300=0.00; end avg10=0.13 avg60=0.10 avg300=0.03. Exit 0.

Median of 6 per variant at the 3 s window (MiB): cgroup anon (probe) / process RssAnon (probe) / the program's own `self_rssanon_mib`.

| variant | anon 3 s | RssAnon 3 s | self RssAnon |
| --- | --- | --- | --- |
| thread (bad mode, baseline) | 25.57 | 25.28 | 25.28 |
| thread-copy (A/A) | 25.34 | 25.07 | 25.07 |
| main arena | 0.98 | 0.79 | 0.79 |
| fast-pct 0 | 1.05 | 0.84 | 0.84 |
| fast-pct 70 | 25.53 | 25.23 | 25.23 |
| fast-pct 100 | 31.21 | 31.02 | 31.02 |
| mxfast=0 | 1.23 | 0.94 | 0.94 |
| pin 0.1 | 24.37 | 24.11 | 24.11 |
| pin 0.5 | 14.02 | 13.77 | 13.77 |
| pin 0.9 | 3.62 | 3.41 | 3.41 |
| pin 0.99 | 1.24 | 1.05 | 1.05 |
| 16 MiB | 15.98 | 15.69 | 15.69 |
| 48 MiB | 49.26 | 48.96 | 48.96 |
| 100 MiB | 40.53 | 40.33 | 40.33 |
| no trim | 26.20 | 26.00 | 26.00 |
| trim threshold 128 KiB, trim | 25.36 | 25.16 | 25.16 |
| trim threshold 128 KiB, no trim | 26.27 | 25.99 | 25.99 |
| late free, delay uniform in [0, 1 s] | 1.15 | 0.93 | 0.93 |

Learned:
- The mechanism reproduces in the container: a thread burst is retained after trim, and the main arena, a burst with no fastbin-sized chunks, `mxfast=0` and a late free release it. The A/A pair is within the noise floor (ratio 1.01).
- The 0 s and 3 s windows agree to 0.1 MiB for every variant but the late-free one (the late-free delays are uniform in [0, 1 s]); in every variant the probe's RssAnon equals the program's own `self_rssanon_mib` (differences 0.01 MiB or less in the table), and the cgroup anon is a constant 0.2-0.3 MiB higher (container-level: the probe and the program's own anon).
- Pin position: the retained share falls as (1-F) x burst, as in the spike (24.1/13.8/3.4/1.05 for F 0.1/0.5/0.9/0.99). The fast-pct 100 variant is larger because 25 MiB of payload at 16-115 B carries per-chunk overhead (more chunks). The 100 MiB burst keeps 40.3 MiB, as in the spike (39.6), against 48.96 for 48 MiB: the thread-heap bound shows between 48 and 100 MiB.
- Trim: without a trim the top plus bins stay (26.0 MiB); `M_TRIM_THRESHOLD` 128 KiB changes nothing measurable here, with or without a trim (25.16 vs 25.23 with, 25.99 vs 26.00 without).
- Late free: all six non-warm-up delays were 0.04-0.90 s. The `release_delay_s` and `release_actual_s` agree to 0.003 s. The window-0 sample of the invocation with delay 0.037 s read released memory, and of those with delay 0.17 s and more read retained memory: the probe's boundary detection lag is therefore between 0.04 and 0.17 s at interval 0.1 s.
- The per-variant metric table and A/A floor are in `results/mech/report.md`; per-invocation rows are in `results/mech/raw.jsonl`.

## 2026-11-14 pilot for the claim runs (R9)

Pilot data live under `results/pilot/` and are excluded from inference. The burst settings of the claim runs are the mechanism baseline: 25 MiB thread burst, 70% fastbin, `--trim`, cpuset 6-11,18-23.

**Endpoint check of `--bad-p`.** Two checks:
1. Pilot `p` (12 invocations + 1 warm-up round per variant, `results/pilot/p/`): `--bad-p 0` gave `bad_drawn` 0 in 12/12 and settled anon 1.22-1.38 MiB at 0 s and 1.22-1.48 MiB at 3 s; `--bad-p 1` gave `bad_drawn` 1 in 12/12 and settled anon 24.61-25.62 at 0 s and 24.61-25.72 at 3 s.
2. 200 fresh-container invocations per endpoint with a 1 MiB burst (`docker run --rm gar:1 retain --mib 1 --bad-p P --idle 0`, urandom seeds): p=0 gave `bad_drawn 0` 200/200, p=1 gave `bad_drawn 1` 200/200. Both endpoints are deterministic (p=0 always released, p=1 always retained), so p is the known bad-mode probability.

**Threshold.** The largest good-mode value is 1.48 MiB and the smallest bad-mode value 24.61 MiB (cgroup anon, 0 s and 3 s windows, 12 per mode). The bad-mode threshold is **12 MiB**: near the midpoint of the gap, more than 10 MiB from each mode, so no good or bad invocation in the pilot is within a factor of 8 of it. `anon_settled_<S>s_mib` above 12 is a bad mode (`--bad-mib 12`, `bun glibc-arena-retention/gen-configs.mjs --bad-mib 12`).

**Interval and timing uncertainty (audit E3).** The probe interval is **0.1 s** (`--interval 0.1`). The probe reads a window at the first sample at or after the first sample that sees the boundary, so a window read can be late by a boundary-detection lag plus up to one interval. Measured in the mechanism class, the lag is between 0.04 and 0.17 s (delay-0.037 s read released at window 0, delay-0.17 s read retained); the pilot below has one invocation in 84 where the 6 s window (delay 6.15 s) read released, which puts the combined detection and sampling error at 0.15 s or more. The claim-run comparison of a window's rate against the emitted-delay truth must therefore allow about **0.25 s** of slack: invocations whose delay lies within 0.25 s of a window edge are ambiguous and are reported as such, not counted as mismatches.

**Settle pilot** (`results/pilot/settle/`, 12 invocations + 1 warm-up round per variant, windows 0,2,4,6,8,10,12 s, late free uniform in [0, 10 s] vs none, bad mode always present, threshold 12 MiB, idle 14 s): without a late free every one of 12 invocations is bad at all seven windows (84/84). With a late free, 83 of 84 (invocation, window) cells agree with the truth `delay > window`; the one mismatch is delay 6.15 s at window 6 (inside the 0.25 s margin). `release_actual_s` is within 0.003 s of `release_delay_s` in all 12 (the in-program clock is not the error source). The settle setup works as designed.

CPU PSI `some`: pilot p start avg10=0.01 avg60=0.06 avg300=0.02, end avg10=0.00 avg60=0.00 avg300=0.00; pilot settle start avg10=0.00 avg60=0.00 avg300=0.00, end avg10=0.00 avg60=0.00 avg300=0.00.

## 2026-11-14 deviations

- The thread stays alive through the idle period (the spike joined it); retention is the same either way in the mechanism runs.
- `--bad-p` good mode places the pin at 0.99 of the burst (retains about 1 MiB of a 25 MiB burst), not at the very end, as in the spike's sweep.
- Recorded hostnames in each `env.json` were replaced by `measurement-host` after the runs.
- The late-free target for the settle pilot is applied only in a bad-mode burst (`release_delay_s` is -1 when a pin is placed).
