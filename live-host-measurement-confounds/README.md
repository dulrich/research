# Which live-workstation confounds matter for which measurement class

On a live 12-core desktop workstation (AMD Ryzen 9 7900X, Debian 13), instruction counts and same-cell CPU-bound ratio verdicts are unaffected by any load tested, while page-cache reads, tail latency and absolute CPU time are biased by specific loads that CPU pinning, CCD fencing and frequency controls do not remove (memory-bandwidth load doubles warm page-cache reads and adds about 14% to a daemon's p95 latency at every isolation level). The crucible-vault allocator "bad mode" is intrinsic: it appears in 35-75% of quiet blocks on both the workstation and a quiet tuned laptop, so no live-host procedure would have protected those memory spikes; only reporting its rate over many blocks does. The resulting procedure is [methods/live-host.md](../methods/live-host.md).

## Question

Fleet spikes measure on a live developer workstation, protected only by an unenforced "no other build during the blocks" rule and PSI labelling. Which confounds of such a host bias a result, which only add noise, and which runtime controls restore quiet-machine quality, per measurement class? And would a standard live-host procedure have protected the crucible-vault memory spikes, whose allocator "bad mode" (settled anon 84-103 MiB against about 65) also appeared in clean blocks?

## Answer in one table (confound map)

Primary metric per class; ratio = loaded cell over the same night's quiet cell at the same isolation level, 95% bootstrap CI, classified per the rule below. Isolation: I0 none, I2 measurement on CCD1 and everything else fenced to CCD0, I3 = I2 plus EPP `performance` and boost off on CCD1. Load: L1 CPU saturation, L2 LLC plus memory bandwidth, L3 memory pressure (about 12 GB held), L4 disk writes with fsync. A dash means the class was not run in that cell (trimmed for time, never for a class as a whole). Source: `results/analysis/contrasts.tsv` (kind `load`), `summary.md`. Rigor: standard protocol per cell (methods/timing.md), one loaded cell per condition.

| class (metric) | L1 CPU | L2 LLC + bandwidth | L3 memory pressure | L4 disk writes |
|---|---|---|---|---|
| K1 absolute (ns/row, c-gcc-O2) | I0 **bias** 1.065 [1.022, 1.118]; I2 unres. 1.008 [0.949, 1.052]; I3 unres. 0.989 [0.943, 1.029] | I0 unres. 1.064 [0.984, 1.108]; I2 unres.; I3 unres. | unres. at I0, I2, I3 (points 0.99-1.03) | unres. at I0, I2, I3 (points 0.99-1.01) |
| K1 ratios (ratio of group ratios) | unresolved at every level (CI about +/-5%, size that matters 2%) | unresolved | unresolved | unresolved |
| K1 verdicts (R8, within a cell) | unchanged in every cell | unchanged | unchanged | unchanged |
| K5 instructions/row | no measurable effect (CI +/-0.0001%) at I0, I2, I3 | no measurable effect | no measurable effect | no measurable effect |
| K2 tail latency (view p95) | I0 no effect 1.002 [0.989, 1.018]; I2 no effect 0.998 [0.976, 1.014] | I0 **bias** 1.135 [1.116, 1.151]; I2 **bias** 1.142 [1.110, 1.185] | - | - |
| K3 memory (settled anon, 30 s idle) | - | - | unres. at I0 0.919 [0.847, 1.029], I2 1.058 [0.945, 1.262], I3 1.023 [0.834, 1.218] | - |
| K3 memory (settled anon, 120 s idle) | - | - | I2 unres. 1.003 [0.799, 1.147] | - |
| K3s allocator churn (settled RSS) | no effect at I0, I2, I3 | I0 bias 0.998 (below size that matters); I2, I3 no effect | no effect | - |
| K4 warm page-cache read | no effect at I0, I2, I3 | **bias** I0 2.03 [1.91, 2.10], I2 1.92 [1.89, 1.94], I3 1.90 [1.89, 1.92] | I0 **bias** 1.243 [1.168, 1.288]; I2 bias 1.059 (below size that matters); I3 no effect 1.064 | no effect at I0, I3; noise only at I2 |
| K4 cold read (after cache drop) | - | - | no effect at I0, I2, I3 | **bias** I0 1.123 [1.091, 1.207], I2 1.286 [1.195, 1.372], I3 1.437 [1.329, 1.535] |

What the controls change by themselves (quiet cells; `results/analysis/k1-within-night.tsv`, within one night, standard): pinning to one CPU (I1) costs K1 absolute time 4.9% [1.8, 9.0] (night 3); fencing (I2) 4.0% [1.4, 7.8] in night 1 and an unresolved 5.1% / 5.4% in nights 2 and 3; boost off (I3) 18.5% [13.7, 22.8], 20.1% [12.5, 24.7] and 20.6% [15.8, 26.2] in the three nights. None of them moves the K1 group ratios by a resolvable amount, and K1 verdicts are the same at every level.

## Method

Every class is acquired through `scripts/measure.mjs` under the repository timing standard (methods/timing.md): each class is a driver variant emitting `MEASURE` lines, at least 10 invocations per variant per cell after warm-up, a seeded interleaved order, an A/A pair per class, and an `env.json` per class run. An invocation is one independent process (K2/K3: one fresh `cv` daemon block). The 0.5 s sampler records PSI, `MemAvailable`, per-CCD utilisation and the measured CPU's frequency for every cell.

- **Classes.** K1: the round-5 `mixed` workload of [sqlite-parse-number-rust-tuning](../sqlite-parse-number-rust-tuning/), reduced to five groups (`c-gcc-O2` baseline, `c-gcc-O3-pgo` and its A/A copy, `safe-std-gcc-o2`, `raw-nostd-gcc-o2`) of six layout builds each. K2: crucible-vault scenario B (40 s job replay with pipelined view passes), view p95 and daemon CPU. K3: crucible-vault scenario A (3 view passes, then idle), settled and peak `RssAnon`, at 30 s idle (`k3`) and at the historical 120 s idle (`k3-120`). K3s: a small public 12-thread allocator-churn program (`src/k3s.c`). K4: page-cache reads, warm and cold (cold = after `drop_caches`, only while the user is away). K5: instructions retired from K1.
- **Design.** Fractional, not factorial: every isolation level at L0; I0 and I2 under the user's real day load (`Llive`); I0, I2, I3 under L1-L4 for the classes each load plausibly affects. Three night windows (I0 in night 1, I2 in night 2, I1 and I3 in night 3), each opening and closing with quiet reference cells, plus K1-only quiet cells of the other levels so the controls' own effect on K1 can be estimated within each night. Laptop: quiet, tuned as in round 5, K2/K3/K3s; K1 reuses round 5's standard-rigor data unchanged.
- **Contrasts** (`analysis/analyze.mjs`). Load effect at I*x* = metric in the loaded cell over the same night's I*x*·L0 full cell. Controls' own effect: I*x*·L0 over I0·L0; for K1 within each night from the pooled ref-start and ref-end cells, for the other classes across nights (reported beside the K1 night shift, never as a pure control effect). `Llive`: day cell over the same level's night quiet cell, observational only. Medians with 10,000 seeded bootstrap resamples; K1 contrasts resample the six layout builds once per replicate and share them between the two cells (the same builds run in every cell, and layout is K1's largest variance component); within-cell K1 verdicts use the driver's own independent hierarchical bootstrap so they compare with round 5's report.
- **Classification** (per class x isolation level; `analysis/stats.mjs`). *Bias*: CI excludes 1 and the shift exceeds the floor, where floor = the larger of either cell's A/A ratio-CI half-width and the spread between the same level's quiet cells in its home night (R8 applied to a load effect). *Bias (below size that matters)*: a resolved bias smaller than the size below. *Noise only*: no bias, but the cell's relative IQR is at least twice the reference's and at least half the size that matters. *No measurable effect*: no bias and the whole CI within +/- the size that matters. *Unresolved at measured resolution*: otherwise.

