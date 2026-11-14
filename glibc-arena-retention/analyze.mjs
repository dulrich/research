// analyze.mjs - derives the truth checks of the claim classes from results/<r|s|p>/raw.jsonl and writes results/<class>/truth.md.
// usage: bun glibc-arena-retention/analyze.mjs      (warm-up rounds are excluded, as in the driver's report)
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";
import { clopperPearson, newcombeDiff, percentile } from "../scripts/lib/measure-stats.mjs";

const HELP = `usage: analyze.mjs
       analyze.mjs --help | --build | --version

Reads results/r/raw.jsonl, results/s/raw.jsonl and results/p/raw.jsonl (warm-up rounds excluded) and writes
results/<class>/truth.md for each class whose raw.jsonl exists:
  r  rate recovery: per variant k/n with a Clopper-Pearson 95% interval against the configured bad-mode probability,
     the draw check, and Newcombe differences (p25 vs p50, p25 vs p25b) at the first 20 invocations and at all.
  s  settle-window bias: per window the observed late-free bad rate against the truth share (release_actual_s > window),
     with invocations within 0.25 s of a window edge reported as ambiguous; the no-late-free control per window.
  p  spread: settled distribution of the pool mode and the bad rate at 12, 30 and 60 MiB.
Exit status 2: usage error.
`;
const args = process.argv.slice(2);
if (args.includes("--help")) { process.stdout.write(HELP); process.exit(0); }
const rc = handleBuildFlags(args, { path: import.meta.filename, name: "analyze" });
if (rc !== null) process.exit(rc);
if (args.length) { process.stderr.write(`analyze.mjs: unexpected argument '${args[0]}'\n${HELP}`); process.exit(2); }

const here = dirname(fileURLToPath(import.meta.url));
const AMBIG = 0.25; // s: boundary-detection lag plus one 0.1 s interval (pilot notes)
const f = (x, d = 3) => x.toFixed(d);
const ci = (k, n) => { const [a, b] = clopperPearson(k, n); return `[${f(a)}, ${f(b)}]`; };
const nci = (k1, n1, k2, n2) => { const r = newcombeDiff(k1, n1, k2, n2); return `${f(r.d)} [${f(r.lo)}, ${f(r.hi)}]`; };
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

function load(cls) {
  const file = join(here, "results", cls, "raw.jsonl");
  if (!existsSync(file)) return null;
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).filter((r) => !r.warmup);
  rows.sort((a, b) => a.round - b.round || a.order - b.order);
  const by = {};
  for (const r of rows) {
    const m = Object.fromEntries(Object.entries(r.metrics).map(([k, o]) => [k, o.value]));
    (by[r.variant] ??= []).push({ round: r.round, ...m });
  }
  return by;
}
const need = (by, name) => { if (!by[name]) throw new Error(`variant ${name} missing`); return by[name]; };

