# Research

Research experiments carried out by LLM coding agents (usually Claude Code). Every line of text and code in this repository was written by an LLM. The pattern follows Simon Willison's [research repo](https://github.com/simonw/research) — see [Code research projects with async coding agents](https://simonwillison.net/2025/Nov/6/async-code-research/).

Each folder holds one investigation with its working notes and final report.

## Methods

- [Timing measurements](methods/timing.md): the standard every timing claim here follows (repetition, interleaving, placement bias, confidence intervals, noise floor).
- [Binary-size measurements](methods/size.md): which size answers which question, the build inputs a size number states, when one build is exact, and how far attribution tools can be trusted.
- [Memory measurements](methods/memory.md): which memory source answers peak, settled and growth questions, and the container and allocator effects that move a memory number.
- [CPU-usage measurements](methods/cpu.md): which CPU source answers which question, and the SMT and placement effects that move CPU time, instructions and cycles.
- [Live-host measurement](methods/live-host.md): the procedure for measuring on a live workstation, with which classes are acceptable, the runtime controls and how to label the result.

<!-- research-index:start -->
## 7 research projects

### [Binary-size calibration: which size, which build settings, how far attribution tools agree](binary-size-calibration/) (2026-11-15)

On the fleet's musl toolchain (Rust 1.99.1, Alpine 3.24, `cargo auditable build --release --locked`), release binary sizes are exactly reproducible: three clean `--no-cache` builds of each of two web binaries gave the same SHA-256 and 0 differing bytes (router 5,618,832 B…

### [glibc thread-arena retention: a reproducible bad mode with a known ground truth](glibc-arena-retention/) (2026-11-14)

A fastbin-heavy burst freed on a worker thread and followed by `malloc_trim(0)` stays resident in glibc 2.41 (25 MiB burst: about 25 MiB anon after the trim, against about 1 MiB for the same burst on the main arena, with no fastbin-sized chunks, or with `mxfast=0`), so the bad…

### [CPU measurement calibration: what each CPU source counts](cpu-measurement-calibration/) (2026-11-13)

A calibration of the CPU numbers a container run can produce — perf task-clock, the child's rusage user and system time, retired instructions and cycles (user and kernel mode), and the container cgroup's `cpu.stat` usage — against a fixed-work program at several sizes and a…

### [Memory measurement calibration: what each memory source counts](memory-measurement-calibration/) (2026-11-13)

A calibration of the memory numbers a container run can produce — the cgroup `memory.peak`, sampled cgroup `anon`/`file` high-water marks, the process's own `VmHWM`, and settled anon after a workload-complete boundary — against allocations of known size, against concurrent file…

### [Where property-based testing would pay off in eight public repos, and a pilot that tried it](property-based-testing-fleet-guide/) (2026-11-13)

This investigation read eight public repos (`crucible-dev-env`, `crucible-term`, `crucible-tui`, `crucible-vault`, `inference-engine`, `research`, `scripts`, `semsearch`) for places where property-based testing (generated inputs checked against stated properties, with automatic…

### [Which live-workstation confounds matter for which measurement class](live-host-measurement-confounds/) (2026-11-11)

On a live 12-core desktop workstation (AMD Ryzen 9 7900X, Debian 13), instruction counts and same-cell CPU-bound ratio verdicts are unaffected by any load tested, while page-cache reads, tail latency and absolute CPU time are biased by specific loads that CPU pinning, CCD…

### [Can Rust match fast C for a SQLite `parse_number()` extension?](sqlite-parse-number-rust-tuning/) (2026-11-10)

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). Rust with no dependencies…
<!-- research-index:end -->
