// measure-report.mjs — Markdown report from raw.jsonl + env.json (deterministic for the same data and seed).
import { ci95, hierBootstrap, median, mulberry32, ratioReps, verdict } from "./measure-stats.mjs";

const fmt = (x) => (Number.isFinite(x) ? String(Number(x.toPrecision(4))) : "n/a");
const fci = ([lo, hi]) => `[${fmt(lo)}, ${fmt(hi)}]`;
const row = (cells) => `| ${cells.join(" | ")} |`;

/** Groups records of one metric: Map group -> Map variant(build) -> values; order follows config. */
function collect(records, metric, config) {
  const groups = new Map();
  for (const v of config.variants) {
    const g = v.group ?? v.name;
    if (!groups.has(g)) groups.set(g, new Map());
    groups.get(g).set(v.name, []);
  }
  for (const r of records) if (r.metrics[metric]) groups.get(r.group)?.get(r.variant)?.push(r.metrics[metric].value);
  for (const [g, builds] of groups) {
    for (const [b, xs] of builds) if (!xs.length) builds.delete(b);
    if (!builds.size) groups.delete(g);
  }
  return groups;
}

export function buildReport(records, env, { resamples = 10000 } = {}) {
  const { config, seed } = env;
  const used = records.filter((r) => !r.warmup && !r.errors);
  const failed = records.filter((r) => r.errors).length;
  const metrics = [];
  for (const r of used) for (const [m, { unit }] of Object.entries(r.metrics)) if (!metrics.some((x) => x.m === m)) metrics.push({ m, unit });
  metrics.sort((a, b) => (a.m < b.m ? -1 : a.m > b.m ? 1 : 0));
  const rng = mulberry32(seed);
  const L = ["# Measurement report", "", `Seed ${seed}; ${resamples} hierarchical bootstrap resamples (layout builds, then invocations); 95% percentile intervals. All metrics are treated as lower-is-better. Claim rule: "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds the A/A ratio CI half-width; otherwise "no measurable difference".`, ""];
  if (failed) L.push(`**${failed} failed invocation(s) in raw.jsonl were excluded; the run is incomplete.**`, "");
  for (const { m, unit } of metrics) {
    const groups = collect(used, m, config);
    const reps = new Map();
    for (const [g, builds] of groups) reps.set(g, hierBootstrap([...builds.values()], resamples, rng));
    const pooled = (g) => median([...groups.get(g).values()].flat());
    let aaHalf = null;
    let aaLine = "A/A: not configured; no claims are made.";
    if (config.aa && config.aa.every((g) => groups.has(g))) {
      const [a, b] = config.aa;
      const ci = ci95(ratioReps(reps.get(a), reps.get(b)));
      aaHalf = (ci[1] - ci[0]) / 2;
      aaLine = `A/A (${a} / ${b}): ratio ${fmt(pooled(a) / pooled(b))}, 95% CI ${fci(ci)}, half-width ${fmt(aaHalf)} (noise floor).`;
    }
    const base = config.baseline && groups.has(config.baseline) ? config.baseline : null;
    L.push(`## ${m}${unit ? ` (${unit})` : ""}`, "", row(["group", "builds", "n", "median", "95% CI", base ? `ratio vs ${base}` : "ratio", "ratio 95% CI", "verdict"]), row(Array(8).fill("---")));
    for (const [g, builds] of groups) {
      const n = [...builds.values()].reduce((s, xs) => s + xs.length, 0);
      const cells = [g, builds.size, n, fmt(pooled(g)), fci(ci95(reps.get(g)))];
      if (!base) cells.push("n/a", "n/a", "no baseline");
      else if (g === base) cells.push("1", "n/a", "baseline");
      else {
        const ratio = pooled(g) / pooled(base);
        const ci = ci95(ratioReps(reps.get(g), reps.get(base)));
        cells.push(fmt(ratio), fci(ci), verdict(ratio, ci, aaHalf));
      }
      L.push(row(cells));
    }
    L.push("", aaLine, "", "Per-build diagnostics (plain bootstrap over each build's own invocations):", "", row(["group", "build", "n", "median", "95% CI"]), row(Array(5).fill("---")));
    for (const [g, builds] of groups)
      for (const [b, xs] of builds) L.push(row([g, b, xs.length, fmt(median(xs)), fci(ci95(hierBootstrap([xs], resamples, rng)))]));
    L.push("");
  }
  const e0 = env.before ?? {};
  const e1 = env.after ?? {};
  L.push("## Environment", "", `- CPU: ${e0.cpu_model ?? "unavailable"}`, `- governor / driver: ${e0.governor ?? "unavailable"} / ${e0.pstate_driver ?? "unavailable"}`, `- boost: ${e0.boost ?? "unavailable"} (intel no_turbo: ${e0.intel_no_turbo ?? "unavailable"})`, `- SMT: control ${e0.smt_control ?? "unavailable"}, active ${e0.smt_active ?? "unavailable"}`);
  if (e0.pinned_cpu_siblings) L.push(`- pinned CPU siblings: ${e0.pinned_cpu_siblings} (online: ${e0.pinned_cpu_online})`);
  L.push(`- loadavg before / after: ${e0.loadavg ?? "unavailable"} / ${e1.loadavg ?? "unavailable"}`, "");
  return L.join("\n");
}
