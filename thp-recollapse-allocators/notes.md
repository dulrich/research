---
created: 2026-11-16
---

# Notes: THP re-collapse across allocators

Working log, appended as the investigation proceeds. Every number below is **indicative** (pilot, natural-arm diagnostic or spike: one host, small n, live host, no claim-run protocol) unless an entry says otherwise. `README.md` will hold the report.

## 2026-11-16 pre-investigation spikes (indicative, one block per cell)

Debian 13 image, glibc 2.41, jemalloc 5.3.0, mimalloc 3.0.1, musl 1.2.5; host THP `enabled=always`, `defrag=madvise`, khugepaged `max_ptes_none=511`, `pages_to_scan=4096`, `scan_sleep_millisecs=10000`. Workload: a worker thread allocates 64 MiB of 64 B objects, frees all but one per 128 KiB (512 survivors) and calls the allocator's release (`malloc_trim(0)`, jemalloc `arena.<all>.purge`, `mi_collect(true)`, none for musl); anon and `AnonHugePages` (AHP) from `/proc/self/smaps_rollup`. THP modes per process: `on` (host default), `off` (`PR_SET_THP_DISABLE`), `advised` (`PR_SET_THP_DISABLE` with `PR_THP_DISABLE_EXCEPT_ADVISED`).

Spike 1, natural khugepaged (control set in `main`, after allocator start-up):

| cell (THP on) | anon at release | anon at 40 min (AHP) | first growth |
|---|---|---|---|
| glibc | 2.1 MiB | 80.1 (80.0) | 160 s |
| jemalloc | 19.2 | 78.4 (78.0) | 210 s |
| mimalloc | 32.8 | 66.3 (66.0) | 260 s |
| musl | 33.6 | 33.6 (0.0) | none |
| glibc, `off` | 2.1 | 2.1 (0.0) | none |

A 180 s run of the same glibc cell an hour earlier did not grow at all; the host completed 3 full scans in about 99 min of uptime and all three collapsing cells grew in the pass that completed about 330 s after the start. With a late `off` control jemalloc already held 4 MiB AHP before the burst, so the control must precede allocator start-up. The stride-0 control crashed in spike 1 (division by `every = 0`).

Spike 2, forced `MADV_COLLAPSE` over every 2 MiB-aligned span of writable anonymous mappings after the release (control set by self-re-exec; values KiB ÷ 1024):

| allocator | `on`: release → after collapse | `off`: release → after collapse | `advised`: after collapse |
|---|---|---|---|
| glibc | 2.1 → 80.1 MiB | 2.1 → 2.1 | 80.1 |
| jemalloc | 19.2 → 78.4 | 5.4 → 5.4 | 78.4 |
| mimalloc | 32.5 → 70.3 | 32.4 → 32.4 | 68.2 |
| musl | 33.6 → 33.6 (no eligible span) | 33.6 → 33.6 | 33.6 |
| glibc, stride 0 (no survivors) | 0.1 → 6.1 | — | — |

An earlier terminal-only run agreed except mimalloc (`on` 72.3, `advised` 70.3 MiB). `MADV_COLLAPSE` is itself advice, so it is not faithful for `advised`, and it ignores `max_ptes_none`.

## Harness and driver (WP-1)

