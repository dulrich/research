# glibc thread-arena retention: a reproducible bad mode with a known ground truth

A fastbin-heavy burst freed on a worker thread and followed by `malloc_trim(0)` stays resident in glibc 2.41 (25 MiB burst: about 25 MiB anon after the trim, against about 1 MiB for the same burst on the main arena, with no fastbin-sized chunks, or with `mxfast=0`), so the bad mode behind M5 and M7 reproduces from a small C program in a throwaway container, and it is metastable: a single later non-mmapped malloc+free of 64 KiB or more in the same arena releases it. Driven with a known bad-mode probability, the report pipeline recovered the configured rate: 0/60, 19/60, 14/60 and 32/60 bad for p = 0, 0.25 (twice) and 0.5, every Clopper-Pearson 95% interval containing p (standard rigor), the probe's threshold reading equal to the program's own ground truth in 60/60 invocations of every variant, and settle-window rates matching the emitted release times in every unambiguous cell, so the 0 s to 12 s windows are not themselves a source of bias in this setup. A 4-worker pool with random burst sizes is not bimodal at all (settled anon 7.09-89.00 MiB over 40 invocations, indicative), so a bad-mode rate on such a workload depends on the threshold chosen (39/40, 35/40 and 15/40 above 12, 30 and 60 MiB).

## Question and background

The memory methods (`../methods/memory.md`, M5 settled values at a stated window, M7 multimodal metrics as rates) rested on one live daemon whose settled anon fell between 30 s and 120 s idle and whose bad-mode rate depended on the window (see `../live-host-measurement-confounds/`). The calibration's synthetic churn (`../memory-measurement-calibration/`, class c) stayed unimodal, so no experiment had produced the bad mode on purpose, with a ground truth that says which invocation is bad and when its memory is released. This investigation builds that: a small program that physically produces the retention, plus a harness whose per-invocation 0/1 `bad_mode` readings can be checked against what the program itself knows it did.

Three questions: does the mechanism reproduce and what controls it (mechanism class), does the rate report recover a known bad-mode probability (class R), and is a settle-window reading biased when the bad mode can be released late (class S). A fourth class (P) shows what a continuous pool workload looks like under a rate threshold. A pre-investigation spike on the native host first found the mechanism; every number below is from the container harness in this folder.

## Mechanism

Source anchors are from upstream glibc 2.41 (the image has 2.41-12+deb13u4), read from the release tarball, by file and function:

- `malloc/malloc.c`, `_int_free_chunk`: a chunk at or below the fastbin size limit (`get_max_fast()`, 0 when `mxfast=0`) is pushed on a fastbin and the function returns. It never merges with its neighbours and never reaches the trim logic. (When the tcache is full or off; the tcache path in `_int_free` returns first.)
- `malloc/malloc.c`, `_int_free_maybe_consolidate` (reached from `_int_free_merge_chunk`, the non-fastbin free path): only when the merged chunk is at least `FASTBIN_CONSOLIDATION_THRESHOLD` (65536 bytes) does it run `malloc_consolidate` if the arena has fastbin chunks, and then, for the main arena, `systrim` when the top is at least the trim threshold, otherwise (a non-main arena) `heap_trim(heap, top_pad)` unconditionally. This is why one later free of 64 KiB or more in the same arena releases everything that has consolidated into the top.
- `malloc/arena.c`, `heap_trim`: for a non-main arena, it first unmaps whole trailing sub-heaps whose only content is the top chunk, then, if the top is at least `mp_.trim_threshold`, shrinks the heap by the page-rounded excess over `top_pad`. It is reached from the free path above and not from `malloc_trim`.
- `malloc/malloc.c`, `mtrim` (what `malloc_trim` walks): for every arena in the ring, `malloc_consolidate`, then `madvise(MADV_DONTNEED)` on every free chunk in the bins that spans at least one whole page, and then `systrim` for the main arena only. A thread arena's top chunk is not in any bin and `mtrim` never calls `heap_trim` or shrinks it, so memory that consolidates into a thread arena's top stays resident, while memory below a live chunk (in bins) is released.
- `malloc/arena.c`, `HEAP_MAX_SIZE`: `2 * DEFAULT_MMAP_THRESHOLD_MAX`, and on 64-bit `DEFAULT_MMAP_THRESHOLD_MAX` is `4 * 1024 * 1024 * sizeof(long)` (32 MiB), so a thread heap is 64 MiB. A larger burst spans several sub-heaps.

