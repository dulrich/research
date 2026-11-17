// summary.mjs - builds results/summary.md from the row files (claim-forced, claim-cpu, natural). Library for run.mjs
// (`run.mjs summary`); pure functions, no I/O. Statistics come from the repo's measure-stats (R6-R8: median with a seeded
// percentile-bootstrap 95% CI, ratio of medians with its own CI, A/A floor, Clopper-Pearson for rates).
import { clopperPearson, ci95, hierBootstrap, mulberry32, median, ratioReps, verdict } from "../scripts/lib/measure-stats.mjs";

const B = 10000;
export const BAD_AHP_MIB = 8; // bad_collapse: AnonHugePages at the reading >= 8 MiB (fixed from the pilot, M7)
export const FAST_MODE_MS = { 1: 180, 4: 1140 }; // mimalloc "on" bimodal cpu_task_clock_ms thresholds (pilot)

const hash = (s) => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
export const cellOf = (r) => r.label.replace(/#\d+$/, "");
export const group = (rows) => { const g = new Map(); for (const r of rows) { const k = cellOf(r); if (!g.has(k)) g.set(k, []); g.get(k).push(r); } return g; };
/** A block is usable when its container exited 0 and the metric was printed; everything else is a discarded block. */
export const usable = (r, metric) => r.ok === true && Number.isFinite(r.measures?.[metric]);
export const vals = (rows, metric) => rows.filter((r) => usable(r, metric)).map((r) => r.measures[metric]);
const f = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");

/** Median with its 95% bootstrap CI (seeded per label+metric). */
export function medCI(xs, key) {
  if (!xs.length) return { n: 0, med: NaN, lo: NaN, hi: NaN };
  const reps = hierBootstrap([xs], B, mulberry32(hash(key)));
  const [lo, hi] = ci95(reps);
  return { n: xs.length, med: median(xs), lo, hi };
}
/** Ratio of medians a/b with its CI; reps from independent streams. */
export function ratioCI(a, b, key) {
  const ra = hierBootstrap([a], B, mulberry32(hash(key + "|a"))), rb = hierBootstrap([b], B, mulberry32(hash(key + "|b")));
  const [lo, hi] = ci95(ratioReps(Array.from(ra), Array.from(rb)));
  return { ratio: median(a) / median(b), lo, hi, half: (hi - lo) / 2 };
}
const fmtMed = (m, d = 2) => (m.n ? `${f(m.med, d)} [${f(m.lo, d)}, ${f(m.hi, d)}]` : "n/a");
const fmtRatio = (r) => `${f(r.ratio, 3)} [${f(r.lo, 3)}, ${f(r.hi, 3)}]`;
const fmtRate = (k, n) => { const [lo, hi] = clopperPearson(k, n); return `${k}/${n} [${f(lo, 2)}, ${f(hi, 2)}]`; };

/** Pure: split a cpu cell's values at the bimodal threshold. */
export function splitModes(xs, threshold) { return { fast: xs.filter((x) => x < threshold), slow: xs.filter((x) => x >= threshold) }; }
/** Pure: the discard accounting of a row file. */
export function discards(rows, metric) {
  const bad = rows.filter((r) => !usable(r, metric));
  return { planned: rows.length, usable: rows.length - bad.length, discarded: bad.length, labels: bad.map((r) => r.label) };
}

/** Pure: "6-9" and "6,7,8,9" compare equal. */
export function expandCpus(s) {
  const out = new Set();
  for (const part of String(s ?? "").split(",")) { const m = /^(\d+)(?:-(\d+))?$/.exec(part); if (!m) return `?${s}`; for (let i = Number(m[1]); i <= Number(m[2] ?? m[1]); i++) out.add(i); }
  return [...out].sort((a, b) => a - b).join(",");
}
const control = (r) => (r.tunables?.length ? r.tunables.join(" ") : "none");
const shapeOf = (r) => (r.shape === "mixed" ? `mixed 16 B-4 KiB @ ${r.stride_kb} KiB` : r.stride_kb === 0 ? "stride 0 (no survivors)" : `${r.stride_kb} KiB`);

function forcedSection(rows) {
  const out = [];
  const g = group(rows);
  out.push("| cell | allocator | THP | survivor stride / shape | native control | n (usable/run) | AHP at release, median MiB | anon settled 0 s, median MiB | anon settled 10 s, median MiB [95% CI] | 10 s min..max | AHP at reading, median MiB | bad_collapse (AHP >= 8 MiB) k/n [Clopper-Pearson] | rigor |");
  out.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const [k, rs] of g) {
    const r0 = rs[0], s10 = vals(rs, "anon_settled_10s_mib"), s0 = vals(rs, "anon_settled_0s_mib");
    const ahp = vals(rs, "ahp_final_mib"), rel = vals(rs, "ahp_rel_mib");
    const bad = ahp.filter((x) => x >= BAD_AHP_MIB).length;
    out.push(`| ${k} | ${r0.alloc} | ${r0.thp} | ${shapeOf(r0)} | ${control(r0)} | ${s10.length}/${rs.length} | ${f(median(rel))} | ${f(median(s0))} | ${fmtMed(medCI(s10, k + "|s10"))} | ${f(Math.min(...s10))}..${f(Math.max(...s10))} | ${f(median(ahp))} | ${fmtRate(bad, ahp.length)} | standard |`);
  }
  return out;
}

