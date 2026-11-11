# Timing measurement standard

This is the method every timing claim in this repository follows. The goal is a claim a reader can check: how many times it was measured, at which levels, in which order, against which noise floor, and on what machine. The standard has to hold on an ordinary, shared, untuned host; host tuning (below) only makes it cheaper to meet. Sections are rules (R1, R2, ...), each with a one-line reason and a citation. Resource measurements other than time (binary size, memory) are planned as separate standards.

## Scope: rigor follows use

How rigorous a measurement has to be depends on how the number is used and how small the separation it supports is. Every reported number states its rigor level next to it, so a reader knows how far to trust it.

- **Indicative.** Quick, incidental timings: sizing, spikes, feasibility checks, a sanity check while working. A few runs on whatever host is at hand, with no layout builds, no host tuning and no second machine. Report the number with the label *indicative*, the command, the run count and the host type. When the separation is far larger than any plausible noise, an indicative number is enough to report it as what it is. For example: "indicative, 5 runs each on a laptop: naive C 17 ms, naive Rust 50 ms, idiomatic TypeScript port 200 ms." An indicative number never carries a precise ratio or a "faster by N%" claim.
- **Standard.** The full protocol (R1-R11, the reporting checklist and `scripts/measure.mjs`). Required whenever timing or resource cost is the product of the research, or whenever the claimed separation is small enough (a few percent, or within an order of magnitude of observed run-to-run spread) that layout, frequency or host noise could produce it. Any strong claim stated in an investigation's findings, such as "X is faster than Y" or "no measurable difference", is held to this level.

When unsure, report the number as indicative and state no strong claim. A pilot (R9) bridges the two levels: it is used to choose the counts for a standard run and is excluded from inference.

## Rules

**R1. Repeat at two levels.** Time inside the process (iterations of the timed loop, many per invocation) and across processes (separate invocations of the whole program). Minimum: at least 10 timed in-process iterations per invocation and at least 30 measured invocations per variant (per layout build when R5 applies). Choose the counts before the claim-producing run (R9). Reason: variation arises at every level (process start, ASLR, page placement, scheduler, frequency state) and repeating only the innermost level measures only that level's noise; the invocation level is where most unexplained variance lives. Kalibera and Jones recommend allocating repetitions by the measured variance at each level instead of repeating one level ever more.