Together: the fastbin frees leave the burst in fastbins; `malloc_trim` consolidates them into a single free block, which for the thread arena is the top chunk; nothing shrinks that top. The source agrees with the mechanism the spike stated. One refinement: `mtrim` does visit every arena (not only the main one), but it only releases bin chunks, never a non-main arena's top. The spike's wording "only shrinks the main arena's top" is correct for the top and incomplete for the bins.

Mechanism-class results (indicative: 6 invocations per variant plus one warm-up round, one 25 MiB payload, 70% fastbin-sized chunks of 16-115 B, `--trim`, interleaved fresh containers, the 3 s window; median of cgroup anon, MiB):

| variant | settled anon (MiB) |
| --- | --- |
| thread burst (bad mode) | 25.57 |
| thread burst, A/A copy | 25.34 |
| main arena | 0.98 |
| no fastbin-sized chunks (`--fast-pct 0`) | 1.05 |
| `mxfast=0` | 1.23 |
| a live 48 B pin at 0.1 / 0.5 / 0.9 / 0.99 of the burst | 24.37 / 14.02 / 3.62 / 1.24 |
| 16 / 48 / 100 MiB burst | 15.98 / 49.26 / 40.53 |
| no trim | 26.20 |
| trim threshold 128 KiB, with / without trim | 25.36 / 26.27 |
| late free uniform in [0, 1 s] | 1.15 |