function aaForced(rows) {
  const g = group(rows), out = [];
  out.push("| A/A pair | n | ratio of medians, anon settled 10 s [95% CI] | half-width (noise floor) |", "|---|---|---|---|");
  for (const base of ["glibc-on-s128", "mimalloc-on-s128"]) {
    const a = vals(g.get(base + "-AA") ?? [], "anon_settled_10s_mib"), b = vals(g.get(base) ?? [], "anon_settled_10s_mib");
    if (!a.length || !b.length) continue;
    const r = ratioCI(a, b, base + "|AA");
    out.push(`| ${base}-AA vs ${base} | ${a.length} vs ${b.length} | ${fmtRatio(r)} | ${f(r.half, 3)} |`);
  }
  return out;
}

function cpuSection(rows) {
  const g = group(rows), out = [];
  out.push("| cell | allocator | THP | threads | n (usable/run) | task-clock ms, median [95% CI] | task-clock min..max | instructions_u (1e6), median [95% CI] | sibling_busy median / max | rigor |");
  out.push("|---|---|---|---|---|---|---|---|---|---|");
  for (const [k, rs] of g) {
    const tc = vals(rs, "cpu_task_clock_ms"), ins = vals(rs, "instructions_u").map((x) => x / 1e6), sb = vals(rs, "sibling_busy");
    const bimodal = k.startsWith("mimalloc-on-t") && k.endsWith("-burst") && !k.endsWith("-AA");
    out.push(`| ${k} | ${rs[0].alloc} | ${rs[0].thp} | ${rs[0].threads} | ${tc.length}/${rs.length} | ${bimodal ? "bimodal, see below" : fmtMed(medCI(tc, k + "|tc"))} | ${f(Math.min(...tc), 1)}..${f(Math.max(...tc), 1)} | ${fmtMed(medCI(ins, k + "|ins"), 3)} | ${f(median(sb), 2)} / ${f(Math.max(...sb), 2)} | standard |`);
  }
  out.push("", "`sibling_busy` is the busy fraction of CPU 18 (CPU 6's SMT sibling) sampled by `cpuprobe.sh`; for the 4-thread cells CPU 18 is not the sibling of CPUs 7-9, and for the zero-work control cells (about 1 ms) the sample is a few ticks, so those maxima are noise. Without CPU fencing, other slices on the host can run on the measured CPUs: only within-run A/B verdicts are claimed.");
  return out;
}

function bimodalSection(rows) {
  const g = group(rows), out = [];
  out.push("| cell | threshold ms | n | fast mode k/n [Clopper-Pearson] | fast cluster min..max / median | slow cluster min..max / median |", "|---|---|---|---|---|---|");
  for (const th of [1, 4]) {
    const k = `mimalloc-on-t${th}-burst`, tc = vals(g.get(k) ?? [], "cpu_task_clock_ms");
    if (!tc.length) continue;
    const { fast, slow } = splitModes(tc, FAST_MODE_MS[th]);
    const rng = (xs) => (xs.length ? `${f(Math.min(...xs), 1)}..${f(Math.max(...xs), 1)} / ${f(median(xs), 1)}` : "none");
    out.push(`| ${k} | ${FAST_MODE_MS[th]} | ${tc.length} | ${fmtRate(fast.length, tc.length)} | ${rng(fast)} | ${rng(slow)} |`);
  }
  return out;
}

