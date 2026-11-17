// run.mjs - driver for the thp-recollapse-allocators harness: one invocation per fresh container (M4), plus the
// natural-arm wave and the pilot batches. Rows are appended to <out>/<arm>.jsonl; MEASURE lines go to stdout.
import { spawn, spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";
import { buildSummary } from "./summary.mjs";

const USAGE = `usage: run.mjs one --alloc A [--thp on|off|advised] [--arm forced|natural|cpu] [options]
       run.mjs natural-wave [--blocks N] [--parallel N] [--out DIR]
       run.mjs pilot-forced [--reps N] [--out DIR]
       run.mjs pilot-cpu [--reps N] [--out DIR]
       run.mjs claim-forced [--blocks N] [--blocks-mimalloc-on N] [--aa-blocks N] [--seed N] [--out DIR]
       run.mjs claim-cpu [--blocks N] [--seed N] [--out DIR]
       run.mjs summarize <file.jsonl>
       run.mjs summary --forced F --cpu C --natural N [--pilot-forced P] [--out FILE]
       run.mjs --help | --build | --version

Runs the thp-recollapse:2 image (build it with: docker build -t thp-recollapse:2 thp-recollapse-allocators) once
per invocation with --rm --memory 1g. Rows go to <out>/<name>.jsonl (default out: results/); \`--out DIR\` writes
elsewhere. Every row carries allocator + version, tunables, THP mode, shape, threads, cpuset requested and
effective, host THP settings, uptime and the khugepaged full_scans counter.

one options
  --alloc glibc|jemalloc|mimalloc|musl   (required)
  --thp on|off|advised      per-process THP control set before allocator start-up (default on)
  --arm forced|natural|cpu  forced: release, optional --collapse, BOUNDARY, settled readings via scripts/memprobe.sh;
                            natural: no collapse, wait for khugepaged full_scans to advance (diagnostic, unpinned);
                            cpu: burst CPU under scripts/cpuprobe.sh (default forced)
  --stride-kb N --shape fixed|mixed --threads N --mib N --reps N   workload (defaults 128, fixed, 1, 64, 1)
  --collapse                forced arm: MADV_COLLAPSE after the release
  --settle S[,S...]         forced arm settle windows in whole seconds after BOUNDARY (default 0,10)
  --env KEY=VAL             allocator-native control passed into the container (MALLOC_CONF, GLIBC_TUNABLES,
                            MIMALLOC_*); repeatable
  --pin CPUSET|unpinned     cpuset (default $THP_PIN or 6,18; natural arm unpinned; cpu arm 6); sibling for cpu arm
                            is --sibling CPU
  --sibling CPU             cpu arm: SMT sibling reported by cpuprobe.sh (default 18)
  --provenance NAME         row provenance: pilot, natural, claim, smoke (default pilot)
  --label TEXT              free label stored in the row (cell name)
  --out DIR --name NAME     row output directory and file stem
  --scan-incs K --stop-on-growth-mib X --max-wait S    natural arm (see: docker run --rm thp-recollapse:2 thp-glibc --help)
claim-forced: provenance claim, the 43 pilot cells (4 allocators x on/off x strides 0/32/128/1024 KiB, the mixed
shape at 128 KiB, three native-control cells), 10 blocks per cell (20 for every mimalloc "on" cell) plus an A/A copy of
glibc-on-s128 and mimalloc-on-s128 at 20 blocks, round-robin over cells (order randomized per round, seed recorded in
every row), four pinned lanes (6,18 7,19 8,20 9,21). claim-cpu: 33 cells x 20 blocks, strictly sequential and
interleaved the same way, 1 thread on CPU 6, 4 threads on 6,7,8,9, cpuprobe.sh --sibling 18. Failed blocks stay in
the file with ok=false and are counted by \`summary\`. summary: generates results/summary.md from the row files.
Exit status 2: usage error.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "run" });
if (rc !== null) process.exit(rc);

const here = dirname(fileURLToPath(import.meta.url));
const probes = join(here, "..", "scripts");
const IMAGE = "thp-recollapse:2";
const ALLOCS = ["glibc", "jemalloc", "mimalloc", "musl"];
function die(msg) { process.stderr.write(`run.mjs: ${msg}\n`); process.exit(2); }
const CPUSET = /^[0-9]+([,-][0-9]+)*$/;
const ENVKV = /^[A-Za-z_][A-Za-z0-9_]*=[A-Za-z0-9_.:=,+-]*$/;
const WHOLE = /^[0-9]+$/;

/** Pure: validate and normalise the `one` options (exported for tests; rejects instead of coercing). */
export function parseOne(args) {
  const o = { thp: "on", arm: "forced", strideKb: "128", shape: "fixed", threads: "1", mib: "64", reps: "1", collapse: false, settle: "0,10",
    env: [], pin: null, sibling: "18", provenance: "pilot", label: "", out: join(here, "results"), name: null, scanIncs: "2", stopGrowth: null, maxWait: "3600", alloc: null };
  const need = new Set(["--alloc", "--thp", "--arm", "--stride-kb", "--shape", "--threads", "--mib", "--reps", "--settle", "--env", "--pin", "--sibling", "--provenance", "--label", "--out", "--name", "--scan-incs", "--stop-on-growth-mib", "--max-wait"]);
  for (let i = 0; i < args.length; i++) {
    const k = args[i];
    if (k === "--collapse") { o.collapse = true; continue; }
    if (!need.has(k)) throw new Error(`unknown option ${k}`);
    const v = args[++i];
    if (v === undefined) throw new Error(`missing value for ${k}`);
    switch (k) {
      case "--alloc": if (!ALLOCS.includes(v)) throw new Error(`--alloc '${v}'`); o.alloc = v; break;
      case "--thp": if (!["on", "off", "advised"].includes(v)) throw new Error(`--thp '${v}'`); o.thp = v; break;
      case "--arm": if (!["forced", "natural", "cpu"].includes(v)) throw new Error(`--arm '${v}'`); o.arm = v; break;
      case "--shape": if (!["fixed", "mixed"].includes(v)) throw new Error(`--shape '${v}'`); o.shape = v; break;
      case "--stride-kb": case "--mib": case "--reps": case "--threads": case "--scan-incs": case "--max-wait": case "--stop-on-growth-mib": case "--sibling":
        if (!WHOLE.test(v)) throw new Error(`${k} '${v}' is not a whole number`);
        o[{ "--stride-kb": "strideKb", "--mib": "mib", "--reps": "reps", "--threads": "threads", "--scan-incs": "scanIncs", "--max-wait": "maxWait", "--stop-on-growth-mib": "stopGrowth", "--sibling": "sibling" }[k]] = v; break;
      case "--settle": if (!/^[0-9]+(,[0-9]+)*$/.test(v)) throw new Error(`--settle '${v}' is not a comma list of whole seconds`); o.settle = v; break;
      case "--env": if (!ENVKV.test(v)) throw new Error(`--env '${v}' is not KEY=VAL`); o.env.push(v); break;
      case "--pin": if (v !== "unpinned" && !CPUSET.test(v)) throw new Error(`--pin '${v}' is not a cpuset list`); o.pin = v; break;
      case "--provenance": if (!["pilot", "natural", "claim", "smoke"].includes(v)) throw new Error(`--provenance '${v}'`); o.provenance = v; break;
      case "--label": o.label = v; break;
      case "--out": o.out = v; break;
      case "--name": if (!/^[A-Za-z0-9_.-]+$/.test(v)) throw new Error(`--name '${v}'`); o.name = v; break;
    }
  }
  if (!o.alloc) throw new Error("--alloc is required");
  if (o.pin === null) o.pin = o.arm === "natural" ? "unpinned" : o.arm === "cpu" ? "6" : (process.env.THP_PIN || "6,18");
  if (!/^[0-9,-]+$/.test(o.pin) && o.pin !== "unpinned") throw new Error("THP_PIN is not a cpuset list");
  if (o.name === null) o.name = o.arm;
  return o;
}

/** Pure: parse harness stdout into the row's evidence (ENV/READ/MAP/SPAN/NATURAL/MEASURE lines). */
export function parseHarness(text) {
  const kv = (s) => Object.fromEntries(s.split(" ").filter((t) => t.includes("=")).map((t) => { const i = t.indexOf("="); return [t.slice(0, i), t.slice(i + 1)]; }));
  const num = (v) => (v !== undefined && /^-?[0-9.]+$/.test(v) ? Number(v) : v);
  const r = { env: null, reads: [], maps: [], mapsOther: [], spans: [], natural: null, inc1: null, measures: {} };
  for (const line of text.split("\n")) {
    const sp = line.indexOf(" "); const tag = sp < 0 ? line : line.slice(0, sp); const rest = sp < 0 ? "" : line.slice(sp + 1);
    if (tag === "ENV") r.env = kv(rest);
    else if (tag === "READ") r.reads.push(Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)])));
    else if (tag === "MAP") r.maps.push(Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)])));
    else if (tag === "MAPS_OTHER") r.mapsOther.push(Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)])));
    else if (tag === "SPAN") r.spans.push(Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)])));
    else if (tag === "NATURAL") r.natural = Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)]));
    else if (tag === "INC1") r.inc1 = Object.fromEntries(Object.entries(kv(rest)).map(([k, v]) => [k, num(v)]));
    else if (tag === "MEASURE") { const p = rest.split(" "); if (/^-?[0-9.]+(e[+-]?[0-9]+)?$/.test(p[1] ?? "")) r.measures[p[0]] = Number(p[1]); }
  }
  return r;
}

let versionsCache = null;
function imageVersions() {
  if (versionsCache) return versionsCache;
  const r = spawnSync("docker", ["run", "--rm", IMAGE, "cat", "/versions.txt"], { encoding: "utf8" });
  const image = spawnSync("docker", ["image", "inspect", "--format", "{{.Id}}", IMAGE], { encoding: "utf8" }).stdout.trim();
  versionsCache = { versions: r.stdout.trim().split("\n"), image };
  return versionsCache;
}
function runDocker(args) {
  return new Promise((resolve) => {
    const p = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "";
    p.stdout.on("data", (d) => { out += d; }); p.stderr.on("data", (d) => { err += d; });
    p.on("close", (code) => resolve({ code, out, err }));
  });
}
function harnessArgs(o) {
  const a = [`thp-${o.alloc}`, "--thp", o.thp, "--stride-kb", o.strideKb, "--shape", o.shape, "--threads", o.threads, "--mib", o.mib];
  if (o.arm === "cpu") a.push("--mode", "cpu", "--reps", o.reps);
  else if (o.arm === "natural") { a.push("--mode", "natural", "--scan-incs", o.scanIncs, "--max-wait", o.maxWait); if (o.stopGrowth !== null) a.push("--stop-on-growth-mib", o.stopGrowth); }
  else { a.push("--mode", "forced", "--idle", String(Math.max(...o.settle.split(",").map(Number)) + 2)); if (o.collapse) a.push("--collapse"); }
  return a;
}
/** Runs one fresh container and appends one row; resolves to the row. */
export async function runOne(o) {
  const dargs = ["run", "--rm", "--memory", "1g"];
  if (o.pin !== "unpinned") dargs.push("--cpuset-cpus", o.pin);
  for (const e of o.env) dargs.push("-e", e);
  let cmd;
  if (o.arm === "forced") {
    dargs.push("-v", `${join(probes, "memprobe.sh")}:/probe/memprobe.sh:ro`);
    cmd = ["/probe/memprobe.sh", "--interval", "0.2", "--boundary-line", "BOUNDARY", "--settle", o.settle, "--", ...harnessArgs(o)];
  } else if (o.arm === "cpu") {
    dargs.push("--cap-add", "PERFMON", "--cap-add", "SYS_ADMIN", "-v", `${join(probes, "cpuprobe.sh")}:/probe/cpuprobe.sh:ro`);
    cmd = ["/probe/cpuprobe.sh", "--sibling", o.sibling, "--", ...harnessArgs(o)];
  } else cmd = harnessArgs(o);
  const t0 = Date.now();
  const r = await runDocker([...dargs, IMAGE, ...cmd]);
  const iv = imageVersions();
  const ev = parseHarness(r.out);
  const row = {
    provenance: o.provenance, arm: o.arm, label: o.label, ok: r.code === 0, exit: r.code, started: new Date(t0).toISOString(), wall_s: (Date.now() - t0) / 1000,
    alloc: o.alloc, alloc_version: ev.env?.version ?? iv.versions.find((l) => l.startsWith(o.alloc === "glibc" ? "libc6" : o.alloc === "jemalloc" ? "libjemalloc2" : o.alloc === "mimalloc" ? "libmimalloc3" : "musl")) ?? null,
    tunables: o.env, thp: o.thp, collapse: o.collapse, stride_kb: Number(o.strideKb), shape: o.shape, threads: Number(o.threads), mib: Number(o.mib), reps: Number(o.reps), settle: o.arm === "forced" ? o.settle : null,
    cpuset_requested: o.pin, cpuset_effective: ev.env?.cpus_allowed ?? null,
    host: ev.env ? { thp_enabled: ev.env.thp_enabled, defrag: ev.env.thp_defrag, max_ptes_none: ev.env.max_ptes_none, pages_to_scan: ev.env.pages_to_scan, scan_sleep_ms: ev.env.scan_sleep_ms } : null,
    uptime_s: ev.env?.uptime_s ?? null, full_scans_start: ev.env?.full_scans ?? null, prctl_thp_disable: ev.env?.prctl_thp_disable ?? null,
    image: iv.image, image_versions: iv.versions, driver: process.env.THP_DRIVER_BUILD ?? null,
    ...(o.extra ?? {}),
    ...ev, stderr: r.err.trim().split("\n").slice(-3).join(" | "),
  };
  // probe MEASURE lines (memprobe/cpuprobe) are part of the same stdout
  mkdirSync(o.out, { recursive: true });
  appendFileSync(join(o.out, `${o.name}.jsonl`), JSON.stringify(row) + "\n");
  return { row, stdout: r.out };
}

async function pool(items, limit, fn) {
  const res = new Array(items.length); let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => { while (next < items.length) { const i = next++; res[i] = await fn(items[i], i); } }));
  return res;
}
function shuffle(a, seed) { let s = seed; const r = () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function intFlag(args, name, dflt) { const i = args.indexOf(name); if (i < 0) return dflt; if (!WHOLE.test(args[i + 1] ?? "") || Number(args[i + 1]) < 1) die(`${name} needs a positive whole number`); return Number(args[i + 1]); }
function outFlag(args) { const i = args.indexOf("--out"); return i < 0 ? join(here, "results") : args[i + 1] ?? die("--out needs a directory"); }

const NATIVE = { "jemalloc-thpnever": ["jemalloc", ["MALLOC_CONF=thp:never"]], "glibc-hugetlb1": ["glibc", ["GLIBC_TUNABLES=glibc.malloc.hugetlb=1"]], "mimalloc-largepages": ["mimalloc", ["MIMALLOC_ALLOW_LARGE_OS_PAGES=1"]] };

const cmd = argv[0];
if (cmd === "one") {
  let o; try { o = parseOne(argv.slice(1)); } catch (e) { die(e.message); }
  const { row, stdout } = await runOne(o);
  process.stdout.write(stdout);
  process.exit(row.ok ? 0 : 1);
} else if (cmd === "natural-wave") {
  const blocks = intFlag(argv, "--blocks", 2), par = intFlag(argv, "--parallel", 13), out = outFlag(argv);
  const cells = [];
  for (const alloc of ALLOCS) for (const thp of ["on", "off", "advised"]) cells.push({ alloc, thp, env: [], label: `${alloc}-${thp}` });
  for (const [k, [alloc, env]] of Object.entries(NATIVE)) cells.push({ alloc, thp: "advised", env, label: `${k}-advised` });
  const jobs = [];
  for (let b = 0; b < blocks; b++) for (const c of cells) jobs.push({ ...c, block: b });
  const done = await pool(jobs, par, async (j) => {
    const o = parseOne(["--alloc", j.alloc, "--thp", j.thp, "--arm", "natural", "--provenance", "natural", "--label", `${j.label}#${j.block}`, "--out", out, "--name", "natural", "--stop-on-growth-mib", "8", ...j.env.flatMap((e) => ["--env", e])]);
    const { row } = await runOne(o); process.stderr.write(`done ${j.label}#${j.block} ok=${row.ok}\n`); return row;
  });
  process.stdout.write(`natural-wave: ${done.length} blocks, ${done.filter((r) => !r.ok).length} discarded\n`);
} else if (cmd === "pilot-forced") {
  const reps = intFlag(argv, "--reps", 5), out = outFlag(argv), lanes = ["6,18", "7,19", "8,20", "9,21"];
  const cells = [];
  for (const alloc of ALLOCS) for (const thp of ["on", "off"]) {
    for (const s of [0, 32, 128, 1024]) cells.push({ alloc, thp, s, shape: "fixed", env: [], label: `${alloc}-${thp}-s${s}` });
    cells.push({ alloc, thp, s: 128, shape: "mixed", env: [], label: `${alloc}-${thp}-mixed128` });
  }
  for (const [k, [alloc, env]] of Object.entries(NATIVE)) cells.push({ alloc, thp: "on", s: 128, shape: "fixed", env, label: `${k}-on-s128` });
  const jobs = [];
  for (let r = 0; r < reps; r++) for (const c of cells) jobs.push({ ...c, r });
  shuffle(jobs, 20261116);
  let li = 0; const laneJobs = lanes.map(() => []);
  for (const j of jobs) laneJobs[li++ % lanes.length].push(j);
  await Promise.all(lanes.map(async (pin, k) => { for (const j of laneJobs[k]) {
    const o = parseOne(["--alloc", j.alloc, "--thp", j.thp, "--stride-kb", String(j.s), "--shape", j.shape, "--collapse", "--pin", pin, "--label", j.label, "--provenance", "pilot", "--out", out, "--name", "pilot-forced", ...j.env.flatMap((e) => ["--env", e])]);
    const { row } = await runOne(o); if (!row.ok) process.stderr.write(`FAILED ${j.label} ${row.stderr}\n`);
  } }));
} else if (cmd === "pilot-cpu") {
  const reps = intFlag(argv, "--reps", 6), out = outFlag(argv);
  const cells = [];
  for (const alloc of ALLOCS) for (const thp of ["on", "off"]) for (const th of [1, 4]) for (const mib of [64, 0]) cells.push({ alloc, thp, th, mib, label: `${alloc}-${thp}-t${th}-${mib === 0 ? "control" : "burst"}` });
  cells.push({ alloc: "glibc", thp: "on", th: 1, mib: 64, label: "glibc-on-t1-burst-AA" });
  const jobs = []; for (let r = 0; r < reps; r++) for (const c of cells) jobs.push(c);
  shuffle(jobs, 20261117);
  for (const j of jobs) { // sequential, single pinned core group, siblings untouched by this driver
    const pin = j.th === 1 ? "6" : "6,7,8,9";
    const o = parseOne(["--alloc", j.alloc, "--thp", j.thp, "--arm", "cpu", "--threads", String(j.th), "--mib", String(j.mib), "--reps", "10", "--stride-kb", "0", "--pin", pin, "--sibling", "18", "--label", j.label, "--provenance", "pilot", "--out", out, "--name", "pilot-cpu"]);
    const { row } = await runOne(o); if (!row.ok) process.stderr.write(`FAILED ${j.label} ${row.stderr}\n`);
  }
} else if (cmd === "claim-forced") {
  const blocks = intFlag(argv, "--blocks", 10), blocksMi = intFlag(argv, "--blocks-mimalloc-on", 20), aaBlocks = intFlag(argv, "--aa-blocks", 20), seed = intFlag(argv, "--seed", 20261118), out = outFlag(argv), lanes = ["6,18", "7,19", "8,20", "9,21"];
  const cells = [];
  for (const alloc of ALLOCS) for (const thp of ["on", "off"]) {
    for (const s of [0, 32, 128, 1024]) cells.push({ alloc, thp, s, shape: "fixed", env: [], label: `${alloc}-${thp}-s${s}` });
    cells.push({ alloc, thp, s: 128, shape: "mixed", env: [], label: `${alloc}-${thp}-mixed128` });
  }
  for (const [k, [alloc, env]] of Object.entries(NATIVE)) cells.push({ alloc, thp: "on", s: 128, shape: "fixed", env, label: `${k}-on-s128` });
  for (const c of cells) c.blocks = c.alloc === "mimalloc" && c.thp === "on" ? blocksMi : blocks;
  cells.push({ alloc: "glibc", thp: "on", s: 128, shape: "fixed", env: [], label: "glibc-on-s128-AA", blocks: aaBlocks });
  cells.push({ alloc: "mimalloc", thp: "on", s: 128, shape: "fixed", env: [], label: "mimalloc-on-s128-AA", blocks: aaBlocks });
  const queue = []; const rounds = Math.max(...cells.map((c) => c.blocks));
  for (let r = 0; r < rounds; r++) queue.push(...shuffle(cells.filter((c) => c.blocks > r).map((c) => ({ ...c, r })), seed + r));
  process.stderr.write(`claim-forced: ${cells.length} cells, ${queue.length} blocks planned, ${rounds} rounds, seed ${seed}\n`);
  let qi = 0, failed = 0, done = 0;
  await Promise.all(lanes.map(async (pin) => { while (qi < queue.length) {
    const j = queue[qi++];
    const o = parseOne(["--alloc", j.alloc, "--thp", j.thp, "--stride-kb", String(j.s), "--shape", j.shape, "--collapse", "--pin", pin, "--label", `${j.label}#${j.r}`, "--provenance", "claim", "--out", out, "--name", "claim-forced", ...j.env.flatMap((e) => ["--env", e])]);
    o.extra = { seed, round: j.r, lane: pin };
    const { row } = await runOne(o); done++; if (!row.ok) { failed++; process.stderr.write(`FAILED ${j.label}#${j.r} ${row.stderr}\n`); }
    if (done % 50 === 0) process.stderr.write(`claim-forced: ${done}/${queue.length} done, ${failed} failed\n`);
  } }));
  process.stdout.write(`claim-forced: ${queue.length} planned, ${done} run, ${failed} failed\n`);
} else if (cmd === "claim-cpu") {
  const blocks = intFlag(argv, "--blocks", 20), seed = intFlag(argv, "--seed", 20261119), out = outFlag(argv);
  const cells = [];
  for (const alloc of ALLOCS) for (const thp of ["on", "off"]) for (const th of [1, 4]) for (const mib of [64, 0]) cells.push({ alloc, thp, th, mib, label: `${alloc}-${thp}-t${th}-${mib === 0 ? "control" : "burst"}` });
  cells.push({ alloc: "glibc", thp: "on", th: 1, mib: 64, label: "glibc-on-t1-burst-AA" });
  const queue = []; for (let r = 0; r < blocks; r++) queue.push(...shuffle(cells.map((c) => ({ ...c, r })), seed + r));
  process.stderr.write(`claim-cpu: ${cells.length} cells, ${queue.length} blocks planned, seed ${seed}\n`);
  let done = 0, failed = 0;
  for (const j of queue) { // strictly sequential
    const pin = j.th === 1 ? "6" : "6,7,8,9";
    const o = parseOne(["--alloc", j.alloc, "--thp", j.thp, "--arm", "cpu", "--threads", String(j.th), "--mib", String(j.mib), "--reps", "10", "--stride-kb", "0", "--pin", pin, "--sibling", "18", "--label", `${j.label}#${j.r}`, "--provenance", "claim", "--out", out, "--name", "claim-cpu"]);
    o.extra = { seed, round: j.r };
    const { row } = await runOne(o); done++; if (!row.ok) { failed++; process.stderr.write(`FAILED ${j.label}#${j.r} ${row.stderr}\n`); }
    if (done % 33 === 0) process.stderr.write(`claim-cpu: ${done}/${queue.length} done, ${failed} failed\n`);
  }
  process.stdout.write(`claim-cpu: ${queue.length} planned, ${done} run, ${failed} failed\n`);
} else if (cmd === "summary") {
  const flag = (n) => { const i = argv.indexOf(n); return i < 0 ? null : argv[i + 1] ?? die(`${n} needs a value`); };
  const load = (f) => readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const f = flag("--forced"), c = flag("--cpu"), n = flag("--natural"), out = flag("--out");
  if (!f || !c || !n) die("summary needs --forced, --cpu and --natural");
  const md = buildSummary({ forced: load(f), cpu: load(c), natural: load(n) });
  if (out) writeFileSync(out, md); else process.stdout.write(md);
} else if (cmd === "summarize") {
  const rows = readFileSync(argv[1] ?? die("summarize needs a .jsonl file"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const g = new Map();
  for (const r of rows) { const k = r.label.replace(/#\d+$/, ""); if (!g.has(k)) g.set(k, []); g.get(k).push(r); }
  for (const [k, rs] of g) {
    const m = rs.map((r) => r.measures);
    const pick = (name) => m.map((x) => x[name]).filter((v) => v !== undefined).map((v) => v.toFixed(2)).join(" ");
    const keys = rs[0].arm === "cpu" ? ["cpu_task_clock_ms", "instructions_u", "sibling_busy"] : rs[0].arm === "natural" ? ["ahp_rel_mib", "ahp_final_mib", "anon_final_mib"] : ["ahp_rel_mib", "ahp_final_mib", "anon_final_mib", "anon_settled_0s_mib", "anon_settled_10s_mib"];
    process.stdout.write(`${k} n=${rs.length} ok=${rs.filter((r) => r.ok).length}\n${keys.map((n) => `  ${n}: ${pick(n)}`).join("\n")}\n`);
  }
} else die(`unknown or missing subcommand ${cmd ?? ""}`);