The retained share after a pin falls as (1 - F) times the burst, as the spike found (F is the pin's position as a fraction of the burst). The 100 MiB burst keeps 40.53 MiB, not 100, because only the last sub-heap's top is retained. The 0 s and 3 s windows agree to 0.1 MiB except for the late-free variant. Probe process `RssAnon` equals the program's own `RssAnon` read (difference 0.01 MiB or less) and the cgroup anon is a constant 0.2-0.3 MiB above it. The full table is `results/mech/report.md`.

## Method

- **Program** (`src/retain.c`, built in `Dockerfile`): a burst on a worker thread or on the main arena (`--main`), size `--mib`, fastbin share `--fast-pct` (default 70), optional pin `--pin-at F` or a known bad-mode probability `--bad-p p` (one uniform draw: below p no pin is placed and the whole burst stays, otherwise a live 48 B pin at 0.99 of the burst lets the trim release it), a late free `--late-max D` (a 64 KiB or larger in-arena malloc+free after a delay uniform in [0, D] s counted from the boundary, using a volatile pointer so the compiler cannot elide it), `--trim` and `--trim-threshold`, pool mode `--pool W --requests R`, `--idle S` and `--seed`. It prints `BOUNDARY` after the free and the trim and stays alive through the longest window. Each invocation draws its seed from `/dev/urandom` and emits its ground truth as `MEASURE` lines: `bad_drawn` (1 when no pin was placed, -1 in pool mode), `release_delay_s` (the drawn delay), `release_actual_s` (the delay measured when the free returned) and its own `RssAnon`.
- **Harness** (`run.mjs`, run as `bun`): one `docker run --rm` of the image `gar:1` per invocation, pinned to CPUs 6-11,18-23, with `../scripts/memprobe.sh` mounted and run in the container with the boundary line `BOUNDARY`. The in-container probe samples cgroup `anon` and the process `RssAnon` at a 0.1 s interval and reads each settle window at the first sample at or after the first sample that sees the boundary plus S. `--bad-mib N` adds `bad_mode_<S>s` (1 if settled anon exceeds N MiB, as in the calibration's churn rule). Settle windows: 0 and 3 s (mechanism, P), 0 and 2 s (R), 0-12 s in 2 s steps (S).
- **Driver**: `../scripts/measure.mjs` (interleaved invocations, warm-up round, padded environment, A/A pair, Clopper-Pearson and Newcombe for rate metrics, per `../methods/timing.md`). Configs are generated by `gen-configs.mjs`; ground truth and self-report metrics are `level` entries, not rates, because `bad_drawn` is -1 in pool mode and the release times are seconds. `analyze.mjs` derives the truth tables (`results/<class>/truth.md`) from the same `raw.jsonl` records, warm-ups excluded.
- **Pilot and threshold** (`results/pilot/`, excluded from inference): the endpoints of `--bad-p` were checked deterministic (0 and 1 gave `bad_drawn` 0 and 1 in 12/12 at 25 MiB and in 200/200 each at 1 MiB, in fresh containers) before p was treated as known. The 12 pilot invocations per mode gave a largest good-mode value of 1.48 MiB and a smallest bad-mode value of 24.61 MiB, so the bad-mode threshold was fixed at 12 MiB, near the midpoint, before the claim classes, and never re-tuned (`--bad-mib 12`).
- **Ambiguity band**: the probe reads a window late by a boundary-detection lag plus up to one sampling interval. The lag measured in the mechanism class lies between 0.04 and 0.17 s (a release at 0.037 s read released at the 0 s window, one at 0.17 s read retained), and one pilot cell with delay 6.15 s read released at the 6 s window, so the combined error is at least 0.15 s. Class S therefore reports invocations within 0.25 s of a window edge as ambiguous instead of counting them as mismatches.

## Results

Image `gar:1`; the host is a live 12-core desktop (the owner uses it): CPU pressure ("some", `/proc/pressure/cpu`) was 0.00 on avg10, avg60 and avg300 at the start and end of each of the three claim classes, and no stretch was dropped. Claim classes ran with driver seed 20261114, one warm-up round per variant.

### Class R: rate recovery (standard, 60 invocations per variant, 25 MiB thread burst, windows 0 and 2 s)

Rate = share of invocations with settled anon above 12 MiB; truth = `bad_drawn`. `results/r/truth.md`.

| variant | configured p | k/n bad (0 s, same at 2 s) | Clopper-Pearson 95% | contains p |
| --- | --- | --- | --- | --- |
| p0 | 0 | 0/60 | [0.000, 0.060] | yes |
| p25 | 0.25 | 19/60 | [0.203, 0.450] | yes |
| p25b (A/A copy of p25) | 0.25 | 14/60 | [0.134, 0.360] | yes |
| p50 | 0.5 | 32/60 | [0.400, 0.663] | yes |

The probe's `bad_mode_0s` equals `bad_drawn` in 60/60 invocations of every variant. Newcombe 95% differences (window 0 s):

| comparison | n each | difference [95%] | excludes 0 |
| --- | --- | --- | --- |
| p25 vs p50, first 20 | 20 | -0.100 [-0.370, 0.193] | no |
| p25 vs p50, all | 60 | -0.217 [-0.375, -0.040] | yes |
| p25 vs p25b (A/A floor), first 20 | 20 | 0.250 [-0.028, 0.485] | no |
| p25 vs p25b (A/A floor), all | 60 | 0.083 [-0.076, 0.237] | no |

Reading: the known 25 percentage-point difference is resolved at 60 blocks and not at 20, and at 20 the A/A pair already differs by 0.25 as a point estimate, which is the noise the interval has to cover. This tests the reporting pipeline on a physically produced bimodality; it is not a coverage study of the Clopper-Pearson interval.

### Class S: settle-window bias (standard for rates, indicative for the timing margin; 30 invocations per variant, bad mode always present)

`late10` has a late free uniform in [0, 10 s]; `nolate` is the control. Truth per invocation: bad at window S iff `release_actual_s` > S. `results/s/truth.md`.

| window | observed bad, late10 | truth share | ambiguous (n) | mismatches outside the band | nolate bad |
| --- | --- | --- | --- | --- | --- |
| 0 s | 29/30 | 30/30 | 2 | 0 of 28 | 30/30 |
| 2 s | 23/30 | 23/30 | 1 | 0 of 29 | 30/30 |
| 4 s | 17/30 | 18/30 | 2 | 0 of 28 | 30/30 |
| 6 s | 12/30 | 12/30 | 1 | 0 of 29 | 30/30 |
| 8 s | 2/30 | 2/30 | 1 | 0 of 29 | 30/30 |
| 10 s | 0/30 | 0/30 | 0 | 0 of 30 | 30/30 |
| 12 s | 0/30 | 0/30 | 0 | 0 of 30 | 30/30 |

The control is bad at every window (Clopper-Pearson 95% lower bound 0.884 at 30/30). The two windows where observed and truth differ (0 s and 4 s) are explained by the ambiguous invocations. The in-program clock agrees with the drawn delay within 0.003 s. The late-free rate falls with the window as the release delay distribution says it should, so a window rate is a function of the window: it measures "not yet released at S", which is the M5 point, not a property of the mode. Here the probe's window read is accurate to the stated band.

### Class P: continuous spread (indicative; pool mode of 4 workers and 12 requests with trim, 40 invocations)

No per-invocation truth exists in pool mode. `results/p/truth.md`.

| window | min | Q1 | median | Q3 | max |
| --- | --- | --- | --- | --- | --- |
| 0 s | 7.09 | 44.35 | 54.43 | 63.98 | 89.00 |

(MiB settled cgroup anon; the 3 s window differs by at most 0.03 MiB at the quartiles.) Bad rate by threshold at 0 s, thresholds fixed before looking: above 12 MiB 39/40 [0.868, 0.999]; above 30 MiB 35/40 [0.732, 0.958]; above 60 MiB 15/40 [0.227, 0.542]. The driver's 12 MiB `bad_mode_0s` matches the 12 MiB count in 40/40 invocations.

## Implications

- **M5.** In this reproducer a settled reading is a clean function of the window when the release is event-driven: the window rate follows the release-time distribution, and the 0.1 s probe resolves it to about 0.25 s. This supports the rule that a settled rate states its window (the same invocations read 29/30 bad at 0 s and 2/30 at 8 s). It does not show that the daemon's 30-120 s fall has the same cause; the daemon was not re-run.
- **M7.** Supported: a rate with a Clopper-Pearson interval recovers a known p over 60 blocks per condition (all four intervals contain p), a 25 percentage-point difference is resolved at 60 and not at 20 blocks, and the A/A floor shows the noise at 20 blocks. New: a rate is only meaningful when the metric is actually bimodal and the threshold sits in the gap. In the pool workload the same rate reads 39/40, 35/40 or 15/40 depending on the threshold, because the distribution is continuous; a threshold from a pilot must come from a gap in the pilot data.
- **M6.** The retained memory in this setup is resolved by the allocator configuration: the burst's arena type (thread versus main: 25.57 versus 0.98 MiB) and `mxfast` (1.23 MiB with `mxfast=0`) each change it by a large, clearly resolved amount (indicative, 6 invocations per variant), while `M_TRIM_THRESHOLD` at 128 KiB changed nothing measurable (25.36 versus 25.57 MiB, with a trim). This supports reporting every allocator tunable with a settled number, and adds `mxfast` (and the thread-versus-main arena) to the list of settings that matter. The arena cap effect of M6 itself (`MALLOC_ARENA_MAX`) was not tested here.

## Limits

- **Time compression**: windows of 0-12 s and idle times of 2-14 s, against the daemon's 30-120 s. The release here is event-driven (a later free), not timer-driven, so compression is valid for this mechanism and says nothing about a timer or a different release cause.
- **One glibc and image**: glibc 2.41-12+deb13u4 on one pinned Debian image, one burst shape (25 MiB, 70% fastbin-sized, 16-115 B), one cpuset. Other glibc versions and the tcache's behaviour were not varied.
- **Live host**: the host was in use by its owner during the runs, per `../methods/live-host.md`; CPU pressure was recorded and was 0.00 at the class boundaries, but concurrent-build effects on memory were not measured, so no host-insensitivity is claimed. Rates over many blocks are what that procedure permits.
- **No daemon re-run**: the live daemon's two-mode behaviour was not reproduced; this shows one mechanism that produces such modes, not that it is the daemon's.
- **Pool mode has no ground truth**: its rates are descriptive only.
- Levels and the mechanism class are indicative (small n); only the rates carry the standard rigor of M7.

## Reproduce and setup

Dependencies, including the ones the host already had:
- Docker 29.9.3 (`env.json` of each class), with cgroup v2 (the in-container probe reads `memory.stat` and `memory.peak` from the container's cgroup, so a v1 host fails).
- Base image `debian:trixie-slim` pinned by digest in `Dockerfile`; in the image glibc 2.41-12+deb13u4 (`ldd (Debian GLIBC 2.41-12+deb13u4) 2.41`) and gcc `gcc (Debian 14.2.0-19) 14.2.0` in the build stage.
- bun (the host driver `measure.mjs`, `run.mjs`, `gen-configs.mjs`, `analyze.mjs`): the host had 1.4.4; the result files do not record the bun version. No bun packages are installed.
- A host CPU set for `docker run --cpuset-cpus`: the default is `6-11,18-23`, override with `CAL_PIN`.

Commands, from the repo root:

```bash
docker build -t gar:1 glibc-arena-retention
bun glibc-arena-retention/gen-configs.mjs --bad-mib 12
bun scripts/measure.mjs run --config glibc-arena-retention/configs/mech.json --out glibc-arena-retention/results/mech --host measurement-host
bun scripts/measure.mjs run --config glibc-arena-retention/configs/r.json --out glibc-arena-retention/results/r --host measurement-host
bun scripts/measure.mjs run --config glibc-arena-retention/configs/s.json --out glibc-arena-retention/results/s --host measurement-host
bun scripts/measure.mjs run --config glibc-arena-retention/configs/p.json --out glibc-arena-retention/results/p --host measurement-host
bun glibc-arena-retention/analyze.mjs
```

The generated `configs/` also include `configs/pilot/`. Wall time for the claim classes: about 18 min (R), 15 min (S), 4 min (P). One invocation by hand: `bun glibc-arena-retention/run.mjs --interval 0.1 --settle 0,3 --bad-mib 12 -- --bad-p 1 --trim`.

## Credits

- The glibc manual: [Memory Allocation Tunables](https://www.gnu.org/software/libc/manual/html_node/Memory-Allocation-Tunables.html) and [Malloc Tunable Parameters (`mallopt`)](https://www.gnu.org/software/libc/manual/html_node/Malloc-Tunable-Parameters.html).
- The glibc source, [sourceware.org git](https://sourceware.org/git/?p=glibc.git;a=tree;f=malloc;hb=refs/tags/glibc-2.41) (`malloc/malloc.c`, `malloc/arena.c`, tag glibc-2.41).
- The memory-release-strategy findings of the crucible-vault project, public repo `github.com/dulrich/crucible-vault`, path `docs/spikes/memory-release-strategy/FINDINGS.md`, whose daemon observation this builds on.
- Sibling investigations: `../memory-measurement-calibration/`, `../live-host-measurement-confounds/`.