/** Within-run A/B verdicts (R6-R8 with the A/A floor of glibc-on-t1-burst-AA vs glibc-on-t1-burst). */
function verdicts(rows) {
  const g = group(rows), out = [];
  const tc = (k) => vals(g.get(k) ?? [], "cpu_task_clock_ms"), ins = (k) => vals(g.get(k) ?? [], "instructions_u");
  const aaT = ratioCI(tc("glibc-on-t1-burst-AA"), tc("glibc-on-t1-burst"), "aa|t"), aaI = ratioCI(ins("glibc-on-t1-burst-AA"), ins("glibc-on-t1-burst"), "aa|i");
  out.push(`A/A floor (glibc \`on\` 1 thread, copy vs original, 20 blocks each): task-clock ratio ${fmtRatio(aaT)}, half-width ${f(aaT.half, 3)}; instructions_u ratio ${fmtRatio(aaI)}, half-width ${f(aaI.half, 5)}.`, "");
  const row = (name, a, b, key, aa) => {
    if (!a.length || !b.length) return `| ${name} | n/a | n/a | n/a |`;
    const r = ratioCI(a, b, key); const v = verdict(r.ratio, [r.lo, r.hi], aa);
    return `| ${name} | ${fmtRatio(r)} | ${v}${v !== "no measurable difference" && Math.abs(r.ratio - 1) < 0.005 ? " (but under 0.5%: practically none)" : ""} | ${a.length} vs ${b.length} |`;
  };
  out.push("THP `on` against `off` (ratio of medians on/off, task-clock; below 1 means `on` uses less CPU):", "", "| allocator, threads | ratio [95% CI] | verdict | n |", "|---|---|---|---|");
  for (const a of ["glibc", "jemalloc", "mimalloc", "musl"]) for (const t of [1, 4]) {
    const on = `${a}-on-t${t}-burst`, off = `${a}-off-t${t}-burst`;
    if (a === "mimalloc") {
      const { fast, slow } = splitModes(tc(on), FAST_MODE_MS[t]);
      if (fast.length >= 3) out.push(row(`${a}, ${t}: fast cluster (${fast.length}) vs off`, fast, tc(off), on + "|fast", aaT.half));
      if (slow.length >= 3) out.push(row(`${a}, ${t}: slow cluster (${slow.length}) vs off`, slow, tc(off), on + "|slow", aaT.half));
    } else out.push(row(`${a}, ${t} thread${t > 1 ? "s" : ""}`, tc(on), tc(off), on + "|t", aaT.half));
  }
  out.push("", "THP `on` against `off`, instructions_u (stable cost, C7):", "", "| allocator, threads | ratio [95% CI] | verdict | n |", "|---|---|---|---|");
  for (const a of ["glibc", "jemalloc", "mimalloc", "musl"]) for (const t of [1, 4]) out.push(row(`${a}, ${t}`, ins(`${a}-on-t${t}-burst`), ins(`${a}-off-t${t}-burst`), `${a}-t${t}|i`, aaI.half));
  out.push("", "Four threads against one thread (4x the total work; 4.00 would be linear scaling of CPU time), task-clock:", "", "| allocator, THP | ratio t4/t1 [95% CI] | verdict against 4 | n |", "|---|---|---|---|");
  for (const a of ["glibc", "jemalloc", "mimalloc", "musl"]) for (const th of ["on", "off"]) {
    const x = tc(`${a}-${th}-t4-burst`), y = tc(`${a}-${th}-t1-burst`);
    if (!x.length || !y.length) continue;
    const r = ratioCI(x, y, `${a}${th}|scale`);
    out.push(`| ${a}, ${th}${a === "mimalloc" && th === "on" ? " (bimodal cells pooled, medians only)" : ""} | ${fmtRatio(r)} | ${r.lo > 4 ? "above 4" : r.hi < 4 ? "below 4" : "includes 4"} | ${x.length} vs ${y.length} |`);
  }
  out.push("", "Each allocator against glibc, same THP mode and thread count (ratio of medians, task-clock, instructions_u):", "", "| allocator, THP, threads | task-clock ratio [95% CI] | verdict | instructions_u ratio [95% CI] | verdict |", "|---|---|---|---|---|");
  for (const a of ["jemalloc", "mimalloc", "musl"]) for (const th of ["on", "off"]) for (const t of [1, 4]) {
    const ka = `${a}-${th}-t${t}-burst`, kb = `glibc-${th}-t${t}-burst`;
    const r = ratioCI(tc(ka), tc(kb), ka + "|vsg"), ri = ratioCI(ins(ka), ins(kb), ka + "|vsgi");
    const bim = a === "mimalloc" && th === "on" ? " (bimodal; medians only)" : "";
    out.push(`| ${a}, ${th}, ${t}${bim} | ${fmtRatio(r)} | ${verdict(r.ratio, [r.lo, r.hi], aaT.half)} | ${fmtRatio(ri)} | ${verdict(ri.ratio, [ri.lo, ri.hi], aaI.half)} |`);
  }
  return out;
}

function naturalSection(rows) {
  const g = group(rows), out = [];
  out.push("| cell | blocks (usable/run) | anon at release, MiB | anon at the reading, MiB | AHP at the reading, MiB | full_scans release -> reading | first increment after (s) | stop |", "|---|---|---|---|---|---|---|---|");
  for (const [k, rs] of g) {
    const ns = rs.filter((r) => r.ok && r.natural);
    const col = (fn) => ns.map(fn).join(" / ");
    out.push(`| ${k} | ${ns.length}/${rs.length} | ${col((r) => f(r.natural.anon_rel_kb / 1024, 1))} | ${col((r) => f(r.natural.anon_final_kb / 1024, 1))} | ${col((r) => f(r.natural.ahp_final_kb / 1024, 1))} | ${col((r) => `${r.natural.full_scans_rel}->${r.natural.full_scans_read}`)} | ${col((r) => (r.natural.inc1_elapsed_s >= 0 ? r.natural.inc1_elapsed_s : "none"))} | ${[...new Set(ns.map((r) => r.natural.stop))].join(", ")} |`);
  }
  return out;
}

