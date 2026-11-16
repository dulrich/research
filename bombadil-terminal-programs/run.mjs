#!/usr/bin/env bun
// run.mjs — driver for the Bombadil terminal-driver exploration.
// setup: fetches and verifies the Bombadil release binary, clones and builds the pinned targets.
// run: runs every arm N times under the default specification, one JSON row per run.
// summary: per arm x property table from the rows.
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, createReadStream, existsSync, mkdirSync, openSync, closeSync, readFileSync, readSync, rmSync, statSync, writeFileSync, chmodSync } from "node:fs";
import { createHash } from "node:crypto";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { clopperPearson, median, mulberry32, permutation } from "../scripts/lib/measure-stats.mjs";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";

const USAGE = `usage: run.mjs setup [--src DIR] [--vars DIR]
       run.mjs run [--out FILE] [--vars DIR] [--runs N] [--limit SECONDS] [--lanes N] [--seed N] [--arms a,b,...]
       run.mjs summary [--in FILE] [--out FILE]
       run.mjs --help | --build | --version

setup     Fetches the Bombadil release binary (v0.7.10) into VARS/bombadil (or reuses a copy whose sha256 matches;
          refuses a mismatch), clones crucible-tui (pin 192552b) and crucible-term (pin 12358e2) from SRC/<name>
          into VARS/src, builds them with cargo build --release, and writes the fixed inputs (mdview's rendered
          output, the jsonedit document). SRC defaults to the directory holding this repository; VARS defaults to
          runs/spike/btp in this repository (git-ignored). Idempotent; refuses a dirty or off-pin clone. The one network
          use is the binary download.
run       Runs every arm RUNS times (default 20) with --time-limit LIMIT seconds (default 60), default 100x40,
          default specification, without --exit-on-violation. Arms are interleaved in a seeded random order per
          round (--seed, default 20261116); --lanes N runs N Bombadil processes at once (default 4). Writes one JSON
          row per run to --out (default results/runs.jsonl; replaced). Full traces stay under VARS/traces and are
          deleted after scanning; for each arm x property the first violating run keeps a trace prefix through the
          first violation under VARS/keep. Exits non-zero on failure.
summary   Per arm x property: runs with a violation, k/n with a Clopper-Pearson 95% interval (descriptive only),
          median time to first violation; per arm: exit reasons, median duration and throughput. Reads --in
          (default results/runs.jsonl), writes --out (default results/summary.md) and prints it.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "run" });
if (rc !== null) process.exit(rc);

const HERE = import.meta.dirname;
const REPO = resolve(HERE, "..");

export const BOMBADIL = {
  url: "https://github.com/antithesishq/bombadil/releases/download/v0.7.10/bombadil-x86_64-linux",
  sha256: "6f2664ca7d4067017b4efb26db5c29d6dcfecdc78131f96989d336f12420cc1b",
};
const TARGETS = [
  { name: "crucible-tui", pin: "192552b767e7050a5638e98551072c8214e6d24b" },
  { name: "crucible-term", pin: "12358e2b942eb74a54a9ae3f6a774cb7cd8e77d1" },
];
export const PROPERTIES = ["exitSuccess", "noReplacementChars"];
const EDITOR = "vi -n -u NONE";

/** The arms. `argv(ctx)` returns the command Bombadil drives; ctx = { vars, doc } (doc: this run's JSON file). */
export const ARMS = [
  { id: "mdview", argv: (c) => [join(c.vars, "src/crucible-tui/target/release/mdview"), join(c.vars, "src/crucible-tui/README.md")] },
  { id: "less-R", argv: (c) => ["less", "-R", join(c.vars, "fixed/rendered.txt")] },
  { id: "less", argv: (c) => ["less", join(c.vars, "fixed/rendered.txt")] },
  { id: "jsonedit", needsDoc: true, argv: (c) => [join(c.vars, "src/crucible-tui/target/release/jsonedit"), c.doc] },
  { id: "vi", needsDoc: true, argv: (c) => ["vi", "-n", "-u", "NONE", c.doc] },
];
const JSON_DOC = '{\n  "name": "example",\n  "version": 1,\n  "tags": ["a", "b", "c"],\n  "nested": { "enabled": true, "limit": 10, "ratio": 0.5 }\n}\n';

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };
const sh = (cmd, args, cwd, extra = {}) => spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 26, ...extra });

function flags(args, allowed) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) fail(`bad argument ${a}`);
    const k = a.slice(2);
    if (!allowed.includes(k) || i + 1 >= args.length) fail(`bad argument ${a}`);
    o[k] = args[++i];
  }
  return o;
}
const intFlag = (o, k, d) => {
  const v = o[k] ?? String(d);
  if (!/^\d+$/.test(v) || Number(v) < 1) fail(`--${k} must be a positive integer`);
  return Number(v);
};
const varsDir = (o) => resolve(o.vars ?? join(REPO, "runs/spike/btp"));
const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

// ---------- pure helpers (tested in run.test.mjs) ----------

/** Exit reason, program exit code and throughput from the tail of a Bombadil run's output. */
export function parseTail(text) {
  const m = /^Exited (.*)$/m.exec(text);
  const said = m ? m[1].trim() : null;
  let reason = "unknown";
  let code = null;
  if (said === null) reason = "unknown";
  else if (/time limit/.test(said)) reason = "time-limit";
  else if (/violation/.test(said)) reason = "violation";
  else {
    const c = /process terminated with exit code (-?\d+)/.exec(said);
    if (c) { reason = "program-exit"; code = Number(c[1]); }
    else if (/process terminated/.test(said)) reason = "program-exit";
    else reason = "other";
  }
  const t = /Throughput \(state samples\/sec\):\s*([0-9.]+)/.exec(text);
  return { reason, said, code, throughput: t ? Number(t[1]) : null };
}

/** Property names violated in one trace line, or [] (cheap check first: lines end with `"violations":[]}` when clean). */
export function violatedNames(line) {
  if (line.endsWith('"violations":[]}')) return [];
  const rec = JSON.parse(line);
  return (rec.violations ?? []).map((v) => v.name);
}

const tsOf = (line) => { const m = /^\{"timestamp":(\d+)/.exec(line); return m ? Number(m[1]) : null; };

/** Folds an async iterable of trace lines into { states, spanS, first: {prop: {index, s}}, count: {prop: n} }. */
export async function scanTrace(lines) {
  let states = 0, t0 = null, tN = null;
  const first = {}, count = {};
  for await (const line of lines) {
    if (!line) continue;
    const ts = tsOf(line);
    if (t0 === null) t0 = ts;
    tN = ts;
    for (const n of violatedNames(line)) {
      count[n] = (count[n] ?? 0) + 1;
      if (!first[n]) first[n] = { index: states, s: (ts - t0) / 1e6 };
    }
    states++;
  }
  return { states, spanS: t0 === null ? 0 : (tN - t0) / 1e6, first, count };
}

/** Per-arm, per-property violation counts and intervals from rows. */
export function summarize(rows, props = PROPERTIES) {
  const arms = [...new Set(rows.map((r) => r.arm))];
  const out = [];
  for (const arm of arms) {
    const rs = rows.filter((r) => r.arm === arm);
    const names = [...new Set([...props, ...rs.flatMap((r) => Object.keys(r.first_violation_s ?? {}))])];
    const perProp = names.map((p) => {
      const times = rs.map((r) => r.first_violation_s?.[p]).filter((x) => typeof x === "number");
      const [lo, hi] = clopperPearson(times.length, rs.length);
      return { property: p, k: times.length, n: rs.length, lo, hi, medianS: times.length ? median(times) : null };
    });
    const reasons = {};
    for (const r of rs) reasons[r.exit_reason] = (reasons[r.exit_reason] ?? 0) + 1;
    const nums = (k) => rs.map((r) => r[k]).filter((x) => typeof x === "number");
    out.push({ arm, n: rs.length, perProp, reasons, medianDurationS: median(nums("duration_s")), medianThroughput: nums("throughput").length ? median(nums("throughput")) : null, medianStates: median(nums("states")) });
  }
  return out;
}

const pct = (x) => `${(100 * x).toFixed(0)}%`;
const f1 = (x) => (x === null || Number.isNaN(x) ? "n/a" : x.toFixed(1));

export function summaryText(rows) {
  const s = summarize(rows);
  const lines = ["# Summary", "", `${rows.length} runs. Rates are descriptive per arm; no arm-versus-arm rate claim is made. Times are indicative.`, "", "## Violations per arm and property", "", "| arm | property | runs with a violation | 95% Clopper-Pearson | median first violation (s) |", "|---|---|---|---|---|"];
  for (const a of s) for (const p of a.perProp) lines.push(`| ${a.arm} | ${p.property} | ${p.k}/${p.n} | ${pct(p.lo)}-${pct(p.hi)} | ${f1(p.medianS)} |`);
  lines.push("", "## Exit reasons and throughput", "", "| arm | runs | exit reasons | median duration (s) | median states | median states/s |", "|---|---|---|---|---|---|");
  for (const a of s) lines.push(`| ${a.arm} | ${a.n} | ${Object.entries(a.reasons).map(([k, v]) => `${k} ${v}`).join(", ")} | ${f1(a.medianDurationS)} | ${a.medianStates?.toFixed(0)} | ${f1(a.medianThroughput)} |`);
  const codes = {};
  for (const r of rows) if (r.exit_reason === "program-exit") { const k = `${r.arm} exit ${r.program_exit_code}`; codes[k] = (codes[k] ?? 0) + 1; }
  lines.push("", "## Program exit codes at early exits", "", ...(Object.keys(codes).length ? Object.entries(codes).map(([k, v]) => `- ${k}: ${v}`) : ["none"]), "");
  return lines.join("\n");
}

/** Round-by-round interleaved job order: a seeded permutation of the arms per round. */
export function schedule(armIds, runs, seed) {
  const rng = mulberry32(seed);
  const jobs = [];
  for (let round = 0; round < runs; round++) for (const i of permutation(rng, armIds.length)) jobs.push({ arm: armIds[i], run: round, round });
  return jobs;
}

// ---------- setup ----------

async function ensureBinary(vars) {
  const dir = join(vars, "bombadil");
  const bin = join(dir, "bombadil");
  mkdirSync(dir, { recursive: true });
  if (existsSync(bin) && sha256(bin) === BOMBADIL.sha256) { chmodSync(bin, 0o755); return bin; }
  if (existsSync(bin)) fail(`${bin} exists with a different sha256; remove it`);
  const res = await fetch(BOMBADIL.url);
  if (!res.ok) fail(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const got = createHash("sha256").update(buf).digest("hex");
  if (got !== BOMBADIL.sha256) fail(`downloaded binary sha256 ${got} does not match ${BOMBADIL.sha256}`);
  writeFileSync(bin, buf, { mode: 0o755 });
  return bin;
}

function checkClone(clone, pin) {
  const head = sh("git", ["rev-parse", "HEAD"], clone).stdout.trim();
  if (head !== pin) fail(`clone ${clone} is at ${head}, not the pin ${pin}`);
  if (sh("git", ["status", "--porcelain"], clone).stdout.trim()) fail(`clone ${clone} has uncommitted changes`);
}

async function setup(args) {
  const o = flags(args, ["src", "vars"]);
  const src = resolve(o.src ?? dirname(REPO));
  const vars = varsDir(o);
  await ensureBinary(vars);
  mkdirSync(join(vars, "src"), { recursive: true });
  for (const t of TARGETS) {
    const clone = join(vars, "src", t.name);
    if (!existsSync(clone)) {
      let r = sh("git", ["clone", "-q", "--no-checkout", join(src, t.name), clone], vars);
      if (r.status !== 0) fail(`clone of ${join(src, t.name)} failed: ${r.stderr}`);
      r = sh("git", ["checkout", "-q", "--detach", t.pin], clone);
      if (r.status !== 0) fail(`checkout ${t.pin} failed: ${r.stderr}`);
    }
    checkClone(clone, t.pin);
    const r = sh("cargo", ["build", "--release", "--quiet"], clone, { stdio: ["ignore", "inherit", "inherit"], encoding: null });
    if (r.status !== 0) fail(`cargo build failed in ${clone}`);
  }
  const fixed = join(vars, "fixed");
  mkdirSync(fixed, { recursive: true });
  const mdview = join(vars, "src/crucible-tui/target/release/mdview");
  const r = sh(mdview, ["--no-pager", "--color=always", join(vars, "src/crucible-tui/README.md")], fixed);
  if (r.status !== 0 || !r.stdout) fail(`mdview --no-pager failed: ${r.stderr}`);
  writeFileSync(join(fixed, "rendered.txt"), r.stdout);
  writeFileSync(join(fixed, "doc.json"), JSON_DOC);
  process.stdout.write(`setup done under ${vars}\n`);
}

// ---------- run ----------

async function runOne(job, ctx) {
  const arm = ARMS.find((a) => a.id === job.arm);
  const tag = `${job.arm}-${String(job.run).padStart(2, "0")}`;
  const traceDir = join(ctx.vars, "traces", tag);
  const workDir = join(ctx.vars, "work", tag);
  rmSync(traceDir, { recursive: true, force: true });
  rmSync(workDir, { recursive: true, force: true });
  mkdirSync(workDir, { recursive: true });
  mkdirSync(dirname(traceDir), { recursive: true });
  const doc = join(workDir, "doc.json");
  if (arm.needsDoc) copyFileSync(join(ctx.vars, "fixed/doc.json"), doc);
  const cmd = arm.argv({ vars: ctx.vars, doc });
  const logPath = join(ctx.vars, "traces", `${tag}.log`);
  const env = { ...process.env, EDITOR };
  delete env.VISUAL;
  const startedAt = new Date();
  const t0 = performance.now();
  const logFd = openSync(logPath, "w");
  const child = spawn(ctx.bin, ["terminal", "test", "--time-limit", `${ctx.limit}s`, "--output-path", traceDir, "--", ...cmd], { cwd: workDir, env, stdio: ["ignore", logFd, logFd] });
  let killed = false;
  const guard = setTimeout(() => { killed = true; child.kill("SIGKILL"); }, (ctx.limit + 60) * 1000);
  const status = await new Promise((res) => child.on("close", (code, sig) => res({ code, sig })));
  clearTimeout(guard);
  closeSync(logFd);
  const wallS = (performance.now() - t0) / 1000;
  const size = statSync(logPath).size;
  const fd = openSync(logPath, "r");
  const tailBuf = Buffer.alloc(Math.min(size, 8192));
  readSync(fd, tailBuf, 0, tailBuf.length, size - tailBuf.length);
  closeSync(fd);
  const tail = parseTail(tailBuf.toString("utf8"));
  const tracePath = join(traceDir, "trace.jsonl");
  let scan = { states: 0, spanS: 0, first: {}, count: {} };
  let kept = null;
  if (existsSync(tracePath)) {
    scan = await scanTrace(createInterface({ input: createReadStream(tracePath, { highWaterMark: 1 << 22 }), crlfDelay: Infinity }));
    for (const [prop, f] of Object.entries(scan.first)) {
      const key = `${job.arm}/${prop}`;
      if (ctx.kept.has(key)) continue;
      ctx.kept.add(key);
      const dest = join(ctx.vars, "keep", `${tag}-${prop}`);
      mkdirSync(dest, { recursive: true });
      const out = openSync(join(dest, "trace.jsonl"), "w");
      const h = spawnSync("head", ["-n", String(f.index + 1), tracePath], { stdio: ["ignore", out, "inherit"] });
      closeSync(out);
      if (h.status !== 0) fail(`trace prefix failed for ${tag}`);
      kept = kept ? `${kept},${dest}` : dest;
    }
  }
  rmSync(traceDir, { recursive: true, force: true });
  rmSync(workDir, { recursive: true, force: true });
  rmSync(logPath, { force: true });
  const first = {};
  for (const [p, f] of Object.entries(scan.first)) first[p] = f.s;
  return {
    arm: job.arm,
    run: job.run,
    round: job.round,
    seed: ctx.seed,
    start: startedAt.toISOString(),
    limit_s: ctx.limit,
    duration_s: scan.spanS,
    wall_s: wallS,
    states: scan.states,
    throughput: tail.throughput,
    exit_reason: killed ? "harness-timeout" : tail.reason,
    program_exit_code: tail.code,
    bombadil_status: status.code ?? `signal ${status.sig}`,
    first_violation_s: first,
    violating_states: scan.count,
    kept_trace: kept ? kept.replace(new RegExp(ctx.vars, "g"), "VARS") : null,
  };
}

async function run(args) {
  const o = flags(args, ["out", "vars", "runs", "limit", "lanes", "seed", "arms"]);
  const runs = intFlag(o, "runs", 20), limit = intFlag(o, "limit", 60), lanes = intFlag(o, "lanes", 4), seed = intFlag(o, "seed", 20261116);
  const armIds = o.arms ? o.arms.split(",") : ARMS.map((a) => a.id);
  for (const id of armIds) if (!ARMS.some((a) => a.id === id)) fail(`unknown arm ${id}`);
  const vars = varsDir(o);
  const bin = join(vars, "bombadil/bombadil");
  if (!existsSync(bin) || sha256(bin) !== BOMBADIL.sha256) fail("missing or unverified Bombadil binary; run setup");
  for (const t of TARGETS) {
    const clone = join(vars, "src", t.name);
    if (!existsSync(clone)) fail(`missing clone ${clone}; run setup`);
    checkClone(clone, t.pin);
  }
  if (!existsSync(join(vars, "fixed/rendered.txt"))) fail("missing fixed inputs; run setup");
  const out = o.out ? resolve(o.out) : join(HERE, "results/runs.jsonl");
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, "");
  const queue = schedule(armIds, runs, seed);
  const ctx = { vars, bin, limit, seed, kept: new Set() };
  let failure = null;
  const lane = async () => {
    while (queue.length && !failure) {
      const job = queue.shift();
      try {
        const row = await runOne(job, ctx);
        writeFileSync(out, JSON.stringify(row) + "\n", { flag: "a" });
        process.stderr.write(`${row.arm} #${row.run}: ${row.exit_reason} ${row.duration_s.toFixed(1)}s ${row.states} states ${JSON.stringify(row.first_violation_s)}\n`);
      } catch (e) { failure = e; }
    }
  };
  await Promise.all(Array.from({ length: lanes }, lane));
  if (failure) throw failure;
}

// ---------- summary ----------

const readRows = (file) => readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function summary(args) {
  const o = flags(args, ["in", "out"]);
  const text = summaryText(readRows(o.in ? resolve(o.in) : join(HERE, "results/runs.jsonl")));
  writeFileSync(o.out ? resolve(o.out) : join(HERE, "results/summary.md"), text);
  process.stdout.write(text);
}

if (import.meta.main) {
  const [cmd, ...rest] = argv;
  try {
    if (cmd === "setup") await setup(rest);
    else if (cmd === "run") await run(rest);
    else if (cmd === "summary") summary(rest);
    else fail("unknown command");
  } catch (e) {
    process.stderr.write(`run.mjs: ${e instanceof Fail ? e.message : (e?.stack ?? e)}\n${e instanceof Fail ? USAGE : ""}`);
    process.exitCode = 1;
  }
}