### Thresholds and reference choices (choices, not measured)

- Effect size that matters: K1 absolute 3% and K1 ratios 2% (methods/timing.md calls a separation of "a few percent" standard-rigor territory; round 5's closest verdicts sit 3-4% apart); K5 1%; K2 10% (the slowdown size Laaber et al. detect on cloud hosts); K3 10% (the reference bad mode is about +30% over the normal ~65 MiB, so 10% resolves a third of it); K3s 5%; K4 10%.
- Bad mode: settled anon above 75 MiB, the boundary coded in `cvblock.sh` from the crucible-vault memory-release spike, whose normal blocks settle near 65 MiB and bad-mode blocks at 84-103 MiB.
- Reference cell: the `L0-full` cell of the same isolation level in the same night (I0 night 1, I2 night 2, I1 and I3 night 3); it is the only quiet cell that carries every class. Repetition spread comes from that night's ref-start, full and ref-end cells of the same level.
- Noise-only factor 2 on relative IQR, and the half-size-that-matters guard against flagging a doubled but negligible spread (K5's instruction counts).

## Results per class

All numbers below are ratios of medians with 95% bootstrap CIs from the tables named; "standard" = the full methods/timing.md protocol inside each cell, one cell per condition; "indicative" = crosses nights (and a kernel update), so it cannot separate a control effect from a night effect.

**K5 instructions retired** (`contrasts.tsv`, standard). No load, isolation level or day load moves instructions per row: every CI lies within 1.000000 +/- 0.000001. The controls' contrasts read 0.999997 (a resolved but 0.0003% shift, below the 1% size that matters). The group instruction ratios equal the laptop's to six digits (c-gcc-O3-pgo 0.956305, raw-nostd-gcc-o2 0.961705, safe-std-gcc-o2 1.118954; `k1-verdicts.tsv`). Instruction counts are safe on a live host.

**K1 CPU-bound ratios** (`k1-verdicts.tsv`, standard). The R8 verdict set is identical in all 38 workstation cells, quiet, loaded, live, at every isolation level: c-gcc-O3-pgo faster than c-gcc-O2 (about 0.83-0.87), safe-std-gcc-o2 and raw-nostd-gcc-o2 no measurable difference. Across cells, the ratio of group ratios is unresolved everywhere: CIs span about +/-5% while 2% matters (`contrasts.tsv`, `k1-ratio:*`). So a live host does not flip K1 verdicts at the loads tested, but one cell's K1 ratios cannot be compared with another cell's below about 5%.

**K1 absolute time** (standard within a night). CPU saturation at I0 adds 6.5% [2.2, 11.8]; at I2 and I3 the same load gives 0.8% and -1.1% with CIs of about +/-5%, which is unresolved, not protective. The controls themselves move absolute time more than any load: +4-5% for pinning or fencing, +19-21% for boost off (table above). Absolute times are comparable only within one isolation level.

**K2 tail latency** (standard). Memory-bandwidth load (L2) raises view p95 by 13.5% [11.6, 15.1] at I0 and 14.2% [11.0, 18.5] at I2: fencing the antagonist onto the other CCD (separate L3) does not remove it, which is consistent with the memory path the two CCDs share (an interpretation; no bandwidth counter was recorded). CPU saturation (L1) has no measurable effect at I0 or I2. Daemon CPU time is "noise only" under L1 and L2 at I0 and under L1 at I2 (wider spread, no resolved shift). K2 was not run in L3/L4 cells nor in I3 loaded cells (trimmed for time).

**K3 crucible-vault memory** (`badmode.tsv`, `contrasts.tsv`). Settled anon is bimodal, so its median contrasts are unresolved everywhere (A/A floors of 13-26%). The bad-mode rate per cell (Clopper-Pearson 95%):

| cell | idle | bad / n | rate | 95% CI |
|---|---|---|---|---|
| workstation I0 quiet (night 1) | 120 s | 7 / 20 | 0.35 | [0.15, 0.59] |
| workstation I2 quiet (night 2) | 120 s | 13 / 20 | 0.65 | [0.41, 0.85] |
| workstation I2 memory pressure (night 2) | 120 s | 13 / 20 | 0.65 | [0.41, 0.85] |
| laptop quiet, tuned | 120 s | 15 / 20 | 0.75 | [0.51, 0.91] |
| workstation nights pooled | 120 s | 33 / 60 | 0.55 | [0.42, 0.68] |
| workstation I0 quiet / I0 memory pressure | 30 s | 18 / 20, 16 / 20 | 0.90, 0.80 | [0.68, 0.99], [0.56, 0.94] |
| workstation I2 quiet / I2 memory pressure | 30 s | 17 / 20, 18 / 20 | 0.85, 0.90 | [0.62, 0.97], [0.68, 0.99] |
| workstation I1 quiet / I3 quiet / I3 memory pressure | 30 s | 16, 14, 16 / 20 | 0.80, 0.70, 0.80 | [0.56, 0.94], [0.46, 0.88], [0.56, 0.94] |
| workstation day, I0 / I2 (observational) | 30 s | 10 / 20, 15 / 20 | 0.50, 0.75 | [0.27, 0.73], [0.51, 0.91] |
| laptop quiet, tuned | 30 s | 12 / 20 | 0.60 | [0.36, 0.81] |
| workstation nights pooled | 30 s | 115 / 140 | 0.82 | [0.75, 0.88] |

At 30 s idle most blocks have not released yet (the 30 s rates are higher at every level), so only the 120 s rows measure the historical bad mode. The bad mode appears on a quiet, tuned 2-core laptop as often as on the workstation, and memory pressure leaves the rate unchanged within the interval resolution (I2 0.65 quiet vs 0.65 loaded). Twenty blocks per cell resolve a rate difference of only about 0.4, so a smaller load effect on the rate is unresolved, not excluded. CPU and bandwidth loads were not combined with K3 (trimmed), so the effect of a concurrent build on the memory class is unmeasured.

**K3s allocator churn** (standard). Settled RSS moves by at most 0.2% under any load or control (no effect or a resolved bias below the 5% that matters); 13 arenas everywhere, on both hosts. A synthetic allocator workload with a fixed thread count is not host-sensitive here.

**K4 page-cache reads** (standard). Warm reads are memory-bandwidth bound: L2 doubles them at every isolation level (2.03, 1.92, 1.90). Memory pressure slows warm reads by 24% at I0, less at I2 (5.9%, below the size that matters) and not measurably at I3. Disk writes slow cold reads by 12% (I0), 29% (I2) and 44% (I3). No control removes either effect. The I3 warm-read floor is wide (repetition spread 41% between night 3's quiet I3 cells), so I3 warm-read "no effect" rows are weak.

**Controls across nights** (`contrasts.tsv` kind `controls-crossnight`, indicative). For the classes that only ran in full quiet cells, I*x*·L0 against I0·L0 crosses nights and, for I1/I3, a kernel update (7.2.11 to 7.2.12). The K1 quiet reference of the same level moved by at most 1.3% between nights (unresolved; `k1-within-night.tsv`, kind `k1-night-shift`). Cold reads are 11% faster at I2 (night 2) and 22% faster at I3 (night 3), warm reads 10.5% slower at I3, K2 p95 3.4% faster at I1 and 6.6% slower at I3: these are night-or-kernel-or-control differences and are not attributed to the controls.

**Llive** (observational: day cells against night quiet cells; `contrasts.tsv` kind `llive`). With the user working normally, K1, K2, K3s and K5 show no measurable effect or unresolved shifts; warm page-cache reads were 50% slower in the I0 day cell and not measurably slower in the I2 day cell. The two day cells had different user activity (CPU pressure median 0.00 at I0, 1.06 at I2), so this says what a working day did on those two afternoons, not that a control restores quiet quality.

**Laptop vs workstation** (`laptop.tsv`, descriptive host-topology factor). The 2C/4T laptop is 4.3x slower on K2 p95 and 2.5x on K3 view p95, and uses 1.36x the daemon CPU on K2 and 2.7-2.8x on K3; its peak anon is about 19% lower and its 120 s settled anon not lower (1.20 [1.04, 1.38] against I0, 1.04 [0.97, 1.20] against I2). K3s builds 13 arenas on both hosts, so the arena cap (32 vs 192) is never reached by the 12-thread program. K1 verdicts agree with round 5 except one: round 5 calls safe-std-gcc-o2 faster (0.888 [0.852, 0.973]), the workstation calls it no measurable difference with a similar point (0.86-0.92) and a wider CI.

**PSI as a label** (`hosttrace.tsv`, `hosttrace-class.tsv`). The fenced quiet references (I1/I2/I3 with K3s) show cpu PSI `some` medians of 17-18 and maxima near 45, while I0 references sit near 0. The per-class split shows where it comes from: during the K3s segment the cpu PSI median is 23.5-25.9 at I1/I2/I3 and 0.00 at I0, and during K1 it is 2.0-2.8 at every pinned level (I1 included, which fences nothing). The pressure is the measured workload's own: 12 K3s threads on the 6-CPU cpuset, and the K1 driver queueing on its pinned CPU. Host-wide cpu PSI therefore is not a quiet-host label once the measurement is pinned: it must be read per class, against that class's quiet value at the same isolation level.

## Would the standard live-host procedure have protected the crucible-vault memory spikes?

No. The bad mode is intrinsic to that `cv` build: at the historical 120 s idle it appears in 35% [15, 59] of quiet unpinned blocks, 65% [41, 85] of fenced quiet blocks and 75% [51, 91] of blocks on a quiet, tuned laptop, and memory pressure leaves the rate unchanged within resolution, so pinning, fencing or a quiet host cannot remove it. What protects such a spike is replication and reporting: a bad-mode rate with a binomial interval over at least 20 blocks per condition, per-block numbers never, the idle window stated, and contended blocks (whose effect on this class is unmeasured here) labelled and reported rather than dropped.

## Limitations

- The guard-trip path (`MemAvailable` < 4 GB or memory `full` avg10 > 5) was never exercised; the highest memory `full` was 2.12 and `MemAvailable` stayed above 39 GB.
- The workstation rebooted into kernel 7.2.12 before night 3 (nights 1-2: 7.2.11). Any contrast that crosses nights may be a kernel or a night effect.
- `Llive` is observational: day cells and night references differ in time of day, user activity and page-cache state.
- One workstation, one laptop, one `cv` build (the historical bad-mode reference build), one loaded cell per condition. Loaded-cell K2/K3 trims mean some class x load cells are absent (dashes above).
- Cold reads on the day cells use a local-file eviction (`k4-cold-local`), the nights a whole-cache drop (`k4-cold`), so `Llive` has no cold-read contrast.
- The laptop runs shared the workstation's ssh client with the first day cells; their load was not separated from the user's.

## Follow-up: kernel-cmdline isolation

`isolcpus` / `nohz_full` / `rcu_nocbs` were not run (they need reboots). The residuals that remain after runtime fencing are memory-bandwidth (K2 +14%, K4 warm x1.9 at I2/I3) and disk (K4 cold +29-44%); neither is a scheduler-tick or CPU-sharing effect, so boot-time CPU isolation is not expected to remove them. It is worth testing only if a future class shows a CPU-contention residual at I2 that runtime fencing leaves, which the current K1 data cannot show (unresolved at about +/-5%).

## Setup and dependencies

- Docker (the images below are built or loaded locally; no host package is installed for the experiment).
- `lhmc-r5`: the toolchain image of the round-5 investigation (`sqlite-parse-number-rust-tuning`), used for the K1 CPU-bound class; copied from the machine it was built on with `docker save | docker load` and checked against the image id in that investigation's results.
- `lhmc-stress` (`docker/stress.Dockerfile`): Debian 13 slim plus `stress-ng`, the synthetic antagonists.
- `lhmc-bench` (`docker/bench.Dockerfile`): Debian 13 slim plus full `perl` and `ca-certificates`, the container for the `cv` daemon blocks and the allocator and page-cache programs.
- Rust toolchain (Debian 13 `cargo`/`rustc`) to build the `cv` daemon of the public crucible-vault repository at a pinned commit (`38f52df8`), plus its sibling `semsearch` checkout.
- `gcc` (Debian 13) to build `src/k3s.c` (allocator churn) and `src/pagecache.c` (page-cache reads) into `var/`; they run in the Debian 13 bench container (same glibc as the host).
- `bun` (1.4) for the repository driver `scripts/measure.mjs`, the config and schedule generators and the analysis; POSIX `sh` and `awk` for the controller, cell runner and sampler (`perl` for the daemon request client).
- Root access for the host controls goes through a short-lived privileged container (`nsenter` into the host namespaces); the controller restores every setting and reads it back.
- The analysis needs only `bun` and the committed results (plus `sqlite-parse-number-rust-tuning/results/round5/mixed/raw.jsonl`); no network, no dependencies.

## Harness layout (frozen)

- `ctl` (condition controller), `cell` (one cell: apply, sample, run classes, record, restore, read back), `sampler.sh` (0.5 s PSI/memory/CCD/frequency sampler), `k1.sh` (K1 container), `runk.sh` and `cvblock.sh` (K2/K3 daemon blocks, K3s, K4; `k3-120` is K3 with a 120 s idle window), `client.pl`, `src/` (allocator-churn and page-cache programs), `docker/` (image recipes).
- `configs/*.json` are the per-class `scripts/measure.mjs` configs (generated by `gen-configs.mjs`); `schedule.json` is the frozen cell schedule (generated by `gen-schedule.mjs`).
- `analysis/analyze.mjs` and `analysis/stats.mjs`: the analysis; `results/analysis/` holds its generated tables.
- Build the helper programs with `gcc -O2 -pthread -o var/k3s src/k3s.c` and `gcc -O2 -o var/pagecache src/pagecache.c`; build the images with `docker build -t lhmc-stress -f docker/stress.Dockerfile docker` and `docker build -t lhmc-bench -f docker/bench.Dockerfile docker`.

## Reproduce

- Measurement: `sh live-host-measurement-confounds/cell run <cell> [--afk]` per cell of `schedule.json`, from the repository root (night cells only while the host's user is away; the controller restores and reads back after every cell). Results land under `results/<window>/<cell>/`.
- Analysis (from the repository root): `bun live-host-measurement-confounds/analysis/analyze.mjs` rewrites `results/analysis/` (summary.md, contrasts.tsv, k1-within-night.tsv, k1-verdicts.tsv, badmode.tsv, laptop.tsv, hosttrace.tsv, hosttrace-class.tsv); same input, byte-identical output (seeded). Tests of its statistics helpers: `bun test live-host-measurement-confounds/analysis/`.

## Credits and references

- crucible-vault (public repository): the `cv` daemon, the memory-release-strategy spike whose scenario A/B harness, request client and bad-mode observation this investigation adapts and tests.
- [sqlite-parse-number-rust-tuning](../sqlite-parse-number-rust-tuning/) round 5: the K1 workload, image and laptop baseline.
- Timing method: [methods/timing.md](../methods/timing.md).
- Mytkowicz, Diwan, Hauswirth, Sweeney. "Producing wrong data without doing anything obviously wrong!" ASPLOS 2009. https://doi.org/10.1145/1508244.1508275
- Abedi, Brecht. "Conducting repeatable experiments in highly variable cloud computing environments." ICPE 2017.
- Laaber, Scheuner, Leitner. "Software microbenchmarking in the cloud. How bad is it really?" Empirical Software Engineering 2019.
- Kalibera, Jones. "Rigorous benchmarking in reasonable time." ISMM 2013. https://doi.org/10.1145/2464157.2464160
- Maricq, Duplyakin, Jimenez, Maltzahn, Stutsman, Ricci. "Taming performance variability." OSDI 2018.
- Zhang, Tune, Hagmann, Jnagal, Gokhale, Wilkes. "CPI2: CPU performance isolation for shared compute clusters." EuroSys 2013.
- Lo, Cheng, Govindaraju, Ranganathan, Kozyrakis. "Heracles: improving resource efficiency at scale." ISCA 2015.
- LLVM documentation, "Benchmarking tips"; pyperf documentation, "Tune the system for benchmarks"; Linux kernel documentation, CPU isolation and cgroup v2 cpuset partitions.
- glibc `malloc` arena behaviour (default cap 8 x cores): sourceware libc-help list and Red Hat documentation (anecdotal; no controlled study found).