function hostFacts(rows, name) {
  const ok = rows.filter((r) => r.host);
  if (!ok.length) return `- ${name}: no rows`;
  const u = (fn) => [...new Set(ok.map(fn))].join("; ");
  const ups = ok.map((r) => Number(r.uptime_s)).filter(Number.isFinite), fs = ok.map((r) => Number(r.full_scans_start)).filter(Number.isFinite);
  const mism = ok.filter((r) => r.cpuset_requested !== "unpinned" && expandCpus(r.cpuset_effective) !== expandCpus(r.cpuset_requested)).length;
  const starts = rows.map((r) => r.started).sort();
  return `- ${name}: ${rows.length} rows, started ${starts[0]} .. ${starts[starts.length - 1]}; THP enabled ${u((r) => r.host.thp_enabled)}; defrag ${u((r) => r.host.defrag)}; max_ptes_none ${u((r) => r.host.max_ptes_none)}; pages_to_scan ${u((r) => r.host.pages_to_scan)}; scan_sleep_millisecs ${u((r) => r.host.scan_sleep_ms)}; uptime ${Math.min(...ups)}..${Math.max(...ups)} s; khugepaged full_scans at start ${Math.min(...fs)}..${Math.max(...fs)}; rows whose effective cpuset differs from the requested one: ${mism}; image ${u((r) => r.image?.slice(0, 19))}; seed ${u((r) => r.seed)}`;
}

export function buildSummary({ forced, cpu, natural }) {
  const L = [];
  const df = discards(forced, "anon_settled_10s_mib"), dc = discards(cpu, "cpu_task_clock_ms"), dn = { planned: natural.length, usable: natural.filter((r) => r.ok && r.natural).length };
  L.push("# Results summary (generated)", "", "Generated by `run.mjs summary` from the row files; do not edit by hand. Medians carry a seeded 95% percentile-bootstrap interval over blocks (10,000 resamples, `methods/timing.md` R6); rigor label `standard` (R1-R11, M1-M9 as far as the host allows) unless a section says indicative.", "");
  L.push("## Host and run conditions", "", hostFacts(forced, "forced arm (claim)"), hostFacts(cpu, "Question C (claim)"), hostFacts(natural, "natural arm (earlier run, indicative, carried)"), "");
  L.push("## Discarded and failed blocks", "", "| file | planned (rows) | usable | discarded or failed |", "|---|---|---|---|");
  L.push(`| claim-forced.jsonl | ${df.planned} | ${df.usable} | ${df.discarded}${df.discarded ? ` (${df.labels.join(", ")})` : ""} |`);
  L.push(`| claim-cpu.jsonl | ${dc.planned} | ${dc.usable} | ${dc.discarded}${dc.discarded ? ` (${dc.labels.join(", ")})` : ""} |`);
  L.push(`| natural.jsonl (indicative) | ${dn.planned} | ${dn.usable} | ${dn.planned - dn.usable} |`, "");
  L.push("## Forced arm: settled anon and AnonHugePages per cell (MiB)", "", "Forced `MADV_COLLAPSE` after the release, settled readings at 0 s and 10 s after the workload-complete boundary (windows justified in the README), `--memory 1g` container per block, four pinned lanes. Provenance `claim`; Pilot rows are not included. The anon column is `/proc/self/smaps_rollup` Anonymous.", "");
  L.push(...forcedSection(forced), "", "### A/A pairs (forced arm)", "", ...aaForced(forced), "");
  L.push("## Question C: CPU cost of the burst (within-run A/B only; no CPU fencing)", "", "10 repetitions of a 64 MiB burst per thread under `cpuprobe.sh`, one fresh container per block, strictly sequential and interleaved. Control rows (`--mib 0`) show the zero-work cost; burst values are raw (control not subtracted: under 1% of the burst).", "");
  L.push(...cpuSection(cpu), "", "### Bimodal cells (rate of the fast mode, both clusters shown; no median)", "", ...bimodalSection(cpu), "", "### Within-run A/B verdicts", "", ...verdicts(cpu), "");
  L.push("## Natural arm (carried from the first natural-arm run; indicative)", "", "Unpinned, concurrent, 2 blocks per cell, no settled-value claim. Values are per block, separated by `/`.", "", ...naturalSection(natural), "");
  return L.join("\n");
}
