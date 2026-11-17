# THP re-collapse across allocators: khugepaged refills what glibc, jemalloc and mimalloc released; musl mostly escapes, and only a per-process switch stops all four

With transparent huge pages on (host mode `always`, `max_ptes_none=511`), a burst-then-release workload with scattered survivors (64 MiB of 64 B objects, one survivor per 128 KiB, then the allocator's release call) ends with its released memory collapsed back into huge pages: anonymous memory settles at about **80 MiB for glibc** (2.2 MiB at release), **77 MiB for jemalloc** (19 MiB at release), **66-71 MiB for mimalloc** (33 MiB at release), at every survivor density from 32 KiB to 1 MiB; **musl** collapses only when its survivors are dense enough for its small groups to merge into one mapping (32 KiB stride: 84 MiB), and stays at 34 MiB (128 KiB stride) and 6 MiB (1 MiB stride) otherwise, so its result is per density, never "musl is immune". Turning THP off for the process before the allocator starts (`prctl(PR_SET_THP_DISABLE)`) removes the effect for all four; the allocators' own switches do not: jemalloc `MALLOC_CONF=thp:never` works, glibc's `hugetlb=1` is inert when the host mode is `always`, mimalloc 3.0.1 has no working opt-out, musl has none. The CPU side runs the other way: THP `on` makes the burst cheaper (glibc 0.62x, jemalloc 0.50x, mimalloc slow mode 0.64x the CPU time of `off`, within-run A/B), and musl's multi-threaded cost is 36x its single-thread cost for 4x the work. One host, one kernel, one synthetic workload; the forced collapse models `max_ptes_none=511` only; no CPU fencing (CPU claims are within-run A/B only).

Rigor: the memory claims are **standard** (10 blocks per cell, 20 for mimalloc `on`, interleaved, pinned, A/A pairs, pilot excluded); the CPU claims are **standard** but limited to within-run A/B verdicts; the natural-arm results are **indicative** (2 blocks per cell, unpinned, concurrent). Full generated tables: [results/summary.md](results/summary.md). Working log, mechanism notes and the pilots: [notes.md](notes.md).

## Question and design

Follow-up of [glibc-arena-retention](../glibc-arena-retention/): `mxfast=0` did not help downstream, and the downstream finding behind it is khugepaged re-collapsing a trimmed thread arena into huge pages (crucible-vault `docs/spikes/arena-late-growth/WP-1-FINDINGS.md` and `WP-3-FINDINGS.md`, observed at 6% and 27% of nights, unexamined). (A) How much does each allocator hold once its released spans are collapsed, per THP mode, survivor density and native control? (B) Why? (C) What does each allocator's burst cost in CPU, single- and multi-threaded?

- Workload (`src/thp.c`, four builds): a worker thread allocates 64 MiB of 64 B objects (or the mixed 16 B-4 KiB shape), frees all but one object per stride of cumulative allocation (stride 0 means none), calls the release (glibc `malloc_trim(0)`, jemalloc `arena.<all>.purge`, mimalloc `mi_collect(true)`, none for musl). Anon and `AnonHugePages` (AHP) come from `/proc/self/smaps_rollup`; every writable anonymous mapping is dumped from `/proc/self/smaps` at release and at the reading.
- THP control per process, set before the allocator starts (the harness sets `PR_SET_THP_DISABLE` and re-executes itself; the setting survives `execve`): `on` (host default), `off`. `advised` (`PR_THP_DISABLE_EXCEPT_ADVISED`) is covered by the natural arm only.
- **Forced arm (claim-producing).** After the release the harness calls `madvise(MADV_COLLAPSE)` on every 2 MiB-aligned span of each writable anonymous mapping, then prints a boundary line; settled readings at **0 s and 10 s** after it come from `scripts/memprobe.sh` under `scripts/measure.mjs` conventions (`methods/memory.md` M5 as written). Two windows because M5 asks for at least two: 0 s is the state at the boundary, 10 s is one full khugepaged sleep interval (`scan_sleep_millisecs=10000`) later, so any further change the kernel makes on its own would show; the two differ by 0.1 MiB or less in every cell (the harness's own reading overhead), so the 10 s value is tabulated. Collapse coverage is read from per-span AHP before and after the call, never from the return code (several calls return `EINVAL` yet the mapping collapses).
- **Natural arm (indicative).** No collapse call; each block waits until the host's `khugepaged/full_scans` advanced past its release (early stop at the first increment if memory grew by 8 MiB or more), 2 blocks per cell, unpinned and concurrent. It covers `on`, `off`, `advised` and the native controls; it is the only source for `advised`.
- Counts (fixed from the pilot, which is excluded; `notes.md` "Calls"): 43 cells x 10 blocks, 20 for every mimalloc `on` cell (its settled value moves in 2 MiB steps over an 8 MiB range), plus A/A copies of glibc `on` 128 KiB and mimalloc `on` 128 KiB at 20 blocks: 530 blocks, 0 discarded. Rounds are round-robin over cells with the order shuffled per round (seed 20261118 in every row), spread over four pinned lanes (CPUs 6+18, 7+19, 8+20, 9+21 via `--cpuset-cpus`; requested and effective cpuset recorded per row and identical in all 530). Question C: 33 cells x 20 blocks = 660 sequential interleaved runs (seed 20261119), 3 zero-work control runs failed (`cpuprobe.sh` saw no ticks on the sibling CPU in a sub-millisecond run) and are counted as discarded, not retried.
- Metrics (fixed by the pilot, M7): settled anon and AHP are continuous within a cell, reported as a level per cell (median with a seeded 95% bootstrap interval, `methods/timing.md` R6). `bad_collapse` (AHP at the reading of at least 8 MiB) is all 0 or all 1 in every cell except mimalloc `on` stride 0, which is a rate (19/20, Clopper-Pearson [0.75, 1.00]; the one miss read 4.4 MiB anon). Question C: `cpu_task_clock_ms` continuous except mimalloc `on` 1 thread (threshold 180 ms) and 4 threads (1140 ms), which are shown as a rate of the fast mode with both clusters; `instructions_u` is the stable cost (`methods/cpu.md` C7).

## Results: what each allocator holds after the collapse (forced arm, standard)

Cells read: anon settled at 10 s, MiB, median [95% bootstrap interval]; AHP at the reading (MiB, median); `bad_collapse` count; n blocks.

| allocator, THP (control) | stride 0 | 32 KiB | 128 KiB | 1024 KiB | mixed 16 B-4 KiB @ 128 KiB |
|---|---|---|---|---|---|
| glibc, on | 20.4 [20.4, 20.4]; AHP 20; 10/10; n=10 | 80.4 [80.3, 80.5]; AHP 80; 10/10; n=10 | 80.5 [80.4, 80.5]; AHP 80; 10/10; n=10 | 80.4 [80.4, 80.5]; AHP 80; 10/10; n=10 | 64.6 [64.5, 64.6]; AHP 64; 10/10; n=10 |
| glibc, off | 16.4 [16.4, 16.5]; AHP 0; 0/10; n=10 | 8.4 [8.4, 8.5]; AHP 0; 0/10; n=10 | 2.5 [2.4, 2.5]; AHP 0; 0/10; n=10 | 1.3 [1.2, 1.3]; AHP 0; 0/10; n=10 | 4.0 [3.9, 4.0]; AHP 0; 0/10; n=10 |
| jemalloc, on | 14.6 [14.5, 14.6]; AHP 14; 10/10; n=10 | 76.7 [76.7, 76.7]; AHP 76; 10/10; n=10 | 76.6 [76.6, 76.6]; AHP 76; 10/10; n=10 | 76.6 [76.6, 76.6]; AHP 76; 10/10; n=10 | 76.6 [76.6, 76.7]; AHP 76; 10/10; n=10 |
| jemalloc, off | 3.3 [3.3, 3.4]; AHP 0; 0/10; n=10 | 11.3 [11.3, 11.3]; AHP 0; 0/10; n=10 | 5.3 [5.3, 5.3]; AHP 0; 0/10; n=10 | 3.6 [3.5, 3.6]; AHP 0; 0/10; n=10 | 5.4 [5.3, 5.4]; AHP 0; 0/10; n=10 |
| mimalloc, on | 35.6 [34.7, 36.7]; AHP 35; 19/20; n=20 | 67.6 [66.7, 68.6]; AHP 67; 20/20; n=20 | 66.7 [66.7, 67.6]; AHP 66; 20/20; n=20 | 68.4 [66.6, 69.6]; AHP 68; 20/20; n=20 | 70.7 [70.7, 71.7]; AHP 70; 20/20; n=20 |
| mimalloc, off | 0.6 [0.6, 0.7]; AHP 0; 0/10; n=10 | 64.8 [64.7, 64.8]; AHP 0; 0/10; n=10 | 32.6 [32.6, 32.7]; AHP 0; 0/10; n=10 | 4.7 [4.6, 4.7]; AHP 0; 0/10; n=10 | 29.9 [29.9, 29.9]; AHP 0; 0/10; n=10 |
| musl, on | 1.9 [1.9, 2.0]; AHP 0; 0/10; n=10 | 83.8 [83.8, 83.8]; AHP 80; 10/10; n=10 | 34.3 [34.2, 34.3]; AHP 0; 0/10; n=10 | 6.0 [6.0, 6.0]; AHP 0; 0/10; n=10 | 36.1 [36.0, 36.1]; AHP 0; 0/10; n=10 |
| musl, off | 2.0 [1.9, 2.0]; AHP 0; 0/10; n=10 | 83.7 [83.7, 83.8]; AHP 0; 0/10; n=10 | 34.3 [34.3, 34.3]; AHP 0; 0/10; n=10 | 6.1 [6.0, 6.1]; AHP 0; 0/10; n=10 | 36.1 [36.0, 36.2]; AHP 0; 0/10; n=10 |
| jemalloc-thpnever, on | - | - | 5.3 [5.3, 5.3]; AHP 0; 0/10; n=10 | - | - |
| glibc-hugetlb1, on | - | - | 80.4 [80.3, 80.5]; AHP 80; 10/10; n=10 | - | - |
| mimalloc-largepages, on | - | - | 67.6 [66.7, 68.6]; AHP 67; 20/20; n=20 | - | - |

A/A: glibc `on` 128 KiB copy against original ratio 1.000 [0.999, 1.001] (20 vs 10 blocks); mimalloc `on` 128 KiB copy against original 1.013 [0.999, 1.030] (20 vs 20): the mimalloc intervals are wide because its settled value moves in 2 MiB steps between 66.6 and 72.7 MiB; it is a level with that spread, and the intervals above are the honest resolution.

Per allocator, forced arm (the modes in which the natural arm agrees, below, are `on` and `off`):

- **glibc**, `on`: collapses to 80 MiB AHP at strides 32, 128 and 1024 KiB (64.6 MiB for the mixed shape, 20 MiB even with no survivors at all). `off`: nothing (AHP 0; anon 1.3-8.4 MiB, the plain residue). `hugetlb=1` under `on`: no change (80 MiB).
- **jemalloc**, `on`: 76.6-76.7 MiB at every stride and the mixed shape (14.6 MiB with no survivors); already 10 MiB AHP at release. `off`: 3.3-11.3 MiB, AHP 0. `MALLOC_CONF=thp:never`: 5.3 MiB, AHP 0 at release and at the reading.
- **mimalloc**, `on`: 66.7-70.7 MiB (35.6 MiB at stride 0, a rate: 19/20 collapse); `off`: 0.6-64.8 MiB, AHP 0 (its 64 KiB page granularity alone holds 32.6 MiB at 128 KiB stride and 64.8 MiB at 32 KiB stride, with or without THP). `allow_large_os_pages=1`: no change.
- **musl**, per stride: 32 KiB: collapses to 80 MiB AHP (anon 83.8 MiB; `off` 83.7 MiB, so musl already holds 84 MiB without THP at that density); 128 KiB: 34.3 MiB, AHP 0; 1024 KiB: 6.0 MiB, AHP 0; mixed at 128 KiB: 36.1 MiB, AHP 0; stride 0: 1.9 MiB. No THP-mode difference at 128 and 1024 KiB.

### Forced against natural, per mode (agreement and claim coverage)

The natural arm is indicative (2 blocks per cell, unpinned); its table is carried unchanged from the first run in `results/summary.md`. It was produced by the earlier harness version, so natural collapsing `on` cells never carried the harness artifact that the forced arm initially had (fixed, see Validity).

- `on`: **agree** for glibc (natural 80.1 MiB, forced 80.4), mimalloc (natural 66.4 at the low end of the forced 66.6-72.7 spread) and musl (no growth by the second increment at 128 KiB, matching forced 34.3 and no eligible span). **jemalloc: unresolved at the rollup, agreeing per mapping.** Natural reads 80.3 MiB anon (AHP 80.0), forced 76.6 (AHP 76). The two arena mappings end identical in both arms (61440 and 12288 KiB of AHP per mapping, from the smaps dumps); the difference is jemalloc's 8 MiB metadata base block, which is already huge at release in both natural blocks (8 MiB) and 4 MiB in all ten forced blocks (`src/base.c` `base_block_alloc` uses huge-page sizes and alignment; its size at start-up differs between the two arms, cause not isolated: the arms differ in concurrency and pinning). Treat the jemalloc `on` level as 76-80 MiB, mapping-level agreement, rollup unresolved by 4 MiB, 2 natural blocks.
- `off`: **agree** for all four (AHP 0, no growth). Forced `off` is a claim: no AHP growth after the control set before start-up; no `off` block had pre-existing AHP.
- `advised`: **no forced claim** (`MADV_COLLAPSE` is itself advice). Natural, indicative: no block of any allocator was grown by the second khugepaged increment (`advised` and the native controls alike); worded "not grown by the second khugepaged increment", not "no re-collapse".

## Why (B): which mappings collapse

Mechanism notes with source anchors (glibc 2.41, jemalloc 5.3.0, mimalloc 3.0.1, musl 1.2.5, unmeasured where marked): [notes.md](notes.md) "Question B". In short:

- **glibc**: a worker thread's arena is one 64 MiB-aligned heap (`malloc/arena.c` `new_heap`, `grow_heap`); `malloc_trim(0)` frees pages with `MADV_DONTNEED` and never unmaps the heap (`malloc/malloc.c` `mtrim`), so a 64 MiB mapping with 1.6 MiB resident is one collapsible span; collapse fills the empty PTEs around each survivor (`max_ptes_none=511`), so the whole mapping, about 80 MiB with the second heap, becomes huge. Even stride 0 collapses to 20 MiB.
- **jemalloc**: retained extents inside 64-66 MiB mappings plus a 4 MiB metadata block (`src/base.c` `base_block_alloc`, `src/pac.c` `pac_decay_stashed`, `src/pages.c` `pages_purge_lazy`); under `on` AHP is already 10 MiB at release because the purge splits a huge page only when it purges a sub-range. After collapse the extent mappings hold 61 and 12 MiB of AHP. `thp:never` sets `MADV_NOHUGEPAGE` on every extent (`pages_set_thp_state`), so no mapping is eligible.
- **mimalloc**: one 1 GiB arena mapping with 64 KiB pages carved from it (`src/arena.c`); `mi_collect(true)` decommits free pages with `MADV_DONTNEED` (`src/prim/unix/prim.c` `_mi_prim_decommit`), leaving about 34 MiB resident; the mapping is one collapsible span and about 70 MiB of it becomes huge.
- **musl**: no release call and `USE_MADV_FREE` is 0, groups are mmapped individually when usage is low (`src/malloc/mallocng/malloc.c` `alloc_group`, `free.c` `nontrivial_free`); at 128 and 1024 KiB each survivor pins a separate ~64 KiB mapping with no 2 MiB-aligned span (514 mappings), at 32 KiB the groups are adjacent, the kernel merges the VMAs into one 83.7 MiB mapping and it collapses fully.

## Cost (C): CPU of the burst (standard; within-run A/B only)

10 repetitions of the 64 MiB burst per thread under `scripts/cpuprobe.sh` (stride 0, no survivors), one container per block, 1 thread on CPU 6 (sibling 18), 4 threads on CPUs 6-9, sequential and interleaved, 20 blocks per cell. Task-clock ms, median [95% bootstrap interval], raw (the zero-work controls are 0.4-2.3 ms, under 1% of the burst); `instructions_u` in millions.

|---|---|---|---|---|---|
| glibc | on | 341.7 [340.2, 346.7] | 2075.0 [2046.8, 2097.1] | 4598 [4598, 4598] | 18394 [18392, 18400] |
| glibc | off | 553.7 [551.2, 558.3] | 2902.4 [2850.1, 2962.0] | 4598 [4598, 4598] | 18395 [18393, 18403] |
| jemalloc | on | 217.4 [216.7, 219.0] | 1025.3 [1017.8, 1041.6] | 3248 [3248, 3248] | 12994 [12993, 12996] |
| jemalloc | off | 433.9 [430.4, 439.2] | 1838.6 [1827.6, 1849.5] | 3251 [3251, 3251] | 12977 [12971, 12980] |
| mimalloc | on | bimodal: fast 3/20 (133.3..158.7), slow median 228.0 (221.2..252.7) | bimodal: fast 1/20 (1078.7..1078.7), slow median 1271.0 (1194.6..1563.1) | 1223 [1223, 1223] | 4894 [4894, 4894] |
| mimalloc | off | 356.5 [354.3, 358.5] | 1520.3 [1499.7, 1538.2] | 1224 [1224, 1224] | 4894 [4894, 4895] |
| musl | on | 552.0 [547.9, 554.6] | 20297.9 [19910.3, 20729.9] | 3828 [3828, 3828] | 17135 [17113, 17176] |
| musl | off | 574.9 [572.3, 577.0] | 19735.9 [19551.3, 19835.6] | 3828 [3828, 3828] | 17106 [17073, 17123] |

Within-run A/B verdicts (`methods/timing.md` R6-R8, A/A floor from a glibc `on` 1-thread copy: ratio 0.999 [0.983, 1.020], half-width 0.019):

- THP `on` against `off`, task-clock ratio of medians (`on`/`off`): glibc 0.617 [0.611, 0.628] at 1 thread and 0.715 [0.697, 0.731] at 4; jemalloc 0.501 [0.495, 0.507] and 0.558 [0.552, 0.568]; mimalloc slow mode 0.639 [0.630, 0.650] (1 thread) and 0.836 [0.818, 0.855] (4 threads), the 1-thread fast mode (3 of 20 blocks) 0.412; musl 0.960 [0.951, 0.966] at 1 thread (faster by 4%) and 1.028 [1.007, 1.052] at 4 threads (slower by 3%, marginal above the 0.019 floor). Instructions retired are equal to within 0.2% in every pair: the saving is page-fault and kernel time (a refault-heavy loop pays 4 KiB faults under `off`), not fewer instructions.
- Against glibc, same mode and threads: jemalloc 0.64x (`on`, 1 thread), mimalloc 0.67x (medians), musl 1.62x (1 thread) and 9.8x (4 threads, `on`).
- **musl multithreaded**: 4 threads cost 36.8x (`on`) and 34.3x (`off`) the 1-thread task-clock for 4x the work (ratio of medians; 4.00 would be linear), against 4.2-6.1x for the other three; its `instructions_u` is 17.1e9 against 4 x 3.83e9, so the extra CPU is mostly spinning on its single shared heap lock, not THP.
- mimalloc `on`: the fast mode is a rate: 3 of 20 blocks at 1 thread (Clopper-Pearson [0.03, 0.38]; 133-159 ms against a slow cluster of 221-253 ms) and 1 of 20 at 4 threads ([0.00, 0.25]); cause not investigated.
- `sibling_busy` (busy fraction of the sampled sibling CPU): burst cells median 0.0-0.1, maxima to 0.44 in the 4-thread cells; the host was not fenced, so no absolute CPU time is compared across runs.

## What a service can set, per allocator

| allocator | native control | effect on this host (THP `always`) | per-process `PR_SET_THP_DISABLE` before start-up |
|---|---|---|---|
| glibc 2.41 | `GLIBC_TUNABLES=glibc.malloc.hugetlb=1` | inert: it only issues `MADV_HUGEPAGE` when the system mode is `madvise` (`malloc/malloc.c` `do_set_hugetlb`); forced `on` unchanged at 80 MiB | works (AHP 0) |
| jemalloc 5.3.0 | `MALLOC_CONF=thp:never` | works: `MADV_NOHUGEPAGE` on every extent, AHP 0 at release and at the reading | works |
| mimalloc 3.0.1 | `allow_large_os_pages` (opt-in) | no opt-out exists: the code path that calls `prctl(PR_SET_THP_DISABLE)` only runs when THP is already disabled (`src/prim/unix/prim.c` `_mi_prim_mem_init`); setting it to 1 is the opposite (opt-in, inert here: no huge-page flags on its mappings) | works |
| musl 1.2.5 | none (no THP code) | none | works (but 128/1024 KiB survivors are unaffected anyway) |

The per-process switch must be set before the allocator initialises (the control is inherited across `execve`: a launcher or a service manager's own setting does that; a late `prctl` leaves jemalloc's metadata block already huge). The host switch (`/sys/kernel/mm/transparent_hugepage/enabled`) and khugepaged tuning were not varied.

## Validity threats

- One host, one kernel (7.2.12), one image (Debian 13, pinned), one synthetic workload (64 B objects, one thread bursts per worker, 64 MiB), one night of runs. Real services differ: object sizes, lifetimes, thread counts.
- Host sysfs (`enabled`, `defrag`, `max_ptes_none`, scan rate) was not varied and cannot be without root. `MADV_COLLAPSE` ignores `max_ptes_none`, so the forced arm models `max_ptes_none=511`, the most permissive setting. What a lower value would do is read from kernel source (`mm/khugepaged.c`, `hpage_collapse_scan_pmd`, named `khugepaged_scan_pmd` before Linux 6.1: on the khugepaged path a range with more empty PTEs than `max_ptes_none` is not collapsed, while `MADV_COLLAPSE` skips that limit) and is **unmeasured**: with the kernel default 511 never rejects a range, with 0 a range holding a survivor and empty PTEs would not collapse.
- The forced arm is a model of khugepaged's end state, not khugepaged. The natural arm is its only check (2 blocks per cell, unpinned, indicative): agreement for `on` and `off`, jemalloc unresolved at rollup level (above), `advised` indicative only. When a scan would reach a process (the first increment arrived 14-17 min after release here) is host state; the 6% against 27% of the downstream nights is a plausible but untested consequence.
- No CPU fencing (the user systemd manager does not delegate `cpuset`, no root): other slices could run on the measured CPUs, so Question C claims are within-run A/B verdicts, never absolute CPU time across runs; 4-thread cells' sibling probe covers one of four siblings.
- Harness artifact, fixed before the claim runs: the harness's own static smaps tables made its 3.4 MiB data mapping collapse (+2.0 MiB AHP in every collapsing `on` run); the claim rows are produced by the fixed harness (image tag `thp-recollapse:2`). Pilot rows come from the earlier harness, are excluded from all intervals and read 2 MiB higher in collapsing `on` cells.
- mimalloc's `on` level spans 66.6-72.7 MiB in 2 MiB steps; its A/A interval is the measured resolution.

## Setup and dependencies

- Docker (29.10.0 here) with permission to run containers and add `PERFMON` and `SYS_ADMIN` capabilities (Question C runs `perf stat` inside the container) and a host kernel with `perf_event_open` allowed; `--memory 1g` per container.
- Image: `docker build -t thp-recollapse:2 thp-recollapse-allocators`. Base `debian:trixie-slim` pinned by digest (`sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4`); packages (versions recorded in the image's `/versions.txt`): gcc-14 14.2.0-19, libc6 2.41-12+deb13u4 (glibc), libjemalloc2 5.3.0-3 (with `libjemalloc-dev`), libmimalloc3 3.0.1+ds-2.1 (with `libmimalloc-dev`), musl 1.2.5-3.1~deb13u1 (with `musl-tools`), linux-perf 6.12.117-1 (perf 6.12.117), `libc6-dev`. The binary is built four times from `src/thp.c` (`-O2 -pthread`; musl static).
- Host: bun (1.4.4 here; the drivers use only bun and the repo's `scripts/`, no packages, no network), a kernel with THP and khugepaged sysfs files readable (here `enabled=[always]`, `defrag=[madvise]`, `max_ptes_none=511`, `pages_to_scan=4096`, `scan_sleep_millisecs=10000`; all recorded per row), 24 logical CPUs with SMT siblings n and n+12 and CPUs 6-9, 18-21 free for the pinned lanes (the lane layout is in `run.mjs`; edit it for another topology). The runs used about 3 container-hours: forced arm about 28 min wall, Question C about 11 min.
- Re-run: `bun thp-recollapse-allocators/run.mjs claim-forced --out DIR`, `claim-cpu --out DIR` (provenance `claim`, defaults are the counts above), `natural-wave --out DIR` (about 1 h), one cell by hand with `run.mjs one --alloc glibc --thp on --stride-kb 128 --collapse`, and `run.mjs summary --forced F --cpu C --natural N --out results/summary.md` regenerates the summary. Row files: `results/claim-forced.jsonl`, `claim-cpu.jsonl`, `natural.jsonl`, pilots `pilot-forced.jsonl`, `pilot-cpu.jsonl` (provenance `pilot`, excluded).
- Smoke check: one `on` stride-128 `--collapse` cell per allocator re-run into a clean directory reads inside the claim envelope per observation: anon settled at 10 s glibc 80.35-80.46 MiB, jemalloc 76.55-76.64, mimalloc 66.58-72.65, musl 34.24-34.35 (AHP at the reading 80, 76, 66-72 and 0 MiB).

## Credits

- [glibc-arena-retention](../glibc-arena-retention/) in this repo: the image-pinning pattern, the release mechanics of `malloc_trim` and the question this follows.
- crucible-vault findings `docs/spikes/arena-late-growth/WP-1-FINDINGS.md` and `WP-3-FINDINGS.md`: the downstream arena re-growth this study isolates.
- glibc (`malloc/arena.c`, `malloc/malloc.c`), jemalloc (`src/base.c`, `src/pac.c`, `src/pages.c`), mimalloc (`src/arena.c`, `src/prim/unix/prim.c`), musl mallocng (`src/malloc/mallocng`) and the Linux kernel transparent hugepage documentation and `mm/khugepaged.c`.