function classR(by) {
  const P = { p0: 0, p25: 0.25, p25b: 0.25, p50: 0.5 };
  const out = ["# Class R truth checks: rate recovery", "",
    "Source: `results/r/raw.jsonl`, warm-up excluded. Rate `bad_mode_<S>s` = anon above the pilot-fixed 12 MiB threshold at window S after the boundary; truth is the program's `bad_drawn`. Rigor: standard (rate claims, M7); CP = Clopper-Pearson 95%.", "",
    "## Per variant", "", "| variant | configured p | n | window | k bad | k/n | CP 95% | contains p |", "| --- | --- | --- | --- | --- | --- | --- | --- |"];
  const draw = [];
  for (const [v, p] of Object.entries(P)) {
    const rows = need(by, v), n = rows.length;
    for (const w of [0, 2]) {
      const k = sum(rows.map((r) => r[`bad_mode_${w}s`]));
      const [lo, hi] = clopperPearson(k, n);
      out.push(`| ${v} | ${p} | ${n} | ${w} s | ${k} | ${f(k / n)} | ${ci(k, n)} | ${lo <= p && p <= hi ? "yes" : "NO"} |`);
    }
    const kd = sum(rows.map((r) => r.bad_drawn));
    const [lo, hi] = clopperPearson(kd, n);
    const agree = rows.filter((r) => r.bad_mode_0s === r.bad_drawn).length;
    draw.push(`| ${v} | ${p} | ${n} | ${kd} | ${f(kd / n)} | ${ci(kd, n)} | ${lo <= p && p <= hi ? "yes" : "NO"} | ${agree}/${n} |`);
  }
  out.push("", "## Draw check (ground truth `bad_drawn` against p) and probe agreement", "",
    "| variant | configured p | n | k drawn bad | share | CP 95% | contains p | `bad_mode_0s` equals `bad_drawn` |", "| --- | --- | --- | --- | --- | --- | --- | --- |", ...draw);
  out.push("", "## Differences in the bad rate (window 0 s, Newcombe hybrid score 95%; difference = first minus second)", "",
    "| comparison | subset | n each | k1/n1 | k2/n2 | difference [95%] | excludes 0 |", "| --- | --- | --- | --- | --- | --- | --- |");
  for (const [a, b] of [["p25", "p50"], ["p25", "p25b"]]) {
    for (const m of [20, null]) {
      const ra = need(by, a).slice(0, m ?? undefined), rb = need(by, b).slice(0, m ?? undefined);
      const k1 = sum(ra.map((r) => r.bad_mode_0s)), k2 = sum(rb.map((r) => r.bad_mode_0s));
      const r = newcombeDiff(k1, ra.length, k2, rb.length);
      out.push(`| ${a} vs ${b}${b === "p25b" ? " (A/A floor)" : ""} | ${m ? `first ${m}` : "all"} | ${ra.length} | ${k1}/${ra.length} | ${k2}/${rb.length} | ${nci(k1, ra.length, k2, rb.length)} | ${r.lo > 0 || r.hi < 0 ? "yes" : "no"} |`);
    }
  }
  return out.join("\n") + "\n";
}

function classS(by) {
  const late = need(by, "late10"), nolate = need(by, "nolate");
  const ws = Object.keys(late[0]).map((k) => /^bad_mode_(\d+)s$/.exec(k)).filter(Boolean).map((m) => Number(m[1])).sort((a, b) => a - b);
  const delays = late.map((r) => r.release_actual_s);
  const out = ["# Class S truth checks: settle-window bias", "",
    `Source: \`results/s/raw.jsonl\`, warm-up excluded; \`late10\` n=${late.length} (bad mode always present, late free at a delay uniform in [0, 10 s]), \`nolate\` n=${nolate.length} (control). Truth per invocation: bad at window S iff the emitted \`release_actual_s\` > S (the program's monotonic clock; -1 means no release, always bad). Ambiguous: |release_actual_s - S| <= ${AMBIG} s (boundary-detection lag 0.04-0.17 s plus one 0.1 s sampling interval). Rigor: standard for rates (M7), indicative for the timing margin.`, "",
    `Emitted delays (s, sorted): ${[...delays].sort((a, b) => a - b).map((d) => f(d, 2)).join(", ")}`, "",
    "## late10 per window", "", "| window | n | observed bad k/n | observed rate | truth share (delay > S) | ambiguous (n) | ambiguous observed bad | outside band n | outside band agree | outside band mismatches |", "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |"];
  for (const w of ws) {
    const obs = late.map((r) => r[`bad_mode_${w}s`]);
    const truth = late.map((r) => (r.release_actual_s < 0 || r.release_actual_s > w ? 1 : 0));
    const amb = late.map((r) => r.release_actual_s >= 0 && Math.abs(r.release_actual_s - w) <= AMBIG);
    const k = sum(obs), t = sum(truth), n = late.length;
    const na = sum(amb.map(Number)), ka = sum(obs.filter((_, i) => amb[i]));
    const idx = late.map((_, i) => i).filter((i) => !amb[i]);
    const agree = idx.filter((i) => obs[i] === truth[i]).length;
    out.push(`| ${w} s | ${n} | ${k}/${n} | ${f(k / n)} | ${t}/${n} = ${f(t / n)} | ${na} | ${ka} | ${idx.length} | ${agree}/${idx.length} | ${idx.length - agree} |`);
  }
  const mism = [];
  for (const w of ws) late.forEach((r, i) => {
    const t = r.release_actual_s < 0 || r.release_actual_s > w ? 1 : 0;
    if (r[`bad_mode_${w}s`] !== t && !(r.release_actual_s >= 0 && Math.abs(r.release_actual_s - w) <= AMBIG)) mism.push(`window ${w} s, delay ${f(r.release_actual_s)} s (observed ${r[`bad_mode_${w}s`]}, truth ${t})`);
  });
  out.push("", `Mismatches outside the ambiguous band: ${mism.length ? mism.join("; ") : "none"}.`);
  const dev = Math.max(...late.map((r) => Math.abs(r.release_actual_s - r.release_delay_s)));
  out.push(`Largest |release_actual_s - release_delay_s| over late10: ${f(dev)} s.`);
  out.push("", "## nolate control per window (expected all bad)", "", "| window | n | bad k/n | CP 95% |", "| --- | --- | --- | --- |");
  for (const w of ws) { const k = sum(nolate.map((r) => r[`bad_mode_${w}s`])); out.push(`| ${w} s | ${nolate.length} | ${k}/${nolate.length} | ${ci(k, nolate.length)} |`); }
  return out.join("\n") + "\n";
}