**R2. Discard warm-up at both levels.** Inside the process, run warm-up iterations first (until the per-iteration time is steady, never fewer than 5, and long enough to touch every code path and data page) and do not record them. Across processes, discard the first K rounds of invocations (default K = 3; the driver's `warmup`). Reason: caches, branch predictors, page cache, lazy binding and CPU frequency ramp settle only after use. Georges et al. separate warm-up from steady state for the same reason.

**R3. Interleave in a fresh random order.** Every round runs all variants once, in a new random order drawn from a seeded generator; the seed is recorded with the results. Never run all invocations of one variant, then all of the next. Reason: slow drift (thermal state, other tenants, frequency) then hits all variants alike instead of being confounded with whichever variant ran at that time.

**R4. Perturb environment-dependent placement per invocation.** Each invocation gets an environment variable `MEASURE_PAD` of uniform random length in `[0, padMax]` (default 4096 bytes), which shifts the initial stack and auxiliary data. ASLR stays on (never disable it to get "stable" numbers). Reason: Mytkowicz et al. showed that the size of the environment and the link order alone change results by amounts comparable to the effects being claimed, and that a fixed setup turns that bias into a systematic error rather than noise.

**R5. Perturb code layout for compiled A/B comparisons.** When two compiled variants are compared, build each variant at least 3 times with different layout perturbations (for example function and loop alignment of 16, 32 and 64 bytes, or a shuffled link order). The layout builds of one logical variant are pooled: layout is a random factor, so the bootstrap resamples hierarchically, layouts first and invocations within the chosen layouts second. If layouts are not randomised, the report must say so explicitly and quote the measured placement band (the spread of the same code at different placements). Reason: one build is one draw of code placement. In this repository's first investigation, forcing alignment on two builds of the same hot function moved results by about ±1.5 ns per row and erased a 1.5-3 ns "speed difference" ([sqlite-parse-number-rust-tuning](../sqlite-parse-number-rust-tuning/)). Mytkowicz et al. describe the same effect.

**R6. Report a median with a bootstrap CI, never min-only.** Per variant: the median of the invocation-level values and a 95% percentile-bootstrap confidence interval of it (at least 10,000 resamples, seeded). Comparisons use the ratio of medians (variant over baseline), with its own 95% percentile-bootstrap CI computed from independent (hierarchical, per R5) resamples of the two variants. A minimum alone is not a statistic of the distribution and hides the noise; a mean is dominated by outliers. Reason: Georges et al. and Kalibera and Jones: report confidence intervals over the right level of repetition, and compare via an interval on the ratio instead of eyeballing two numbers.

**R7. Run an A/A noise floor in every experiment.** One variant runs twice under two names (the same command, same build); its ratio CI is reported. Reason: the A/A interval is the measured resolution of the whole setup on that day, on that host, under that load. A difference smaller than what identical code produces is not a finding.

**R8. Claim rule.** A difference between variants is stated only when (a) its ratio CI excludes 1 and (b) the magnitude of the effect exceeds the half-width of the A/A ratio CI. Otherwise write "no measurable difference". A claim is always stated with its CI. Reason: (a) alone passes spurious differences when noise is underestimated; (b) ties the claim to the observed noise floor.

**R9. Fix the sample size first; no optional stopping.** The invocation count is fixed before the claim-producing run. A pilot may choose it, but pilot data are excluded from inference. Do not rerun until a result looks good. A replication that disagrees is reported, not discarded. Reason: choosing the sample size from the same intervals that are then reported breaks their nominal coverage, and selective reruns turn noise into findings.

**R10. Hardware counters are a secondary metric.** Instructions retired is near-deterministic and a good complement to wall time: it separates "fewer instructions" from "better placement or frequency". Count only over the timed region and its matching baseline (for example `perf stat --control` around the timed loop, or setup-only invocations subtracted), never over process start or dataset setup. Reason: counting the whole process attributes setup cost to the code under test. Counters are also reported with a CI (they still vary slightly with ASLR and kernel noise), and they never replace wall time for a speed claim.

**R11. Record the environment.** Every run records, in `env.json`: CPU model and vendor, microcode, kernel, SMT state and the pinned CPU's siblings, frequency driver, governor, EPP/HWP, boost/turbo state, `perf_event_paranoid`, ASLR (`randomize_va_space`), load average before and after, Docker version, image id, timestamp, and the driver's build id. A run whose environment was not recorded is not a claim. Reason: without it the result cannot be reproduced or compared.

## Reporting checklist

An investigation README with a timing claim states:

- Method line: the rigor level (Scope), that it follows this standard, and the driver build id.
- Counts: variants, rounds, warm-up rounds discarded, invocations per variant (per layout), in-process warm-up and timed iterations, seed, `padMax`.
- CI table: per variant and metric, median with its 95% CI; per comparison, the ratio with its CI.
- A/A floor: the A/A ratio and CI.
- Claim verdicts: each comparison either a stated difference (CI excludes 1 and exceeds the floor) or "no measurable difference".
- Environment summary: the key rows of `env.json`, including pinning, SMT sibling state, governor and boost.
- Deviations: anything that departs from R1-R11, and why (for example layouts not randomised, with the placement band).

## Counters in Docker

Debian's kernel sets `perf_event_paranoid=3`, and its patch for that level checks `CAP_SYS_ADMIN`, not `CAP_PERFMON`. Measured on that setup, running `perf stat` in a container:

| docker run flags | result |
|---|---|
| none | refused |
| `--cap-add PERFMON` | refused |
| `--cap-add PERFMON --security-opt seccomp=unconfined` | refused |
| `--cap-add PERFMON --cap-add SYS_ADMIN` | works |
| `--privileged` | works |

So perf in Docker needs `--cap-add PERFMON --cap-add SYS_ADMIN` (PERFMON alone is refused). `SYS_ADMIN` is a broad capability, so this is only acceptable for a local, throwaway bench container that runs code you built yourself; do not carry it into anything long-lived or shared. If the host's `perf_event_paranoid` is lowered to 2, `PERFMON` alone suffices and `SYS_ADMIN` can be dropped.

## Host and Docker quirks

- **Pinning is not isolation.** `--cpuset-cpus` restricts the container to a CPU but does not stop other host tasks from running on that CPU's SMT sibling, which shares its core's execution units and caches. Record the siblings; prefer a pinned CPU whose sibling is idle or offline.
- **Containers cannot control frequency.** Governor, EPP, boost and turbo are host settings; a container can only read them. Record them (R11); do not assume them.
- **`docker run` startup is excluded** because timing is measured inside the process (the metric line comes from the experiment, not from wall time of the command), so container start cost does not contaminate results.
- **Environment variables do not cross ssh.** For a remote measured host, the driver substitutes `{pad}` in argv (for example `-e MEASURE_PAD={pad}`) instead of relying on the child environment.
- **Shared host.** Other sessions load the machine. Interleaving (R3) and the A/A floor (R7) are what make a noisy host usable; record load average before and after.

## CPU-vendor quirks

- **AMD `amd_pstate`** normally runs in `active` mode, where the hardware picks frequency within hints from the energy-performance preference (EPP), such as `balance_performance` or `performance`. Boost is the `cpufreq/boost` switch.
- **Intel `intel_pstate`** runs either `active` (HWP, with EPP hints and the `powersave` or `performance` governors) or `passive` (shown as the `intel_cpufreq` driver, with a generic governor such as `schedutil`). Turbo is the inverse switch `intel_pstate/no_turbo` (1 means turbo off).
- **Laptops** add thermal throttling and AC-versus-battery limits: record the power source, and expect results to drift with temperature. Both are another reason for interleaving.
- Record which driver and mode are in effect rather than assuming; the same governor name means different things on different drivers.

## Optional host tuning

None of this is required; the standard holds on an untuned host. Each item narrows the noise floor and so the CIs, and costs root access:

- Performance governor or EPP `performance`: removes frequency ramping between and during invocations.
- Boost/turbo off: removes opportunistic frequency changes with thermal and load state, at the cost of absolute speed.
- SMT sibling of the pinned CPU offline: removes interference from the sibling thread.
- `isolcpus` / `nohz_full` (boot parameters): keep other tasks and timer ticks off the pinned CPU.
- Stopping services and idle sessions: lowers load and background interference.
- `perf_event_paranoid=2`: lets `PERFMON` replace `SYS_ADMIN` for counters.

Whatever tuning is in effect goes in `env.json` and the README; an untuned run is reported as untuned.

## Using the driver

`scripts/measure.mjs` is a dependency-free bun script that runs on the host, so experiments need no shared runtime in their images. It runs each variant as separate process invocations, interleaved (R3), discards warm-up rounds (R2), pads the environment (R4), records the environment (R11), and reports medians, bootstrap CIs, ratios, the A/A floor and claim verdicts (R6-R8). In-process warm-up and the timed loop stay in the experiment's code.

- `measure.mjs run --config <file.json> --out <dir> [--seed N] [--host <name>]` runs the experiment and writes `<dir>/raw.jsonl` (one record per invocation: round, order index, variant, pad length, exit code, wall milliseconds, metrics) and `<dir>/env.json`. A non-zero exit or a missing metric line fails the run.
- `measure.mjs report <dir>` prints a Markdown table per metric (variant, n, median, 95% CI, ratio versus baseline with CI, A/A ratio CI, verdicts) and writes `<dir>/report.md`.
- Config fields: `variants` (`name`, `argv`, optional `group`: variants sharing a group are the layout builds of one logical variant, R5), `invocations`, `warmup`, `padMax`, optional `aa` (the two names of the A/A pair), `baseline` (a group name), `seed`, and `envPrefix` (argv prefix, for example `["ssh","{host}"]`, so the environment probe runs on the measured machine).
- Substitution: `{pad}` (this invocation's padding string) and `{host}` (from `--host`) are replaced in every argv element; `MEASURE_PAD` is also set in the child environment.
- Line protocol: the experiment prints `MEASURE <metric> <number> [unit]`, one or more lines per invocation; other output goes to a log.

Example config (A/B plus an A/A duplicate, run on a remote machine):

```json
{
  "variants": [
    { "name": "a",      "argv": ["ssh", "{host}", "docker", "run", "--rm", "--cpuset-cpus", "2", "-e", "MEASURE_PAD={pad}", "bench", "run", "a"] },
    { "name": "a-copy", "argv": ["ssh", "{host}", "docker", "run", "--rm", "--cpuset-cpus", "2", "-e", "MEASURE_PAD={pad}", "bench", "run", "a"] },
    { "name": "b",      "argv": ["ssh", "{host}", "docker", "run", "--rm", "--cpuset-cpus", "2", "-e", "MEASURE_PAD={pad}", "bench", "run", "b"] }
  ],
  "invocations": 30,
  "warmup": 3,
  "padMax": 4096,
  "aa": ["a", "a-copy"],
  "baseline": "a",
  "envPrefix": ["ssh", "{host}"]
}
```

## References

- Mytkowicz, Diwan, Hauswirth, Sweeney. "Producing wrong data without doing anything obviously wrong!" ASPLOS 2009. https://doi.org/10.1145/1508244.1508275
- Kalibera, Jones. "Rigorous benchmarking in reasonable time." ISMM 2013. https://doi.org/10.1145/2464157.2464160
- Georges, Buytaert, Eeckhout. "Statistically rigorous Java performance evaluation." OOPSLA 2007. https://doi.org/10.1145/1297027.1297033
