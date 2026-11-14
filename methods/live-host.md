# Live-host measurement procedure

This is the procedure for measuring on a live developer workstation, a host someone works on, instead of a quiet benchmark machine. It extends [timing.md](timing.md) (whose R-rules still apply in full) with what a live host adds: which measurement classes a live host is acceptable for, which runtime controls to apply, how to label the result and when to re-run. Rules are numbered LH1, LH2, ...; each has a one-line reason and cites the tables of [live-host-measurement-confounds](../live-host-measurement-confounds/) (`results/analysis/` there), measured on a 12-core desktop workstation (AMD Ryzen 9 7900X, Debian 13) against a quiet tuned 2-core laptop. Its limits (one workstation, one loaded cell per condition, the guard-trip path never exercised) carry over to these rules.

## When a live host is acceptable, per class

| class | live host acceptable? | evidence (investigation tables) |
|---|---|---|
| Instructions retired (hardware counters) | Yes, at any load. | No load, control or day load moved instructions per row by more than 0.0003% (`contrasts.tsv`, K5). |
| CPU-bound A/B verdicts within one run (interleaved, with A/A) | Yes, for the verdict; the run still needs R1-R11. | The R8 verdict set was identical in all 38 workstation cells, quiet, loaded, live, every isolation level (`k1-verdicts.tsv`). |
| CPU-bound ratios compared across runs | Only above about 5%. | Ratio-of-ratios CIs between two cells span about +/-5% (`contrasts.tsv`, `k1-ratio:*`). |
| CPU-bound absolute time | Only within one isolation level and one run, labelled. | CPU saturation +6.5% at no isolation; pinning +4-5%; boost off +19-21% (`contrasts.tsv`, `k1-within-night.tsv`). |
| Tail latency | Only with no memory-bandwidth-heavy work on the host (away-from-keyboard window). | Bandwidth load +13.5% (no isolation) and +14.2% (CCD-fenced) on a daemon's p95; CPU saturation had no measurable effect (`contrasts.tsv`, K2). |
| Memory (settled/peak RSS of a real daemon) | Yes for the host, but a single block is never a result: report a rate over many blocks (LH6). | The crucible-vault bad mode occurred in 35-75% of quiet blocks on both hosts; memory pressure left the rate unchanged within resolution (`badmode.tsv`). |
| Synthetic allocator churn, fixed threads | Yes. | At most 0.2% movement under any load (`contrasts.tsv`, K3s). |
| Page-cache I/O, warm or cold | No, unless the host is otherwise idle (away-from-keyboard), and cold reads only then. | Bandwidth load doubles warm reads at every isolation level; disk writes slow cold reads 12-44% (`contrasts.tsv`, K4). |

## Rules

**LH1. Classify the measurement before choosing the host.** Look the class up in the table above; if the live host is not acceptable for it, measure in an away-from-keyboard window or on a quiet machine. Reason: the confounds are class-specific; the same afternoon is harmless for instruction counts and doubles a warm page-cache read (`contrasts.tsv`).

**LH2. Pin the measured process and record the effective cpuset; fence the rest when the class shares a CPU resource.** Run the measured process in a cgroup with an explicit CPU set (`--cpuset-cpus` or a slice with `AllowedCPUs`), and record both the requested and the effective cpuset (`Cpus_allowed_list`, `cpuset.cpus.effective`) per class run. For CPU-bound classes, also fence every other slice onto the other CCD/cache domain and leave the measured CPU's SMT sibling idle. Reason: pinning makes placement reproducible; fencing kept every K1 verdict intact. Not a protection claim: under CPU saturation, the fenced K1 cells were unresolved (CI about +/-5%), not shown to be protected (`contrasts.tsv`).

**LH3. Fencing does not isolate memory bandwidth or disk; do not claim it does.** A CCD fence separates L3 caches and cores, not the memory path or storage. Reason: bandwidth load raised tail latency by 14% and warm page-cache reads by about 1.9x with the antagonist fenced onto the other CCD, and disk writes slowed cold reads by 29-44% at fenced levels (`contrasts.tsv`, I2/I3 rows).

**LH4. Frequency controls change absolute numbers; compare only within one setting.** EPP `performance` with boost off cost about 20% absolute speed on the measured CCD and changed no verdict. Use them for lower variance only if every compared run uses the same setting, and state it. Reason: I3 vs I0 K1 absolute time +18.5%, +20.1%, +20.6% within each of three nights (`k1-within-night.tsv`).

