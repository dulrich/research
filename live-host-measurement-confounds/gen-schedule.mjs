#!/usr/bin/env bun
// gen-schedule.mjs - writes schedule.json (the frozen cell schedule) from the design below and the pilot cost model.
// usage: bun live-host-measurement-confounds/gen-schedule.mjs [--out <file>] | --help | --build | --version
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`usage: gen-schedule.mjs [--out <file>]
       gen-schedule.mjs --help | --build | --version
Writes the frozen schedule: day cells and three night windows each with a quiet reference cell at the start and the
end (cheap classes) around a seeded random order of the window's cells. Wall estimates come from the pilot cost model in this file.`);
  process.exit(0);
}
if (argv.includes("--build") || argv.includes("--version")) {
  console.log(spawnSync("sh", [join(here, "ctl"), "--build"], { encoding: "utf8" }).stdout.trim());
  process.exit(0);
}
const oi = argv.indexOf("--out");
const outFile = oi >= 0 ? argv[oi + 1] : join(here, "schedule.json");

// --- cost model (seconds), measured in the pilot (see notes.md) ---
const COUNTS = { k1: [10, 3, 30], k2: [10, 1, 2], k3: [10, 1, 2], "k3-120": [10, 1, 2], k3s: [10, 3, 2], "k4-warm": [10, 3, 2], "k4-cold": [10, 1, 2], "k4-cold-local": [10, 3, 2] }; // invocations, warm-up, variants
const T_INV = { k1: 0.47, k2: 72, k3: 41, "k3-120": 131, k3s: 17.5, "k4-warm": 1.0, "k4-cold": 3.0, "k4-cold-local": 1.8 }; // s per driver invocation
const T_FIX = { k1: 8, k2: 4, k3: 4, "k3-120": 4, k3s: 4, "k4-warm": 4, "k4-cold": 4, "k4-cold-local": 4 };
const T_CELL = 40; // apply + probes + restore + readback
export const classWall = (c) => { const [n, w, v] = COUNTS[c]; return T_FIX[c] + (n + w) * v * T_INV[c]; };
export const cellWall = (classes) => T_CELL + classes.reduce((s, c) => s + classWall(c), 0);

const FULL = ["k1", "k2", "k3", "k3s", "k4-warm", "k4-cold"];
const CHEAP = ["k1", "k3s", "k4-warm", "k4-cold"];
const LOADED = {
  I0: { L1: ["k1", "k2", "k3s", "k4-warm"], L2: ["k1", "k2", "k3s", "k4-warm"], L3: ["k3", "k3s", "k4-warm", "k4-cold", "k1"], L4: ["k4-cold", "k4-warm", "k1"] },
  I2: { L1: ["k1", "k2", "k3s", "k4-warm"], L2: ["k1", "k2", "k3s", "k4-warm"], L3: ["k3", "k3-120", "k3s", "k4-warm", "k4-cold", "k1"], L4: ["k4-cold", "k4-warm", "k1"] },
  I3: { L1: ["k1", "k3s", "k4-warm"], L2: ["k1", "k3s", "k4-warm"], L3: ["k3", "k3s", "k4-warm", "k4-cold", "k1"], L4: ["k4-cold", "k4-warm", "k1"] },
};
// mulberry32 + string hash for the seeded shuffle and per-class seeds
const hash = (s) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
const rng = (seed) => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const shuffle = (a, seed) => { const r = rng(seed), b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
const seedsFor = (id, classes) => Object.fromEntries(classes.map((c) => [c, 1 + (hash(`${id}/${c}`) % 2000000000)]));
const cell = (iso, load, tag, classes, extra = {}) => { const id = `${iso}-${load}-${tag}`; return { id, iso, load, tag, classes, seeds: seedsFor(id, classes), est_wall_s: Math.round(cellWall(classes)), ...extra }; };

const MASTER_SEED = 20261113;
const day = ["I0", "I2"].map((iso) => cell(iso, "Llive", "day", FULL.map((c) => (c === "k4-cold" ? "k4-cold-local" : c))));
const dayOrder = shuffle(day, MASTER_SEED).map((c, i) => ({ ...c, order: i }));
const nightPlan = [
  { window: "night1", isos: ["I0"], extra: [] },
  { window: "night2", isos: ["I2"], extra: [] },
  { window: "night3", isos: ["I3", "I1"], extra: [] },
];
const nights = nightPlan.map(({ window, isos }) => {
  const body = [];
  for (const iso of isos) {
    body.push(cell(iso, "L0", "full", (iso === "I0" || iso === "I2") ? FULL.flatMap((c) => (c === "k3" ? ["k3", "k3-120"] : [c])) : FULL));
    if (LOADED[iso]) for (const [l, cl] of Object.entries(LOADED[iso])) body.push(cell(iso, l, "rep1", cl));
  }
  const cross = ["I0", "I2", "I3"].filter((i) => !isos.includes(i));
  const refs = (tag) => [...isos.map((iso) => cell(iso, "L0", tag, CHEAP, { reference: true })), ...cross.map((iso) => cell(iso, "L0", tag, ["k1"], { reference: true, cross_level: true }))];
  const shuffled = shuffle(body, hash(window) ^ MASTER_SEED);
  const cells = [...refs("ref-start"), ...shuffled, ...refs("ref-end")].map((c, i) => ({ ...c, order: i, block: c.reference ? c.tag : "body" }));
  return { window, est_wall_s: cells.reduce((s, c) => s + c.est_wall_s, 0), cells };
});
const schedule = {
  note: "Frozen schedule (amended: k3-120 in the I0 and I2 full cells and I2-L3, cross-level K1 references). Counts per class are in configs/*.json (invocations per variant, warm-up rounds); cells run once unless listed twice; seeds are per cell and class (--seed). Windows are AFK windows; quiet reference cells bracket every window (cheap classes for the window's own isolation levels, K1 only for the other of I0/I2/I3).",
  master_seed: MASTER_SEED,
  day: { est_wall_s: dayOrder.reduce((s, c) => s + c.est_wall_s, 0), cells: dayOrder },
  nights,
  totals: { night_est_wall_s: nights.map((n) => n.est_wall_s), night_total_s: nights.reduce((s, n) => s + n.est_wall_s, 0) },
};
writeFileSync(outFile, `${JSON.stringify(schedule, null, 1)}\n`);
console.log(`day ${schedule.day.est_wall_s}s; nights ${schedule.totals.night_est_wall_s.join("s, ")}s; total night ${schedule.totals.night_total_s}s`);
