// analyze.mjs - per-source summaries from a results directory's raw.jsonl (warm-up rounds excluded).
// usage: bun analyze.mjs slope <dir>    least-squares slope and intercept of each source against the workload size N
//        bun analyze.mjs spread <dir>   per-variant min / median / max and relative range of each metric
// Writes <dir>/slopes.md or <dir>/spread.md and prints it. Descriptive statistics of the recorded invocations only
// (the confidence intervals and verdicts are the driver's report.md).
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [cmd, dir] = process.argv.slice(2);
if (cmd === "--help" || cmd === "-h") { console.log("usage: analyze.mjs slope|spread <results-dir>\nWrites slopes.md or spread.md beside raw.jsonl."); process.exit(0); }
if (cmd === "--build" || cmd === "--version") { console.log("unknown"); process.exit(0); }
if (!["slope", "spread"].includes(cmd) || !dir) { console.error("usage: analyze.mjs slope|spread <results-dir>"); process.exit(2); }
const rows = readFileSync(join(dir, "raw.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.warmup);
const env = JSON.parse(readFileSync(join(dir, "env.json"), "utf8"));
const sig = (x, d = 4) => (x === 0 ? "0" : Number(x.toPrecision(d)).toString());
const med = (a) => { const s = [...a].sort((p, q) => p - q); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const metrics = [...new Set(rows.flatMap((r) => Object.keys(r.metrics)))];
let md = "";
if (cmd === "slope") {
  const nOf = {};
  for (const v of env.config.variants) { const i = v.argv.findIndex((t) => t === "lat" || t === "thr"); nOf[v.name] = Number(v.argv[i + 1]); }
  const sizes = [...new Set(Object.values(nOf))].sort((a, b) => a - b);
  const mid = sizes[Math.floor(sizes.length / 2)];
  md += `Workload sizes N (loop iterations): ${sizes.join(", ")}; ${rows.length} invocations in the fit (warm-up rounds excluded). Slope is per 1e8 iterations. "N=0 median" is the zero-work control (the source's intercept); "N=0 share" is that median over the median at N=${mid}.\n\n`;
  md += "| source | unit | N=0 median | OLS intercept | OLS slope per 1e8 | R^2 | N=0 share |\n| --- | --- | --- | --- | --- | --- | --- |\n";
  for (const m of metrics.filter((m) => !["sibling_busy", "cpuset_ncpus"].includes(m))) {
    const pts = rows.map((r) => [nOf[r.variant] / 1e8, r.metrics[m].value]);
    const n = pts.length, mx = pts.reduce((s, p) => s + p[0], 0) / n, my = pts.reduce((s, p) => s + p[1], 0) / n;
    const sxx = pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0), sxy = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0);
    const syy = pts.reduce((s, p) => s + (p[1] - my) ** 2, 0);
    const b = sxy / sxx, a = my - b * mx, r2 = syy === 0 ? 1 : (sxy * sxy) / (sxx * syy);
    const at = (N) => med(rows.filter((r) => nOf[r.variant] === N).map((r) => r.metrics[m].value));
    const zero = at(0), midv = at(mid);
    const unit = rows.find((r) => r.metrics[m]).metrics[m].unit;
    md += `| \`${m}\` | ${unit || "count"} | ${sig(zero)} | ${sig(a)} | ${sig(b)} | ${sig(r2, 6)} | ${midv ? sig((100 * zero) / midv, 3) + "%" : "n/a"} |\n`;
  }
} else {
  md += `Per-invocation spread, ${rows.length} recorded invocations (warm-up rounds excluded); range = (max - min) / median.\n\n`;
  md += "| variant | metric | n | min | median | max | range |\n| --- | --- | --- | --- | --- | --- | --- |\n";
  const variants = [...new Set(rows.map((r) => r.variant))];
  for (const v of variants) for (const m of metrics) {
    const xs = rows.filter((r) => r.variant === v && r.metrics[m]).map((r) => r.metrics[m].value);
    if (!xs.length || ["cpuset_ncpus"].includes(m)) continue;
    const lo = Math.min(...xs), hi = Math.max(...xs), md_ = med(xs);
    md += `| ${v} | \`${m}\` | ${xs.length} | ${sig(lo)} | ${sig(md_)} | ${sig(hi)} | ${md_ ? sig((100 * (hi - lo)) / md_, 3) + "%" : "n/a"} |\n`;
  }
}
writeFileSync(join(dir, cmd === "slope" ? "slopes.md" : "spread.md"), md);
process.stdout.write(md);