- `src/thp.c`: one program, four builds (`-DA_GLIBC`, `-DA_JEMALLOC`, `-DA_MIMALLOC`, `-DA_MUSL`), `Dockerfile` builds all four plus `linux-perf` (for `scripts/cpuprobe.sh`) on the base pinned by digest; package versions are recorded in `/versions.txt` in the image (glibc 2.41-12+deb13u4, jemalloc 5.3.0-3, mimalloc 3.0.1+ds-2.1, musl 1.2.5-3.1, perf 6.12.117).
- THP control: `--thp off|advised` sets `PR_SET_THP_DISABLE` (advised adds `PR_THP_DISABLE_EXCEPT_ADVISED`, `(1<<1)`, defined locally because Debian 13's headers lack it) and re-executes `/proc/self/exe`; the setting is inherited across `execve`, so it precedes allocator start-up. The ENV line echoes `prctl(PR_GET_THP_DISABLE)` and `/proc/self/status` `THP_enabled` as read after allocator start-up.
- Shapes: strides 0, 32, 128, 1024 KiB of 64 B objects (one survivor per stride of cumulative allocation, at stride/2 plus k times stride; stride 0 = none, guarded), 64 MiB per thread on worker thread(s); `--shape mixed` draws sizes 16 B to 4 KiB (powers of two, fixed xorshift seed) and uses the same survivor rule by cumulative bytes.
- Modes: `forced` (release, per-mapping dump `MAP phase=rel`, optional `--collapse` with `SPAN` lines and `MAP phase=post`, a `BOUNDARY` line for `scripts/memprobe.sh`, `--idle` seconds, final dump), `natural` (sample every 10 s until the host's `khugepaged/full_scans` advanced by two past its release value; `--stop-on-growth-mib` ends it at the first increment if anon or AHP grew by at least that much; `INC1` and `NATURAL` lines carry both readings), `cpu` (`--reps` bursts of alloc, free, release per thread; for `scripts/cpuprobe.sh`).
- Per-mapping dump: writable, non-file mappings only; mappings with Rss under 512 KiB and no AHP are summarised on one `MAPS_OTHER` line (count, Rss, largest size) so musl's hundreds of 64 KiB mappings stay compact.
- Collapse coverage (deferred audit item, cycle 2 #5): each `SPAN` line carries the call's return and errno **and** the containing mapping's AHP before and after the call, read from `/proc/self/smaps`. Coverage is reported from those AHP numbers, never from return codes. Example, one jemalloc `on` run: three of five calls returned -1/EINVAL yet two of those mappings gained 58 and 8 MiB of AHP (the third, an 8 MiB mapping with 12 KiB resident, gained none); one call returned 0 with AHP unchanged because the span was already huge.
- Driver `run.mjs`: `one` (one fresh container, `--memory 1g`, rows appended to `<out>/<name>.jsonl`, default `results/`, `--out DIR` writes elsewhere, MEASURE lines to stdout), `natural-wave`, `pilot-forced`, `pilot-cpu`, `summarize`. Forced arm runs under `memprobe.sh` (`--boundary-line BOUNDARY`, settle windows 0 and 10 s in the pilot); cpu arm under `cpuprobe.sh --sibling`. Each row carries allocator and version, tunables, THP mode, shape, threads, requested and effective cpuset (`Cpus_allowed_list` read inside the container), host THP settings, uptime, `full_scans`, provenance (`pilot`, `natural`, `claim`, `smoke`).

### Native controls

- jemalloc: `MALLOC_CONF=thp:never` (src/jemalloc.c `malloc_conf_init`, option `thp`; src/pages.c `pages_set_thp_state` then `madvise(MADV_NOHUGEPAGE)` on extents). Found, tested.
- glibc: `GLIBC_TUNABLES=glibc.malloc.hugetlb=1` (malloc/arena.c `ptmalloc_init` reads the tunable; malloc/malloc.c `madvise_thp` issues `MADV_HUGEPAGE` on heaps and mmaps of at least a huge page). Found; the plan puts it under `advised`, natural arm; also run in the forced pilot under `on`.
- mimalloc 3.0.1: the only THP-related option is `mi_option_allow_large_os_pages` (`MIMALLOC_ALLOW_LARGE_OS_PAGES`, header comment "If false, also disables THP for the process"; default false). In `src/prim/unix/prim.c` `_mi_prim_mem_init` the branch that calls `prctl(PR_SET_THP_DISABLE)` only runs when `PR_GET_THP_DISABLE` returns non-zero, i.e. when THP is already disabled, so it never turns THP off on a default `on` process (measured: `prctl_thp_disable=0` on the ENV line at `main`, and collapse works). Setting it to 1 does the opposite: `src/prim/unix/prim.c` `unix_mmap` calls `madvise(MADV_HUGEPAGE)` on large regions. So there is **no working mimalloc opt-out**, and `MIMALLOC_ALLOW_LARGE_OS_PAGES=1` is the opt-in, run as an extra `advised` natural cell and as an `on` forced pilot cell. Looked at: `mimalloc.h` (installed header), the Debian source package `mimalloc 3.0.1+ds-2.1`, `src/options.c`, `src/prim/unix/prim.c`.
- musl: none (no THP code; mallocng never calls `madvise` toward THP).

## Fencing and placement (indicative host facts, 2026-11-16)

- Host CPU: 24 logical CPUs, two CCDs (CPUs 0-5/12-17 on one, 6-11/18-23 on the other), SMT siblings are CPU n and n+12 (`lscpu -e`).
- Forced-arm pilot: four lanes, each pinned (`--cpuset-cpus`) to one core and its sibling (`6,18`, `7,19`, `8,20`, `9,21`); requested and effective cpuset (`Cpus_allowed_list` read inside the container) are in every row. Question C pilot: strictly sequential, `--cpuset-cpus 6` for one thread and `6,7,8,9` for four, `cpuprobe.sh --sibling 18` (CPU 6's sibling; the other three siblings, 19-21, were not sampled).
- **Fencing could not be applied.** The user systemd manager has only the `cpu memory pids` controllers delegated (no `cpuset`); `systemd-run --user --scope -p AllowedCPUs=0-5` is accepted but the process still reports `Cpus_allowed_list: 0-23`, and no sudo exists. So other slices were not moved to the other CCD. Per the plan, Question C claims in WP-2 are limited to within-run A/B verdicts (no absolute CPU time across runs); the pilot's `sibling_busy` was 0.00-0.10 (max over 198 runs; the 0.10 and 0.09 values are four-thread cells where the sampled CPU 18 is not the sibling of CPUs 7-9).
- Natural arm: unpinned, concurrent (13 containers in flight at most, each under 150 MiB resident, well under the 2 GiB cap), diagnostic.

## Question B: mechanism (indicative; smaps dumps from the pilot rows in `results/pilot-forced.jsonl`, `--collapse` runs at stride 128 KiB unless stated; source anchors from the upstream release tarballs of the Debian source packages in the image: glibc 2.41, jemalloc 5.3.0, mimalloc 3.0.1, musl 1.2.5)

Which mappings collapse, per allocator:

- **glibc** (`malloc/arena.c` `new_heap`, `grow_heap`; `malloc/malloc.c` `mtrim`): a worker thread's arena is one 64 MiB-aligned heap (`HEAP_MAX_SIZE`) whose rw part stays mapped. `malloc_trim(0)` frees the burst with `madvise(MADV_DONTNEED)` on whole free pages (`mtrim`, the `__madvise (paligned_mem, size & ~psm1, MADV_DONTNEED)` call) and never unmaps or shrinks the heap (as in `glibc-arena-retention`). At release the heap mapping is 64 MiB with 1.6 MiB resident and 0 AHP; `MADV_COLLAPSE` on its 64 MiB span (return 0) turns it into 64 MiB of AHP, plus a 16 MiB second heap at the bursts's edge, so about 80 MiB, i.e. the whole mapping, because the call (and khugepaged under `max_ptes_none=511`) fills the 511 empty PTEs of each 2 MiB range around a survivor. At stride 0 (no survivors) the same trimmed mappings collapse to 22 MiB: an empty-looking mapping is not safe either.
- **jemalloc** (`src/pac.c` `pac_decay_stashed`, `src/extent.c` `extent_purge_forced_wrapper`, `src/pages.c` `pages_purge_lazy`, `src/base.c`): memory comes from 2 MiB-aligned retained extents inside 64-66 MiB mappings plus a 4 MiB metadata block. At release under `on` AHP is already 10 MiB: the 4 MiB metadata mapping is fully huge (`src/base.c` `base_block_alloc` uses huge-page sizes and alignment "regardless of `opt_metadata_thp`", and `always` mode gives a huge page on first touch; pre-start AHP is 4 MiB), and two extent mappings keep 2 and 4 MiB huge pages that the purge did not split. The purge only splits a huge page when it purges a sub-range of it, so extents that are purged whole (or never faulted whole) lose it, and the rest remains. After `MADV_COLLAPSE` the two big extent mappings hold 61 and 12 MiB of AHP (about 78 MiB in all) although two of the three calls returned -1/EINVAL (`errno` 22): coverage is only visible in the post-call AHP. With `MALLOC_CONF=thp:never` (`pages_set_thp_state` → `madvise(MADV_NOHUGEPAGE)`) every jemalloc mapping carries the `nh` VmFlag, `THPeligible` is 0, AHP is 0 at release, and all collapse calls return EINVAL with no AHP gained (final anon 7.2 MiB; the remaining 2 MiB of AHP in that cell is the harness's own binary data, below).
- **mimalloc** (`src/arena.c` arenas, `src/prim/unix/prim.c` `_mi_prim_decommit` / `_mi_prim_reset`, `mi_collect(true)` → purge): one 1 GiB virtual arena mapping (1048640 KiB) from which 64 KiB small pages are carved. `mi_collect(true)` decommits free pages with `MADV_DONTNEED` (`purge_decommits`), leaving 34.9 MiB resident (about 512 survivors times a 64 KiB page) and AHP 0; the mapping is one huge rw span, and the collapse call on it returns -1/EINVAL (the span includes `PROT_NONE`/uncommitted holes) yet 69.6 MiB of it become AHP (anon 69.9 MiB). So the unreleased remainder is entirely collapsible; mimalloc's own survivors page granularity (64 KiB) already costs it 32 MiB at stride 128 KiB before any THP effect.
- **musl** (`src/malloc/mallocng/malloc.c` `alloc_group`; `free.c` `nontrivial_free`; `glue.h`): `USE_MADV_FREE` is 0 (`glue.h`), so a free never returns pages, and there is no release call. Groups are mmapped individually (`alloc_group`: "produce an individually-mmapped allocation if usage is low"); a fully freed group is unmapped (`free_group` → `munmap`). At stride 128 KiB each survivor pins its own 64 KiB group: 514 separate mappings of about 64 KiB (`MAPS_OTHER count=514 rss=32.7 MiB`, largest mapping 3.4 MiB, which is the binary's data), none holds a 2 MiB-aligned 2 MiB span, so there is no eligible span and the collapse call has nothing to act on (anon 34.2 MiB, AHP 0, in both `on` and `off`). **This is density-dependent**: at stride 32 KiB (4x denser survivors) the groups sit next to each other, the kernel merges the adjacent anonymous VMAs into one 83.7 MiB mapping, which is `THPeligible` and collapses fully (AHP 80 MiB, all 5 pilot blocks, one SPAN return 0 with AHP 0 → 81.9 MiB). So "musl has no eligible span" holds at strides 128 and 1024 KiB and not at 32 KiB.

Harness artifact, same for every collapsing cell: `thp.c`'s static smaps tables put its own 3.4 MiB data mapping (the first `SPAN`, ret 0, AHP 0 → 2 MiB) over the 2 MiB threshold, so every `--collapse` run in `on` mode carries +2.0 MiB AHP (also visible in `jemalloc thp:never`: 2.0 MiB AHP and nothing else). Cells without the collapse and the natural arm (which has no collapse call) are unaffected. WP-2 should subtract it, or shrink the tables before the claim runs (the pilot rows were not regenerated so the smoke rerun matches them).

Why `off` is clean: `PR_SET_THP_DISABLE` before allocator start-up gives AHP 0 at `t=pre`, release and the end for all four allocators in all 100 pilot `off` runs (no AHP growth; all 279 `MADV_COLLAPSE` calls returned EINVAL, so forced collapse respects the prctl). No `off` row had pre-existing AHP; pre-start AHP under `on` was 0 or 4 MiB for jemalloc and 0, 2 or 4 MiB for mimalloc (glibc and musl 0), never under `off`.

## Pilots (R9; excluded from inference; rows in `results/pilot-forced.jsonl` (215) and `results/pilot-cpu.jsonl` (198), provenance `pilot`; indicative)

Host at the time: THP `enabled=always`, `defrag=madvise`, `max_ptes_none=511`, `pages_to_scan=4096`, `scan_sleep_millisecs=10000`; uptime about 2 h 50 min; khugepaged `full_scans` 8 to 9 during the session. Forced pilot: 43 cells (4 allocators x `on`/`off` x strides 0/32/128/1024 KiB, plus the mixed 16 B-4 KiB shape at 128 KiB, plus three native-control cells at `on`/128 KiB), 5 blocks per cell in seeded random order over four pinned lanes, settle windows 0 s and 10 s after `BOUNDARY`. Question C pilot: 4 allocators x `on`/`off` x 1/4 threads, each with a zero-work control (`--mib 0`), plus an A/A copy of glibc `on` 1 thread, 6 blocks per cell, 10 reps of a 64 MiB burst per thread, shuffled, sequential, `cpuprobe.sh`.

### Calls (the continuous-or-bimodal threshold is fixed here, M7)

- **Settled anon and AHP (forced arm): continuous within a cell, bimodal across conditions.** Within a cell the five blocks spread at most 0.2 MiB for glibc and musl (glibc `on` AHP alternates 80/82 MiB), 2 MiB for jemalloc (4 MiB at stride 0), and up to 8 MiB for mimalloc `on` (66.7-74.6 MiB in 2 MiB steps, no empty gap): a level is reported per cell. The `off`, `thp:never` and musl-at-128/1024 KiB cells sit at AHP 0 or 2 MiB (the artifact), the collapsing ones at 14 MiB (jemalloc stride 0) and above, so the bad-mode definition for the rate metric `bad_collapse` is fixed as **AHP at the reading of at least 8 MiB** (empty gap between 2.0 and 14.0 MiB over all 215 rows). Because the forced collapse is deterministic per cell, every cell of the pilot was all-0 or all-1 for `bad_collapse`; a rate is needed only for a condition whose pilot blocks mix both modes, and none did (jemalloc and mimalloc `on` stride 0 are all-1).
- **Claim-run counts (WP-2):** levels: 10 blocks per cell, 20 for mimalloc `on` cells (2 MiB-quantised spread 8 MiB); the rate metric, where WP-2 reports one, 20 blocks per condition (LH6). Proposed WP-2 budget: all 43 cells plus an A/A copy of two cells x 20 blocks = 900 containers x about 17 s (3 s burst + collapse, 12 s idle for the 10 s window, 2 s start-up) = 4.3 container-hours (about 1.1 h wall on four pinned lanes); Question C: 33 cells x 20 blocks = 660 sequential runs, about 90 s per round of 33 runs (musl 4-thread cells take 20 s each) = about 0.5 h. Total about 4.8 container-hours (1.6-2 h wall).
- **Question C metrics: `cpu_task_clock_ms` continuous in 30 of 33 cells (spread up to 11 %, glibc `off` 4 threads), bimodal in two cells and one outlier**: mimalloc `on` 1 thread has 5 blocks at 225-232 ms and one at 133.6 ms (threshold 180 ms), mimalloc `on` 4 threads has two clusters, 1024-1047 ms (2 blocks) and 1236-1288 ms (4 blocks), empty gap 1047-1236 (threshold 1140 ms). Those two conditions are reported as a rate of the fast mode (20 blocks each, which the budget above covers) or with both clusters shown, never a median. `instructions_u` is continuous everywhere with a spread under 0.01 % for the burst cells (the stable cost, C7); the zero-work controls are 0.07-4.6 million instructions and 0.4-2.4 ms, so the control-subtracted burst cost is the raw value to within 1 %. `sibling_busy` was at most 0.10 in 198 runs.
- **Indicative findings from the pilot that WP-2 should confirm:** burst CPU (control not subtracted, 1 thread, medians): glibc `on` 338 ms / `off` 552 ms, jemalloc 219 / 428, mimalloc 227 / 353, musl 550 / 570 (no THP effect); four threads (4x the work): glibc 2067 / 2791, jemalloc 1018 / 1823, mimalloc 1243 / 1467, **musl 19873 / 19718 ms, 36x its one-thread cost for 4x the work** (the never-measured musl mallocng multithreaded-throughput question: lock contention in a single shared heap; `instructions_u` 17.1e9 against 4 x 3.83e9, i.e. it also spins). `off` is slower than `on` for glibc, jemalloc and mimalloc at both thread counts (page-fault cost of 4 KiB against 2 MiB pages under a refault-heavy loop). A/A pair (glibc `on` 1 thread): medians 338.2 and 338.9 ms.

### Per-observation acceptance envelopes for the orchestrator's smoke rerun

One fresh-container re-run of a pilot cell (same pin family, same flags) is accepted when its reading falls inside the envelope. Forced arm: anon settled at 10 s within [pilot min - 2 MiB, pilot max + 2 MiB] (2 MiB is one huge page, the granularity of every AHP step); and AHP at release, `off` AHP = 0, and the `bad_collapse` mode must equal the pilot's. Question C: `instructions_u` within +-0.2 % of the pilot range, `cpu_task_clock_ms` within [min x 0.9, max x 1.1] of the pilot range, and for the two bimodal mimalloc `on` cells within either cluster's range; `sibling_busy` at most 0.15. The WP-1 rerun (one `on` stride-128 cell per allocator, `--out` scratch) read 82.43, 76.55, 74.58 and 34.24 MiB for glibc, jemalloc, mimalloc and musl, all inside their envelopes.

| cell | n | AHP at release (MiB) | anon settled 10 s (MiB) min..max | AHP final min..max | envelope for one smoke observation, anon settled 10 s (MiB) |
|---|---|---|---|---|---|
| glibc-hugetlb1-on-s128 | 5 | 0.0..0.0 | 80.3..82.4 | 80.0..82.0 | 78.3..84.4 |
| glibc-off-mixed128 | 5 | 0.0..0.0 | 3.9..4.0 | 0.0..0.0 | 1.9..6.0 |
| glibc-off-s0 | 5 | 0.0..0.0 | 16.4..16.5 | 0.0..0.0 | 14.4..18.5 |
| glibc-off-s1024 | 5 | 0.0..0.0 | 1.2..1.3 | 0.0..0.0 | -0.8..3.3 |
| glibc-off-s128 | 5 | 0.0..0.0 | 2.4..2.5 | 0.0..0.0 | 0.4..4.5 |
| glibc-off-s32 | 5 | 0.0..0.0 | 8.4..8.5 | 0.0..0.0 | 6.4..10.5 |
| glibc-on-mixed128 | 5 | 0.0..0.0 | 64.5..66.5 | 64.0..66.0 | 62.5..68.5 |
| glibc-on-s0 | 5 | 0.0..0.0 | 22.3..22.4 | 22.0..22.0 | 20.3..24.4 |
| glibc-on-s1024 | 5 | 0.0..0.0 | 80.5..82.4 | 80.0..82.0 | 78.5..84.4 |
| glibc-on-s128 | 5 | 0.0..0.0 | 80.5..82.5 | 80.0..82.0 | 78.5..84.5 |
| glibc-on-s32 | 5 | 0.0..0.0 | 80.5..82.4 | 80.0..82.0 | 78.5..84.4 |
| jemalloc-off-mixed128 | 5 | 0.0..0.0 | 5.3..5.4 | 0.0..0.0 | 3.3..7.4 |
| jemalloc-off-s0 | 5 | 0.0..0.0 | 3.3..3.3 | 0.0..0.0 | 1.3..5.3 |
| jemalloc-off-s1024 | 5 | 0.0..0.0 | 3.5..3.6 | 0.0..0.0 | 1.5..5.6 |
| jemalloc-off-s128 | 5 | 0.0..0.0 | 5.3..5.4 | 0.0..0.0 | 3.3..7.4 |
| jemalloc-off-s32 | 5 | 0.0..0.0 | 11.3..11.4 | 0.0..0.0 | 9.3..13.4 |
| jemalloc-on-mixed128 | 5 | 10.0..10.0 | 76.5..78.6 | 76.0..78.0 | 74.5..80.6 |
| jemalloc-on-s0 | 5 | 10.0..12.0 | 14.6..18.6 | 14.0..18.0 | 12.6..20.6 |
| jemalloc-on-s1024 | 5 | 10.0..10.0 | 76.5..78.6 | 76.0..78.0 | 74.5..80.6 |
| jemalloc-on-s128 | 5 | 10.0..10.0 | 76.5..78.6 | 76.0..78.0 | 74.5..80.6 |
| jemalloc-on-s32 | 5 | 10.0..10.0 | 78.6..78.7 | 78.0..78.0 | 76.6..80.7 |
| jemalloc-thpnever-on-s128 | 5 | 0.0..0.0 | 7.2..7.3 | 2.0..2.0 | 5.2..9.3 |
| mimalloc-largepages-on-s128 | 5 | 0.0..0.0 | 66.7..72.6 | 66.0..72.0 | 64.7..74.6 |
| mimalloc-off-mixed128 | 5 | 0.0..0.0 | 29.9..29.9 | 0.0..0.0 | 27.9..31.9 |
| mimalloc-off-s0 | 5 | 0.0..0.0 | 0.6..0.7 | 0.0..0.0 | -1.4..2.7 |
| mimalloc-off-s1024 | 5 | 0.0..0.0 | 4.6..4.7 | 0.0..0.0 | 2.6..6.7 |
| mimalloc-off-s128 | 5 | 0.0..0.0 | 32.6..32.7 | 0.0..0.0 | 30.6..34.7 |
| mimalloc-off-s32 | 5 | 0.0..0.0 | 64.7..64.8 | 0.0..0.0 | 62.7..66.8 |
| mimalloc-on-mixed128 | 5 | 0.0..0.0 | 70.7..74.5 | 70.0..74.0 | 68.7..76.5 |
| mimalloc-on-s0 | 5 | 0.0..0.0 | 34.7..38.7 | 34.0..38.0 | 32.7..40.7 |
| mimalloc-on-s1024 | 5 | 0.0..2.0 | 66.7..74.6 | 66.0..74.0 | 64.7..76.6 |
| mimalloc-on-s128 | 5 | 0.0..2.0 | 68.6..74.6 | 68.0..74.0 | 66.6..76.6 |
| mimalloc-on-s32 | 5 | 62.0..64.0 | 68.5..74.6 | 68.0..74.0 | 66.5..76.6 |
| musl-off-mixed128 | 5 | 0.0..0.0 | 36.0..36.1 | 0.0..0.0 | 34.0..38.1 |
| musl-off-s0 | 5 | 0.0..0.0 | 1.9..2.0 | 0.0..0.0 | -0.1..4.0 |
| musl-off-s1024 | 5 | 0.0..0.0 | 6.0..6.0 | 0.0..0.0 | 4.0..8.1 |
| musl-off-s128 | 5 | 0.0..0.0 | 34.2..34.3 | 0.0..0.0 | 32.2..36.3 |
| musl-off-s32 | 5 | 0.0..0.0 | 83.7..83.8 | 0.0..0.0 | 81.7..85.8 |
| musl-on-mixed128 | 5 | 0.0..0.0 | 36.0..36.1 | 0.0..0.0 | 34.0..38.1 |
| musl-on-s0 | 5 | 0.0..0.0 | 1.9..2.0 | 0.0..0.0 | -0.1..4.0 |
| musl-on-s1024 | 5 | 0.0..0.0 | 6.0..6.0 | 0.0..0.0 | 4.0..8.1 |
| musl-on-s128 | 5 | 0.0..0.0 | 34.2..34.3 | 0.0..0.0 | 32.2..36.3 |
| musl-on-s32 | 5 | 0.0..0.0 | 83.7..83.8 | 80.0..80.0 | 81.7..85.8 |

| cell | n | task-clock ms min..max | instructions_u min..max | sibling_busy max | envelope: task-clock ms (min x0.9 .. max x1.1), instructions_u (+-0.2%) |
|---|---|---|---|---|---|
| glibc-off-t1-burst | 6 | 540.3..556.0 | 4598.25e6..4598.27e6 | 0.00 | 486.2..611.6; 4589.06e6..4607.46e6 |
| glibc-off-t1-control | 6 | 0.7..1.2 | 0.28e6..0.28e6 | 0.00 | 0.6..1.3; 0.28e6..0.28e6 |
| glibc-off-t4-burst | 6 | 2672.2..2971.1 | 18392.51e6..18421.31e6 | 0.10 | 2404.9..3268.2; 18355.73e6..18458.15e6 |
| glibc-off-t4-control | 6 | 0.9..1.2 | 0.29e6..0.29e6 | 0.00 | 0.8..1.3; 0.29e6..0.29e6 |
| glibc-on-t1-burst | 6 | 334.5..344.9 | 4597.96e6..4597.97e6 | 0.03 | 301.1..379.4; 4588.76e6..4607.17e6 |
| glibc-on-t1-burst-AA | 6 | 332.8..353.3 | 4597.96e6..4597.97e6 | 0.03 | 299.5..388.6; 4588.76e6..4607.17e6 |
| glibc-on-t1-control | 6 | 0.5..0.9 | 0.17e6..0.17e6 | 0.00 | 0.5..1.0; 0.17e6..0.17e6 |
| glibc-on-t4-burst | 6 | 2031.5..2118.2 | 18391.58e6..18399.49e6 | 0.09 | 1828.3..2330.0; 18354.80e6..18436.29e6 |
| glibc-on-t4-control | 6 | 0.6..0.9 | 0.18e6..0.18e6 | 0.00 | 0.6..1.0; 0.18e6..0.18e6 |
| jemalloc-off-t1-burst | 6 | 425.8..432.7 | 3250.55e6..3250.69e6 | 0.02 | 383.3..476.0; 3244.05e6..3257.19e6 |
| jemalloc-off-t1-control | 6 | 1.8..2.1 | 4.38e6..4.38e6 | 0.00 | 1.6..2.4; 4.38e6..4.39e6 |
| jemalloc-off-t4-burst | 6 | 1810.1..1833.8 | 12958.11e6..12988.43e6 | 0.00 | 1629.1..2017.2; 12932.20e6..13014.41e6 |
| jemalloc-off-t4-control | 6 | 2.1..2.4 | 4.50e6..4.62e6 | 0.00 | 1.9..2.7; 4.49e6..4.63e6 |
| jemalloc-on-t1-burst | 6 | 214.1..221.9 | 3248.16e6..3248.44e6 | 0.00 | 192.7..244.1; 3241.67e6..3254.93e6 |
| jemalloc-on-t1-control | 6 | 1.1..1.7 | 2.29e6..2.29e6 | 0.00 | 1.0..1.9; 2.28e6..2.29e6 |
| jemalloc-on-t4-burst | 6 | 993.8..1030.0 | 12987.47e6..13001.43e6 | 0.00 | 894.4..1133.0; 12961.50e6..13027.43e6 |
| jemalloc-on-t4-control | 6 | 1.4..1.7 | 2.52e6..2.52e6 | 0.00 | 1.3..1.9; 2.51e6..2.53e6 |
| mimalloc-off-t1-burst | 6 | 348.9..353.6 | 1223.81e6..1223.82e6 | 0.03 | 314.0..388.9; 1221.37e6..1226.27e6 |
| mimalloc-off-t1-control | 6 | 1.0..1.3 | 0.55e6..0.55e6 | 0.00 | 0.9..1.5; 0.55e6..0.56e6 |
| mimalloc-off-t4-burst | 6 | 1445.5..1518.3 | 4894.01e6..4895.47e6 | 0.03 | 1301.0..1670.1; 4884.22e6..4905.26e6 |
| mimalloc-off-t4-control | 6 | 1.1..1.5 | 0.56e6..0.56e6 | 0.00 | 1.0..1.7; 0.56e6..0.56e6 |
| mimalloc-on-t1-burst | 6 | 133.6..231.9 | 1223.38e6..1223.45e6 | 0.00 | 120.2..255.0; 1220.93e6..1225.90e6 |
| mimalloc-on-t1-control | 6 | 0.6..1.1 | 0.30e6..0.30e6 | 0.00 | 0.6..1.2; 0.30e6..0.30e6 |
| mimalloc-on-t4-burst | 6 | 1024.5..1287.4 | 4893.29e6..4893.93e6 | 0.00 | 922.0..1416.1; 4883.50e6..4903.72e6 |
| mimalloc-on-t4-control | 6 | 0.8..1.0 | 0.31e6..0.31e6 | 0.00 | 0.7..1.1; 0.31e6..0.31e6 |
| musl-off-t1-burst | 6 | 565.3..573.9 | 3828.42e6..3828.43e6 | 0.00 | 508.8..631.3; 3820.76e6..3836.08e6 |
| musl-off-t1-control | 6 | 0.5..0.7 | 0.07e6..0.07e6 | 0.00 | 0.4..0.7; 0.07e6..0.07e6 |
| musl-off-t4-burst | 6 | 19421.0..19876.2 | 17117.89e6..17159.90e6 | 0.04 | 17478.9..21863.8; 17083.66e6..17194.22e6 |
| musl-off-t4-control | 6 | 0.7..0.9 | 0.07e6..0.08e6 | 0.00 | 0.6..1.0; 0.07e6..0.08e6 |
| musl-on-t1-burst | 6 | 542.8..552.1 | 3828.39e6..3828.40e6 | 0.00 | 488.5..607.3; 3820.74e6..3836.06e6 |
| musl-on-t1-control | 6 | 0.4..0.6 | 0.06e6..0.06e6 | 0.00 | 0.3..0.6; 0.06e6..0.06e6 |
| musl-on-t4-burst | 6 | 19380.8..20314.9 | 17117.45e6..17232.55e6 | 0.01 | 17442.7..22346.4; 17083.21e6..17267.02e6 |
| musl-on-t4-control | 6 | 0.5..0.7 | 0.07e6..0.07e6 | 0.00 | 0.5..0.8; 0.07e6..0.07e6 |

## Natural arm (indicative, diagnostic: unpinned, concurrent, 13 containers in flight at most, `results/natural.jsonl`, 30 blocks, 0 discarded)

15 cells x 2 blocks: `on`, `off`, `advised` for each allocator, plus the three native controls under `advised` (jemalloc `thp:never`, glibc `hugetlb=1`, mimalloc `MIMALLOC_ALLOW_LARGE_OS_PAGES=1`). Each block read until the host's `khugepaged/full_scans` passed its release value by two increments, stopping early at the first increment when anon or AHP had grown by at least 8 MiB. Host `full_scans` ran 8 to 13 over the wave (one pass took 12-17 min, the first increment arrived 13.7 min (820 s) to 16.8 min (1010 s) after release for the `on` blocks, two increments 27.5-32.8 min). All values MiB, indicative.

| allocator | THP | blocks | anon at release | anon and AHP at the reading | full_scans release -> read | forced arm (pilot, stride 128, minus the 2 MiB harness artifact) |
|---|---|---|---|---|---|---|
| glibc | `on` | 2 | 2.2 | 80.1 / 80.0, grew at the first increment in both | 8 -> 9, 9 -> 10 | 78.4-80.4 anon (agrees) |
| jemalloc | `on` | 2 | 18.3 (AHP 14.0) | 80.3 / 80.0, both at the first increment | 8 -> 9, 10 -> 11 | 74.5-76.6 (natural is 4-6 MiB higher: khugepaged also fills the spans where `MADV_COLLAPSE` returned EINVAL and left 8 MiB uncollapsed; **unresolved, 2 blocks**) |
| mimalloc | `on` | 2 | 32.9 / 32.6 | 66.4 / 66.0, both at the first increment | 8 -> 9, 10 -> 11 | 64.7-72.6 (natural sits at the low end; consistent, not exact) |
| musl | `on` | 2 | 33.8 | 33.8 / 0, no growth by the second increment | 8 -> 10, 10 -> 12 | 32.2-36.3 (agrees: no eligible span at stride 128) |
| all four | `off` | 8 | 2.2 / 5.4 / 32.4 / 33.8 | unchanged, AHP 0, no growth by the second increment | two increments each | unchanged (agrees) |
| all four | `advised` | 8 | as `off` | unchanged, AHP 0, no growth by the second increment | two increments each | not applicable: `MADV_COLLAPSE` is itself advice, so forced `advised` is not a faithful model |
| jemalloc `thp:never` / glibc `hugetlb=1` / mimalloc `allow_large_os_pages=1` | `advised` | 6 | 5.4 / 2.2 / 32.4 | unchanged, AHP 0 (by the second increment) | two increments each | pilot `on`: jemalloc 7.2 (2 MiB artifact, AHP 0 otherwise), glibc 82.3, mimalloc 68.7 |

So under `on` the natural arm reproduces the forced outcome for glibc and musl, roughly for mimalloc and with a few MiB more for jemalloc; under `off` it is identical. Under `advised`, no block of any allocator grew within two khugepaged passes ("not grown by its second increment", not "no re-collapse": the first increment after a release is not guaranteed to cover the block, and two increments are all this wave waited). The two `advised` native-control cells did not change that, and the smaps dump says why they are inert on this host rather than useless in general: neither mapping carries the `hg` VmFlag and both read `THPeligible 0`. glibc's `do_set_hugetlb` (malloc/malloc.c) only enables its `madvise(MADV_HUGEPAGE)` when the system mode is `madvise`, and this host is `always`; mimalloc's `unix_mmap`/`mi_os_prim_alloc_at` (src/prim/unix/prim.c, src/os.c) sets `allow_large` false for uncommitted (arena reserve) mappings and only advises when large pages are allowed. Orchestrator checkpoint (plan Execution): the natural arm agrees with the forced arm under `on` for every allocator except jemalloc's few-MiB difference, so WP-2 does not need to be revisited; the README should mark jemalloc `on` as unresolved at the difference level.

Pre-mortem for WP-2: `advised` is a host-mode-dependent claim; the natural arm is the only source and has 2 blocks per cell and no pinning.

## WP-2: harness artifact fix (2026-11-16)

- Cause (WP-1 deviation): `src/thp.c` kept its smaps tables as static arrays (`struct map m[4096]` and a second pair in the collapse routine), which grew the harness's own data/bss mapping to about 3.4 MiB, so `MADV_COLLAPSE` over that mapping's 2 MiB-aligned span added +2.0 MiB of `AnonHugePages` to every collapsing `on` run (natural arm unaffected: it never collapses).
- Fix at source: the three tables now live in one `mmap`ed region marked `MADV_NOHUGEPAGE`, and `load_maps` skips any mapping that overlaps that region (the region's VmFlags differ, so it never merges with another mapping either). The harness version string is `thp-harness 2` and the image tag is `thp-recollapse:2`, so a row's `image` id says which harness produced it.
- Acceptance (smoke, stride 128 KiB, `--collapse`, `on`): jemalloc with `MALLOC_CONF=thp:never` reads AHP 0.00 MiB at release and at the reading (anon 5.35 MiB settled at 10 s; was 7.2 with 2.0 MiB AHP); glibc reads AHP 80.00 MiB (anon settled 80.46), not 82.
- WP-1 pilot rows keep provenance `pilot`, were produced by harness 1, and are excluded from inference. Their forced `on` cells that collapse carry +2 MiB AHP and +2 MiB anon, so the envelopes above shift by -2 MiB for collapsing `on` cells (all other cells unchanged).

## Claim runs (2026-11-16/17; standard rigor, rows `results/claim-forced.jsonl` and `results/claim-cpu.jsonl`, provenance `claim`)

- Conditions: image `thp-recollapse:2` (harness 2), host THP `always`, `defrag=madvise`, `max_ptes_none=511`, `pages_to_scan=4096`, `scan_sleep_millisecs=10000`, uptime 4.2-4.9 h, khugepaged `full_scans` 13-16 over the runs (recorded per row, `results/summary.md`). Forced arm: 45 cells (43 pilot cells plus two A/A copies), 530 blocks (10 per cell, 20 for mimalloc `on` and the A/A copies), round-robin per round with the order shuffled by seed 20261118, four pinned lanes drawn from one shared queue; 0 failed; 28 min wall. Question C: 33 cells x 20 = 660 strictly sequential blocks (seed 20261119), 11 min wall; 3 zero-work control runs failed (`cpuprobe.sh`: no ticks elapsed on the sibling CPU in a sub-millisecond run) and are counted as discarded, never retried. Cell and round are in each row label (`cell#round`).
- Learned: (1) the fixed harness reads glibc `on` 128 KiB at 80.0 MiB AHP (80.45 anon), jemalloc `thp:never` at AHP 0, all as accepted; (2) mimalloc `on` stride 0 is the only mixed `bad_collapse` cell (19/20; one block read 4.4 MiB anon), reported as a rate; (3) the jemalloc `on` metadata block is 4 MiB in all 10 forced blocks and 8 MiB in both natural blocks: cause not isolated (concurrency, pinning and start-up timing differ between the arms), so the rollup gap of about 4 MiB stays marked unresolved while the two arena mappings agree exactly; (4) the CPU bimodality moved: mimalloc `on` 1 thread fast mode 3/20 (pilot 1/6), 4 threads 1/20 (pilot 2/6); (5) musl at 4 threads is 1.028 [1.007, 1.052] times slower under `on` than `off` (marginal over the 0.019 A/A floor), 0.960 at 1 thread.
- Smoke envelopes from the claim rows (per observation, one `on` stride-128 cell per allocator; anon settled at 10 s / AHP at the reading, MiB): glibc 80.35..80.46 / 80; jemalloc 76.55..76.64 / 76; mimalloc 66.58..72.65 / 66..72; musl 34.24..34.35 / 0. A clean-directory re-run read 80.46, 76.55, 66.69 and 34.34 anon (AHP 80, 76, 66, 0): all inside. Pilot envelopes above remain for the pilot harness; for collapsing `on` cells they shift by -2 MiB under harness 2.
