#!/usr/bin/env bun
// analyze.mjs - confound analysis of the committed live-host results; writes deterministic tables to results/analysis/.
// usage: bun live-host-measurement-confounds/analysis/analyze.mjs [--out <dir>] | --help | --build | --version
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "../../scripts/lib/build-id.mjs";
import { B, BASE_SEED, fnv1a, mulberry32, bootMedian, ci95, classify, clopperPearson, median, percentile, ratioReps, relIqr } from "./stats.mjs";
import { verdict } from "../../scripts/lib/measure-stats.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`usage: analyze.mjs [--out <dir>]
       analyze.mjs --help | --build | --version
Reads the committed results (results/{live,laptop,night1,night2,night3}/ and the round-5 laptop K1 data of
sqlite-parse-number-rust-tuning) and writes deterministic confound tables (seeded bootstrap, ${B} resamples) to
results/analysis/ (default) or <dir>: summary.md, contrasts.tsv, k1-verdicts.tsv, badmode.tsv, hosttrace.tsv.
No network, no measurement; the same input gives byte-identical output.`);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: fileURLToPath(import.meta.url), name: "analyze" });
if (rc !== null) process.exit(rc);

const HERE = dirname(dirname(fileURLToPath(import.meta.url))); // the investigation folder
const RES = join(HERE, "results");
const R5 = join(HERE, "..", "sqlite-parse-number-rust-tuning", "results", "round5", "mixed", "raw.jsonl");
const oi = argv.indexOf("--out");
const OUT = oi >= 0 ? argv[oi + 1] : join(RES, "analysis");

// ---------- choices (documented in README and notes) ----------
const HOME_NIGHT = { I0: "night1", I2: "night2", I1: "night3", I3: "night3" }; // the night holding each level's L0-full cell
const K1_BASE = "c-gcc-O2";
const K1_AA = ["c-gcc-O3-pgo", "c-gcc-O3-pgo-copy"];
const K1_GROUPS = ["c-gcc-O3-pgo", "safe-std-gcc-o2", "raw-nostd-gcc-o2"];
// effect size that matters, as a fraction of the reference value (a choice, see README "Thresholds")
const MATTERS = { "k1-abs": 0.03, "k1-ratio": 0.02, k5: 0.01, k2: 0.1, k3: 0.1, "k3-120": 0.1, k3s: 0.05, "k4-warm": 0.1, "k4-cold": 0.1, "k4-cold-local": 0.1 };
const METRICS = {
  k2: ["view_p95_ms", "daemon_cpu_s", "dupes_scan_p95_ms", "link_scan_all_p95_ms", "anon_settled_mib"],
  k3: ["anon_settled_mib", "anon_peak_mib", "view_p95_ms", "daemon_cpu_s"],
  "k3-120": ["anon_settled_mib", "anon_peak_mib", "view_p95_ms", "daemon_cpu_s"],
  k3s: ["settled_rss_mib", "peak_rss_mib", "arenas"],
  "k4-warm": ["read_ms"],
  "k4-cold": ["read_ms"],
  "k4-cold-local": ["read_ms"],
};
const PRIMARY = { "k1-abs": "ns_per_row", k5: "instr_per_row", k2: "view_p95_ms", k3: "anon_settled_mib", "k3-120": "anon_settled_mib", k3s: "settled_rss_mib", "k4-warm": "read_ms", "k4-cold": "read_ms" };
const BAD_MODE_MIB = 75; // cvblock.sh: bad_mode = settled anon > 75 MiB (the reference spike's bad-mode boundary)

// ---------- loading ----------
const readJsonl = (p) => readFileSync(p, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
const keep = (rows) => rows.filter((r) => !r.warmup && r.exit === 0);
const cells = new Map(); // id "night1/I0-L0-full" -> { win, name, iso, load, kind, classes: Map(class -> rows) }
for (const win of ["live", "night1", "night2", "night3"]) {
  const wd = join(RES, win);
  for (const name of readdirSync(wd).sort()) {
    const cd = join(wd, name);
    if (!statSync(cd).isDirectory()) continue;
    const m = /^(I\d)-(L\w+?)-(.+)$/.exec(name);
    if (!m) continue;
    const classes = new Map();
    for (const k of readdirSync(cd).sort()) if (existsSync(join(cd, k, "raw.jsonl"))) classes.set(k, keep(readJsonl(join(cd, k, "raw.jsonl"))));
    cells.set(`${win}/${name}`, { id: `${win}/${name}`, win, name, iso: m[1], load: m[2], kind: m[3], dir: cd, classes });
  }
}
const laptop = new Map();
for (const k of ["k2", "k3", "k3-120", "k3s"]) laptop.set(k, keep(readJsonl(join(RES, "laptop", k, "raw.jsonl"))));
const r5 = keep(readJsonl(R5));

// ---------- quantities ----------
const vals = (rows, metric, pred = () => true) => rows.filter(pred).filter((r) => r.metrics[metric]).map((r) => r.metrics[metric].value);
const byVariant = (rows, metric, group) => {
  const m = new Map();
  for (const r of rows) if (r.group === group && r.metrics[metric]) (m.get(r.variant) ?? m.set(r.variant, []).get(r.variant)).push(r.metrics[metric].value);
  return [...m.keys()].sort().map((k) => m.get(k));
};
const qcache = new Map();
/** Quantity: median (or ratio of medians) with bootstrap replicates, A/A half-width and relative IQR. */
function quantity(src, rows, cls, metric) {
  const key = `${src}|${cls}|${metric}`;
  if (qcache.has(key)) return qcache.get(key);
  let q = null;
  if (cls === "k1-abs" || cls === "k5") {
    const builds = byVariant(rows, metric, K1_BASE);
    if (builds.length) {
      const flat = builds.flat();
      q = { point: median(flat), reps: bootMedian(builds, key), aaHw: k1AaHw(src, rows, metric), disp: relIqr(flat), n: flat.length };
    }
  } else if (cls.startsWith("k1-ratio:")) {
    const g = cls.slice(9);
    const bg = byVariant(rows, metric, g), bb = byVariant(rows, metric, K1_BASE);
    if (bg.length && bb.length) {
      const rg = bootMedian(bg, `${key}|g`), rb = bootMedian(bb, `${key}|b`);
      q = { point: median(bg.flat()) / median(bb.flat()), reps: ratioReps(rg, rb), aaHw: k1AaHw(src, rows, metric), disp: relIqr(bb.flat()), n: bg.flat().length };
    }
  } else {
    const all = vals(rows, metric);
    if (all.length) {
      const groups = [...new Set(rows.map((r) => r.group))].sort((a, b) => a.length - b.length || (a < b ? -1 : 1));
      const a = vals(rows, metric, (r) => r.group === groups[0]), c = vals(rows, metric, (r) => r.group === groups[1]);
      let aaHw = null;
      if (a.length && c.length) {
        const [lo, hi] = ci95(ratioReps(bootMedian([a], `${key}|aa`), bootMedian([c], `${key}|aac`)));
        aaHw = (hi - lo) / 2;
      }
      q = { point: median(all), reps: bootMedian([all], key), aaHw, disp: relIqr(all), n: all.length };
    }
  }
  qcache.set(key, q);
  return q;
}
function k1AaHw(src, rows, metric) {
  const key = `${src}|k1aa|${metric}`;
  if (qcache.has(key)) return qcache.get(key);
  const a = byVariant(rows, metric, K1_AA[0]), c = byVariant(rows, metric, K1_AA[1]);
  let hw = null;
  if (a.length && c.length) {
    const [lo, hi] = ci95(ratioReps(bootMedian(a, `${key}|a`), bootMedian(c, `${key}|c`)));
    hw = (hi - lo) / 2;
  }
  qcache.set(key, hw);
  return hw;
}
// K1 cross-cell contrasts pair layout builds: the same six layout builds run in every cell, and layout is the largest
// variance component, so a contrast draws the layout indices once per replicate and shares them between both cells.
const isK1 = (c) => c === "k1-abs" || c === "k5" || c.startsWith("k1-ratio:");
function layouts(rows, metric, group) {
  const m = new Map();
  for (const r of rows) if (r.group === group && r.metrics[metric]) {
    const k = /-(L\d+)$/.exec(r.variant)?.[1] ?? r.variant;
    (m.get(k) ?? m.set(k, []).get(k)).push(r.metrics[metric].value);
  }
  return m;
}
function pairedReps(maps, key) {
  const keys = [...maps[0].keys()].filter((k) => maps.every((m) => m.has(k))).sort();
  const rng = mulberry32((fnv1a(key) ^ BASE_SEED) >>> 0);
  const outs = maps.map(() => new Float64Array(B));
  const pool = new Float64Array(4096);
  for (let r = 0; r < B; r++) {
    const idx = keys.map(() => keys[Math.floor(rng() * keys.length)]);
    maps.forEach((m, j) => {
      let n = 0;
      for (const k of idx) { const xs = m.get(k); for (let i = 0; i < xs.length; i++) pool[n++] = xs[Math.floor(rng() * xs.length)]; }
      outs[j][r] = median(pool.subarray(0, n));
    });
  }
  return outs;
}
const pairedCache = new Map();
function k1PairedAa(src, rows, metric) {
  const key = `${src}|k1aa-paired|${metric}`;
  if (!pairedCache.has(key)) {
    const [a, c] = pairedReps([layouts(rows, metric, K1_AA[0]), layouts(rows, metric, K1_AA[1])], key);
    const [lo, hi] = ci95(ratioReps(a, c));
    pairedCache.set(key, (hi - lo) / 2);
  }
  return pairedCache.get(key);
}
function k1PairedContrast(srcA, rowsA, srcB, rowsB, cls, metric) {
  const key = `${srcA}|${srcB}|${cls}|${metric}`;
  const pair = (g, sfx) => pairedReps([layouts(rowsA, metric, g), layouts(rowsB, metric, g)], key + sfx);
  const [ab, bb] = pair(K1_BASE, "|b");
  if (!cls.startsWith("k1-ratio:")) return ratioReps(ab, bb);
  const [ag, bg] = pair(cls.slice(9), "|g");
  return ag.map((x, i) => (x / ab[i]) / (bg[i] / bb[i]));
}
/** Expand a cell's class into analysis "classes" (K1 splits into absolute, per-group ratios and instructions). */
function cellQuantities(src, cls, rows) {
  const out = [];
  if (cls === "k1") {
    out.push(["k1-abs", "ns_per_row"], ["k5", "instr_per_row"]);
    for (const g of K1_GROUPS) out.push([`k1-ratio:${g}`, "ns_per_row"]);
  } else for (const m of METRICS[cls] ?? []) out.push([cls, m]);
  return out.map(([c, m]) => ({ cls: c, metric: m, q: quantity(src, rows, c, m) })).filter((x) => x.q);
}
const rowsOf = (cellId, cls) => cells.get(cellId)?.classes.get(cls === "k1-abs" || cls === "k5" || cls.startsWith("k1-ratio:") ? "k1" : cls);
const qOf = (cellId, cls, metric) => {
  const rows = rowsOf(cellId, cls);
  return rows && rows.length ? quantity(cellId, rows, cls, metric) : null;
};
const baseClass = (c) => (c.startsWith("k1-ratio:") ? "k1-ratio" : c);

// ---------- formatting ----------
const f = (x, d = 4) => (x == null || Number.isNaN(x) ? "n/a" : x.toFixed(d));
const pct = (r) => (r == null ? "n/a" : `${r >= 1 ? "+" : ""}${((r - 1) * 100).toFixed(2)}%`);
const tsv = (rows) => rows.map((r) => r.join("\t")).join("\n") + "\n";
const md = (head, rows) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");

// ---------- repetition spread (home-night L0 cells of each level) ----------
const repSpread = new Map(); // `${iso}|${cls}|${metric}` -> max |r - 1| over pairs of home-night L0 cells
for (const iso of ["I0", "I1", "I2", "I3"]) {
  const ids = [...cells.values()].filter((c) => c.win === HOME_NIGHT[iso] && c.iso === iso && c.load === "L0").map((c) => c.id);
  const seen = new Map();
  for (const id of ids) for (const [cls, rows] of cells.get(id).classes) for (const x of cellQuantities(id, cls, rows)) {
    const k = `${iso}|${x.cls}|${x.metric}`;
    (seen.get(k) ?? seen.set(k, []).get(k)).push(x.q.point);
  }
  for (const [k, pts] of seen) if (pts.length >= 2) {
    let s = 0;
    for (const a of pts) for (const b of pts) s = Math.max(s, Math.abs(a / b - 1));
    repSpread.set(k, s);
  }
}

// ---------- contrasts ----------
/** A bias smaller than the effect size that matters is kept as a bias but labelled as such. */
const label = (cl, ratio, matters) => (cl === "bias" && Math.abs(ratio - 1) < matters ? "bias (below size that matters)" : cl);
const contrasts = [];
function contrast(kind, cellId, refId, cls, metric, extra = {}) {
  const q = qOf(cellId, cls, metric), r = qOf(refId, cls, metric);
  if (!q || !r) return null;
  const k1 = isK1(cls);
  const reps = k1 ? k1PairedContrast(cellId, rowsOf(cellId, cls), refId, rowsOf(refId, cls), cls, metric) : ratioReps(q.reps, r.reps);
  const [lo, hi] = ci95(reps);
  const ratio = q.point / r.point;
  const aa = k1 ? Math.max(k1PairedAa(cellId, rowsOf(cellId, cls), metric), k1PairedAa(refId, rowsOf(refId, cls), metric)) : Math.max(q.aaHw ?? 0, r.aaHw ?? 0);
  const spread = extra.spread ?? repSpread.get(`${cells.get(refId).iso}|${cls}|${metric}`) ?? null;
  const floor = Math.max(aa, spread ?? 0);
  const matters = MATTERS[baseClass(cls)];
  const dispRatio = r.disp > 0 ? q.disp / r.disp : q.disp > 0 ? Infinity : 1;
  const cl = label(classify({ r: ratio, lo, hi, floor, matters, dispRatio, disp: q.disp }), ratio, matters);
  const row = { kind, cell: cellId, ref: refId, cls, metric, n: q.n, nRef: r.n, cellMed: q.point, refMed: r.point, ratio, lo, hi, aa, spread, floor, matters, dispRatio, verdict: cl, note: extra.note ?? "" };
  contrasts.push(row);
  return row;
}
const L0FULL = (iso) => `${HOME_NIGHT[iso]}/${iso}-L0-full`;
// 1. load effects at Ix vs the same-night Ix-L0-full cell
for (const c of [...cells.values()].filter((c) => /^L[1-4]$/.test(c.load))) {
  for (const [cls, rows] of c.classes) for (const x of cellQuantities(c.id, cls, rows)) contrast("load", c.id, L0FULL(c.iso), x.cls, x.metric);
}
// 2. Llive (observational): day cell vs the same level's night L0-full cell
for (const c of [...cells.values()].filter((c) => c.load === "Llive")) {
  for (const [cls, rows] of c.classes) for (const x of cellQuantities(c.id, cls, rows)) {
    if (!contrast("llive", c.id, L0FULL(c.iso), x.cls, x.metric, { note: "observational (day vs night)" }))
      contrasts.push({ kind: "llive", cell: c.id, ref: L0FULL(c.iso), cls: x.cls, metric: x.metric, verdict: "no matching reference", note: "class not run in night cells" });
  }
}
// 3. controls' own effect, all classes: Ix-L0-full vs I0-L0-full (crosses nights for I1/I2/I3)
for (const iso of ["I1", "I2", "I3"]) {
  const c = cells.get(L0FULL(iso));
  for (const [cls, rows] of c.classes) for (const x of cellQuantities(c.id, cls, rows)) contrast("controls-crossnight", c.id, L0FULL("I0"), x.cls, x.metric, { note: `crosses ${HOME_NIGHT[iso]} vs night1` });
}

// 4. K1 within-night controls effect and night shift, from the pooled ref-start + ref-end cells of each level per night
const pooledK1 = new Map(); // `${win}|${iso}` -> rows
for (const c of cells.values()) if (/^ref-/.test(c.kind) && c.classes.has("k1")) {
  const k = `${c.win}|${c.iso}`;
  const rows = c.classes.get("k1"); // ref-start and ref-end run the same layout builds; their invocations pool per layout
  pooledK1.set(k, [...(pooledK1.get(k) ?? []), ...rows]);
}
const k1Pooled = (win, iso, cls, metric) => {
  const rows = pooledK1.get(`${win}|${iso}`);
  return rows ? quantity(`refs:${win}|${iso}`, rows, cls, metric) : null;
};
const k1Within = [];
const K1CLS = [["k1-abs", "ns_per_row"], ["k5", "instr_per_row"], ...K1_GROUPS.map((g) => [`k1-ratio:${g}`, "ns_per_row"])];
function k1Contrast(kind, a, b, cls, metric, lbl) {
  const q = k1Pooled(...a, cls, metric), r = k1Pooled(...b, cls, metric);
  if (!q || !r) return;
  const ka = `refs:${a.join("|")}`, kb = `refs:${b.join("|")}`, ra = pooledK1.get(a.join("|")), rb = pooledK1.get(b.join("|"));
  const [lo, hi] = ci95(k1PairedContrast(ka, ra, kb, rb, cls, metric));
  const ratio = q.point / r.point;
  const aa = Math.max(k1PairedAa(ka, ra, metric), k1PairedAa(kb, rb, metric));
  const matters = MATTERS[baseClass(cls)];
  const dispRatio = r.disp > 0 ? q.disp / r.disp : 1;
  k1Within.push({ kind, label: lbl, a: a.join("/"), b: b.join("/"), cls, metric, ratio, lo, hi, aa, matters, dispRatio, verdict: label(classify({ r: ratio, lo, hi, floor: aa, matters, dispRatio, disp: q.disp }), ratio, matters) });
}
for (const win of ["night1", "night2", "night3"]) for (const iso of ["I1", "I2", "I3"]) for (const [cls, m] of K1CLS) k1Contrast("k1-controls-within-night", [win, iso], [win, "I0"], cls, m, `${iso} vs I0, ${win}`);
for (const iso of ["I0", "I2", "I3"]) for (const win of ["night2", "night3"]) for (const [cls, m] of K1CLS) k1Contrast("k1-night-shift", [win, iso], ["night1", iso], cls, m, `${iso}: ${win} vs night1`);

// ---------- K1 R8 verdicts per cell and on the round-5 laptop data ----------
function k1Verdicts(src, rows) {
  const out = [];
  for (const metric of ["ns_per_row", "instr_per_row"]) {
    const aa = k1AaHw(src, rows, metric);
    for (const g of K1_GROUPS) {
      const q = quantity(src, rows, `k1-ratio:${g}`, metric);
      if (!q) continue;
      const [lo, hi] = ci95(q.reps);
      out.push({ src, metric, group: g, ratio: q.point, lo, hi, aa, verdict: verdict(q.point, [lo, hi], aa) });
    }
  }
  return out;
}
const k1v = [...k1Verdicts("laptop-round5", r5)];
for (const c of [...cells.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) if (c.classes.has("k1")) k1v.push(...k1Verdicts(c.id, c.classes.get("k1")));

// ---------- laptop vs workstation (host-topology factor; descriptive) ----------
const lapRows = [];
for (const [cls, rows] of laptop) for (const metric of METRICS[cls]) {
  const q = quantity("laptop", rows, cls, metric), r = qOf(L0FULL("I0"), cls, metric), r2 = qOf(L0FULL("I2"), cls, metric);
  for (const [refId, rr] of [[L0FULL("I0"), r], [L0FULL("I2"), r2]]) {
    if (!q || !rr) continue;
    const [lo, hi] = ci95(ratioReps(q.reps, rr.reps));
    lapRows.push({ cls, metric, ref: refId, lap: q.point, ws: rr.point, ratio: q.point / rr.point, lo, hi, lapAa: q.aaHw, wsAa: rr.aaHw });
  }
}

// ---------- crucible-vault bad mode ----------
const bad = [];
const badRow = (src, cls, rows) => {
  const b = vals(rows, "bad_mode"), s = vals(rows, "anon_settled_mib");
  const k = b.filter((v) => v === 1).length, n = b.length;
  const [lo, hi] = clopperPearson(k, n);
  const chk = s.filter((v) => v > BAD_MODE_MIB).length;
  bad.push({ src, cls, k, n, rate: n ? k / n : NaN, lo, hi, med: median(s), max: Math.max(...s), chk });
};
for (const c of [...cells.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) for (const cls of ["k3", "k3-120"]) if (c.classes.has(cls)) badRow(c.id, cls, c.classes.get(cls));
for (const cls of ["k3", "k3-120"]) badRow("laptop", cls, laptop.get(cls));
// pooled per class over the workstation night cells and per idle window
for (const cls of ["k3", "k3-120"]) {
  const rows = [...cells.values()].filter((c) => c.win !== "live" && c.classes.has(cls)).flatMap((c) => c.classes.get(cls));
  badRow(`workstation nights pooled`, cls, rows);
}

// ---------- host trace ----------
const trace = [];
const classTrace = [];
for (const c of [...cells.values()].sort((a, b) => (a.id < b.id ? -1 : 1))) {
  const p = join(c.dir, "sampler.tsv");
  if (!existsSync(p)) continue;
  const lines = readFileSync(p, "utf8").trim().split("\n");
  const head = lines[0].split("\t");
  const col = (name) => { const i = head.indexOf(name); return lines.slice(1).map((l) => Number(l.split("\t")[i])).filter((v) => Number.isFinite(v)); };
  const cpu = col("psi_cpu_some"), io = col("psi_io_some"), mf = col("psi_mem_full"), ma = col("mem_avail_kb"), u0 = col("util_ccd0"), u1 = col("util_ccd1");
  // per-class segments from cell.log (sampler t_s counts from the cell's begin line; avg10 lags by about 10 s)
  const logp = join(c.dir, "cell.log");
  if (existsSync(logp)) {
    const ts = (s) => Date.parse(`${s}Z`) / 1000;
    let t0 = null;
    const starts = new Map();
    const tcol = col("t_s");
    for (const l of readFileSync(logp, "utf8").split("\n")) {
      const m = /^(\S+) (begin|class (\S+) .*?(start|exit=))/.exec(l);
      if (!m) continue;
      if (m[2] === "begin") t0 = ts(m[1]);
      else if (m[4] === "start") starts.set(m[3], ts(m[1]) - t0);
      else if (starts.has(m[3])) {
        const a = starts.get(m[3]), b = ts(m[1]) - t0;
        const seg = cpu.filter((_, i) => tcol[i] >= a && tcol[i] <= b);
        if (seg.length) classTrace.push({ cell: c.id, cls: m[3], n: seg.length, med: median(seg), max: Math.max(...seg) });
      }
    }
  }
  trace.push({ cell: c.id, n: cpu.length, cpuMed: median(cpu), cpuMax: Math.max(...cpu), ioMed: median(io), ioMax: Math.max(...io), memFullMax: Math.max(...mf), memAvailMinGiB: Math.min(...ma) / 1048576, u0: median(u0), u1: median(u1) });
}

// ---------- write ----------
mkdirSync(OUT, { recursive: true });
const CH = ["kind", "cell", "ref", "class", "metric", "n", "n_ref", "cell_median", "ref_median", "ratio", "ci_lo", "ci_hi", "aa_halfwidth", "rep_spread", "floor", "matters", "disp_ratio", "verdict", "note"];
writeFileSync(join(OUT, "contrasts.tsv"), tsv([CH, ...contrasts.map((r) => [r.kind, r.cell, r.ref, r.cls, r.metric, r.n ?? "", r.nRef ?? "", f(r.cellMed), f(r.refMed), f(r.ratio, 6), f(r.lo, 6), f(r.hi, 6), f(r.aa), f(r.spread), f(r.floor), f(r.matters, 2), f(r.dispRatio, 2), r.verdict, r.note])]));
writeFileSync(join(OUT, "k1-within-night.tsv"), tsv([["kind", "label", "cell_refs", "ref_refs", "class", "metric", "ratio", "ci_lo", "ci_hi", "aa_halfwidth", "matters", "disp_ratio", "verdict"], ...k1Within.map((r) => [r.kind, r.label, r.a, r.b, r.cls, r.metric, f(r.ratio, 6), f(r.lo, 6), f(r.hi, 6), f(r.aa), f(r.matters, 2), f(r.dispRatio, 2), r.verdict])]));
writeFileSync(join(OUT, "k1-verdicts.tsv"), tsv([["source", "metric", "group", "ratio_vs_c-gcc-O2", "ci_lo", "ci_hi", "aa_halfwidth", "verdict"], ...k1v.map((r) => [r.src, r.metric, r.group, f(r.ratio, 6), f(r.lo, 6), f(r.hi, 6), f(r.aa, 6), r.verdict])]));
writeFileSync(join(OUT, "badmode.tsv"), tsv([["source", "class", "bad", "n", "rate", "cp95_lo", "cp95_hi", "settled_median_mib", "settled_max_mib", "settled_gt_75"], ...bad.map((r) => [r.src, r.cls, r.k, r.n, f(r.rate, 3), f(r.lo, 3), f(r.hi, 3), f(r.med, 2), f(r.max, 2), r.chk])]));
writeFileSync(join(OUT, "hosttrace.tsv"), tsv([["cell", "samples", "psi_cpu_some_median", "psi_cpu_some_max", "psi_io_some_median", "psi_io_some_max", "psi_mem_full_max", "mem_available_min_gib", "util_ccd0_median", "util_ccd1_median"], ...trace.map((r) => [r.cell, r.n, f(r.cpuMed, 2), f(r.cpuMax, 2), f(r.ioMed, 2), f(r.ioMax, 2), f(r.memFullMax, 2), f(r.memAvailMinGiB, 1), f(r.u0, 1), f(r.u1, 1)])]));
writeFileSync(join(OUT, "hosttrace-class.tsv"), tsv([["cell", "class", "samples", "psi_cpu_some_median", "psi_cpu_some_max"], ...classTrace.map((r) => [r.cell, r.cls, r.n, f(r.med, 2), f(r.max, 2)])]));
writeFileSync(join(OUT, "laptop.tsv"), tsv([["class", "metric", "workstation_ref", "laptop_median", "workstation_median", "ratio_laptop_over_ws", "ci_lo", "ci_hi", "laptop_aa_halfwidth", "ws_aa_halfwidth"], ...lapRows.map((r) => [r.cls, r.metric, r.ref, f(r.lap, 2), f(r.ws, 2), f(r.ratio, 6), f(r.lo, 6), f(r.hi, 6), f(r.lapAa), f(r.wsAa)])]));

// summary.md: the primary metric per class, compact
const S = [];
S.push("# Confound analysis tables", "", `Generated by \`analysis/analyze.mjs\` from the committed results; ${B} seeded bootstrap resamples per quantity (hierarchical over layout builds for K1), 95% percentile intervals. Ratios are cell over reference (lower is better for every metric). Floor = max(A/A ratio CI half-width of either cell, home-night repetition spread of the reference level). Full rows: \`contrasts.tsv\`, \`k1-within-night.tsv\`, \`k1-verdicts.tsv\`, \`badmode.tsv\`, \`laptop.tsv\`, \`hosttrace.tsv\`.`, "");
S.push("Effect size that matters (choice): " + Object.entries(MATTERS).map(([k, v]) => `${k} ${(v * 100).toFixed(0)}%`).join(", ") + ". Noise only: within-cell relative IQR at least 2x the reference's and at least half the size that matters.", "");
const prim = (r) => (r.cls.startsWith("k1-ratio:") ? true : PRIMARY[r.cls] === r.metric);
const ctab = (kind, title) => {
  const rows = contrasts.filter((r) => r.kind === kind && prim(r) && r.ratio != null);
  S.push(`## ${title}`, "", md(["cell", "reference", "class", "metric", "ratio", "95% CI", "floor", "disp x", "verdict"], rows.map((r) => [r.cell, r.ref, r.cls, r.metric, f(r.ratio, r.cls === "k5" ? 6 : 4), `[${f(r.lo, r.cls === "k5" ? 6 : 4)}, ${f(r.hi, r.cls === "k5" ? 6 : 4)}]`, f(r.floor), f(r.dispRatio, 2), r.verdict])), "");
};
ctab("load", "Load effects (Ix-Ly vs the same night's Ix-L0-full)");
ctab("controls-crossnight", "Controls' own effect, all classes (Ix-L0-full vs I0-L0-full; crosses nights)");
S.push("## K1 controls' own effect within a night and night shift (pooled ref-start + ref-end K1 cells)", "", md(["contrast", "class", "ratio", "95% CI", "A/A floor", "verdict"], k1Within.map((r) => [r.label, r.cls, f(r.ratio, r.cls === "k5" ? 6 : 4), `[${f(r.lo, r.cls === "k5" ? 6 : 4)}, ${f(r.hi, r.cls === "k5" ? 6 : 4)}]`, f(r.aa), r.verdict])), "");
ctab("llive", "Llive (observational: day cell vs the same level's night L0-full cell)");
S.push("## crucible-vault bad mode (settled anon > 75 MiB), Clopper-Pearson 95%", "", md(["source", "class", "bad / n", "rate", "95% CI", "settled median", "settled max"], bad.map((r) => [r.src, r.cls, `${r.k} / ${r.n}`, f(r.rate, 3), `[${f(r.lo, 3)}, ${f(r.hi, 3)}]`, f(r.med, 2), f(r.max, 2)])), "");
S.push("## K1 claim verdicts (R8) per source, ns_per_row", "", md(["source", "group", "ratio vs c-gcc-O2", "95% CI", "A/A half-width", "verdict"], k1v.filter((r) => r.metric === "ns_per_row").map((r) => [r.src, r.group, f(r.ratio), `[${f(r.lo)}, ${f(r.hi)}]`, f(r.aa, 5), r.verdict])), "");
S.push("## Laptop over workstation (host-topology factor, descriptive)", "", md(["class", "metric", "workstation ref", "laptop", "workstation", "ratio", "95% CI"], lapRows.map((r) => [r.cls, r.metric, r.ref, f(r.lap, 2), f(r.ws, 2), f(r.ratio), `[${f(r.lo)}, ${f(r.hi)}]`])), "");
S.push("## Host trace per cell (0.5 s sampler, avg10 PSI)", "", md(["cell", "cpu some med", "cpu some max", "io some max", "mem full max", "MemAvailable min GiB", "CCD0 util med", "CCD1 util med"], trace.map((r) => [r.cell, f(r.cpuMed, 2), f(r.cpuMax, 2), f(r.ioMax, 2), f(r.memFullMax, 2), f(r.memAvailMinGiB, 1), f(r.u0, 1), f(r.u1, 1)])), "");
writeFileSync(join(OUT, "summary.md"), S.join("\n"));
console.log(`analyze: wrote ${OUT} (${contrasts.length} contrasts, ${k1Within.length} K1 within-night rows, ${bad.length} bad-mode rows)`);
