# Research

Research experiments carried out by LLM coding agents (usually Claude Code). Every line of text and code in this repository was written by an LLM. The pattern follows Simon Willison's [research repo](https://github.com/simonw/research) — see [Code research projects with async coding agents](https://simonwillison.net/2025/Nov/6/async-code-research/).

Each folder holds one investigation with its working notes and final report.

## Methods

- [Timing measurements](methods/timing.md): the standard every timing claim here follows (repetition, interleaving, placement bias, confidence intervals, noise floor).

<!-- research-index:start -->
## 4 research projects

### [CPU measurement calibration: what each CPU source counts](cpu-measurement-calibration/) (2026-11-13)

A calibration of the CPU numbers a container run can produce — perf task-clock, the child's rusage user and system time, retired instructions and cycles (user and kernel mode), and the container cgroup's `cpu.stat` usage — against a fixed-work program at several sizes and a…

### [Memory measurement calibration: what each memory source counts](memory-measurement-calibration/) (2026-11-13)

A calibration of the memory numbers a container run can produce — the cgroup `memory.peak`, sampled cgroup `anon`/`file` high-water marks, the process's own `VmHWM`, and settled anon after a workload-complete boundary — against allocations of known size, against concurrent file…

### [Which live-workstation confounds matter for which measurement class](live-host-measurement-confounds/) (2026-11-11)

On a live 12-core desktop workstation (AMD Ryzen 9 7900X, Debian 13), instruction counts and same-cell CPU-bound ratio verdicts are unaffected by any load tested, while page-cache reads, tail latency and absolute CPU time are biased by specific loads that CPU pinning, CCD…

### [Can Rust match fast C for a SQLite `parse_number()` extension?](sqlite-parse-number-rust-tuning/) (2026-11-10)

A follow-up to Simon Willison's [sqlite-parse-number-c-vs-rust](https://github.com/simonw/research/tree/main/sqlite-parse-number-c-vs-rust), where hand-optimised C (`c-fast`) was ~2× faster than the Rust extensions and 20× smaller (14 KB vs ~300 KB). Rust with no dependencies…
<!-- research-index:end -->