function classP(by) {
  const rows = need(by, "pool"), n = rows.length;
  const dist = (w) => {
    const xs = rows.map((r) => r[`anon_settled_${w}s_mib`]).sort((a, b) => a - b);
    return { xs, line: `| ${w} s | ${n} | ${f(xs[0], 2)} | ${f(percentile(xs, 0.25), 2)} | ${f(percentile(xs, 0.5), 2)} | ${f(percentile(xs, 0.75), 2)} | ${f(xs[n - 1], 2)} |` };
  };
  const d0 = dist(0), d3 = dist(3);
  const out = ["# Class P truth checks: continuous spread", "",
    `Source: \`results/p/raw.jsonl\`, warm-up excluded, n=${n} (pool mode: 4 workers, 12 requests, trim). Metric: cgroup anon (MiB) at the settle window. Thresholds fixed before looking: 12 MiB (the pilot's bad-mode threshold), 30 and 60 MiB. Rigor: indicative (levels); the threshold rates are standard-format rates but have no known truth in pool mode (\`bad_drawn\` = -1).`, "",
    "## Settled distribution (MiB; quartiles by linear interpolation)", "", "| window | n | min | Q1 | median | Q3 | max |", "| --- | --- | --- | --- | --- | --- | --- |", d0.line, d3.line, "",
    `Sorted values at 0 s (MiB): ${d0.xs.map((x) => f(x, 1)).join(", ")}`, "",
    "## Bad rate by threshold (window 0 s)", "", "| threshold | k above | k/n | CP 95% |", "| --- | --- | --- | --- |"];
  for (const t of [12, 30, 60]) { const k = d0.xs.filter((x) => x > t).length; out.push(`| ${t} MiB | ${k} | ${k}/${n} | ${ci(k, n)} |`); }
  const agree = rows.filter((r) => r.bad_mode_0s === (r.anon_settled_0s_mib > 12 ? 1 : 0)).length;
  out.push("", `Driver \`bad_mode_0s\` (12 MiB) matches the 12 MiB row above in ${agree}/${n} invocations.`);
  return out.join("\n") + "\n";
}

for (const [cls, fn] of [["r", classR], ["s", classS], ["p", classP]]) {
  const by = load(cls);
  if (!by) continue;
  writeFileSync(join(here, "results", cls, "truth.md"), fn(by));
  process.stdout.write(`wrote results/${cls}/truth.md\n`);
}