**LH5. Read PSI per class, not per host.** Record cpu/memory/io PSI at 0.5 s and report it per class segment against that class's quiet value at the same isolation level. Reason: once the measurement is pinned, the measured workload's own queueing dominates host-wide cpu PSI (12 allocator threads on a 6-CPU set: median 23-26 versus 0 unpinned; a pinned K1 driver: about 2.5), so a host-level PSI threshold mislabels quiet runs as contended (`hosttrace-class.tsv`). PSI `avg10` also lags by about 10 s, so a block that starts within 10 s of other work inherits its pressure.

**LH6. Report a distribution, never a single block, for multimodal metrics.** When a metric is bimodal (an allocator that sometimes keeps memory), report the rate of each mode with a Clopper-Pearson interval over at least 20 independent blocks per condition, state the idle/settling window, and never quote per-block numbers as the result. Reason: the bad mode was intrinsic (quiet I0 0.35 [0.15, 0.59], quiet fenced 0.65 [0.41, 0.85], quiet laptop 0.75 [0.51, 0.91] at 120 s idle), and a 30 s window reads 0.70-0.90 because many blocks have not released yet (`badmode.tsv`). Twenty blocks resolve a rate difference of only about 0.4; plan more blocks for smaller differences. Memory sources, settle windows and allocator settings for such metrics follow [memory.md](memory.md).

**LH7. Every load or control contrast has a same-window quiet reference at the same isolation level.** A load effect is the loaded cell against a quiet cell with the same controls in the same session, never against a different isolation level, another night or another host. Open and close each session with quiet reference cells. Reason: the controls themselves move absolute time by 4-21%, and contrasts across nights (here also across a kernel update) cannot separate a control effect from a night effect (`contrasts.tsv` kind `controls-crossnight`, `k1-within-night.tsv`).

**LH8. Label every live-host run.** Report, next to the timing.md environment record: the isolation level (none / pinned / fenced / fenced plus frequency) with the effective cpusets; whether the user was present (live) or away; the kernel version; per-class PSI (LH5); and the rigor level. A run whose user presence is unknown is reported as live. Reason: day-versus-night differences are observational and only interpretable with these labels (`contrasts.tsv` kind `llive`).

**LH9. Stop and invalidate on a guard trip or the user's return.** Run a guard (for example `MemAvailable` below 4 GB, or memory PSI `full` avg10 above 5) and watch for the user's return; on either, stop antagonists and restore every control immediately, mid-cell, mark the whole cell invalid, and re-run it whole in a later authorised window. Never resume a cell or keep its partial data. Reason: a partially loaded cell has an unknown dose. The investigation never tripped its guard (memory `full` at most 2.12), so this path is specified, not validated.

**LH10. Disruptive operations only while the user is away.** Synthetic antagonists, quiet reference cells and cache eviction (`drop_caches`) run only in an announced away-from-keyboard window. `drop_caches` is an operation, not a setting: it evicts the whole host's page cache, cannot be restored, and the user's next file accesses run cold; prepare cache state explicitly (drop, then a documented warm-up pass for warm reads) instead of claiming restoration. Reason: the user's machine is not the experiment's; every reversible control is restored and read back after each cell.

**LH11. Boot-time CPU isolation is not the first remedy.** `isolcpus` / `nohz_full` / `rcu_nocbs` need reboots and address scheduler ticks and CPU sharing; the residual confounds measured after runtime fencing were memory bandwidth and disk (LH3). Reach for boot-time isolation only when a class shows a CPU-contention residual that runtime fencing leaves. Reason: no such residual was resolved in this investigation (README "Follow-up").

## Reporting checklist (in addition to timing.md's)

- The class's row of the table above and how the run satisfies it.
- Isolation level, effective cpusets, frequency settings, user present or away, kernel.
- The same-session quiet reference and its A/A floor; the contrast's CI and its classification (bias / noise only / no measurable effect / unresolved at measured resolution) with the effect size that matters stated.
- Per-class PSI against the class's quiet value.
- For multimodal metrics: mode rates with Clopper-Pearson intervals and the block count.
- Any invalidated cell and its re-run.
