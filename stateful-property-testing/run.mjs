#!/usr/bin/env bun
// run.mjs — driver for the stateful property testing study (Hegel and proptest state machines on the layout model).
// setup: clones the target at its pin and builds a scratch copy of the harness crates.
// run: clean runs, then each mutant applied to the clone, built, and run over seeds x libraries; always reverts the mutant.
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { clopperPearson, median } from "../scripts/lib/measure-stats.mjs";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";

const USAGE = `usage: run.mjs setup [--src DIR] [--vars DIR]
       run.mjs run [--out FILE] [--vars DIR] [--seeds A-B] [--cases N] [--clean-cases N]
       run.mjs summary [--in FILE] [--out FILE]
       run.mjs --help | --build | --version

setup     Clones crucible-dev-env (pin d02df23) from SRC/crucible-dev-env into VARS/crucible-dev-env, copies the two
          harness crates and their shared model (rust/common) without target/ to VARS/harness/<lib>, and rewrites
          their path dependency to the clone. SRC defaults to the directory holding this repository; VARS defaults
          to runs/spike/spt in this repository (git-ignored). Needs git, cargo, a C toolchain and network for the first
          cargo build. Idempotent: an existing clone must be at its pin and clean.
run       Builds both harnesses (release) and runs one clean run per library (seed 0, --clean-cases, default 50000),
          then, for each of the six mutants in mutants/*.diff: applies it to the clone, rebuilds, runs every seed x
          library as one child process (--cases cases each, default 1000), and reverts it. Writes one JSON row per
          run to --out (default results/runs.jsonl; the file is replaced). Defaults: seeds 0-49. Refuses to start on
          a dirty clone; every failure after a mutant is applied unwinds through the revert, also on SIGINT/SIGTERM.
          Exits non-zero on failure.
summary   Writes the per-defect table (detection, Clopper-Pearson 95%, exactly minimal, median shrunk steps) and
          the clean-run lines from --in (default results/runs.jsonl) to --out (default results/summary.md) and
          prints it.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "run" });
if (rc !== null) process.exit(rc);

const HERE = import.meta.dirname;
const REPO = resolve(HERE, "..");
const LIBS = ["hegel", "proptest"];
const PIN = "d02df23";
const TARGET = "crucible-dev-env";
const PATH_DEP = "../../../runs/spike/spt/crucible-dev-env/";

/** The pre-registered catalogue (catalogue.md): mutant file and hand-minimal step count. */
export const DEFECTS = [
  { id: "remove-workspace-keeps-windows", min: 3 },
  { id: "close-pane-keeps-stale-focus", min: 2 },
  { id: "remove-output-drops-workspace", min: 2 },
  { id: "close-window-keeps-fullscreen", min: 3 },
  { id: "swap-windows-duplicates", min: 4 },
  { id: "move-window-to-workspace-noop", min: 3 },
];

class Fail extends Error {}
const fail = (msg) => { throw new Fail(msg); };

function sh(cmd, args, cwd, extra = {}) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 26, ...extra });
}

function flags(args, allowed) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    if (!allowed.includes(k) || i + 1 >= args.length) fail(`bad argument ${a}`);
    o[k] = args[++i];
  }
  return o;
}

const varsDir = (o) => resolve(o.vars ?? join(REPO, "runs/spike/spt"));
const intFlag = (o, k, d) => { const v = o[k] ?? String(d); if (!/^\d+$/.test(v) || Number(v) < 1) fail(`--${k} must be a positive integer`); return Number(v); };

function checkClone(clone) {
  const head = sh("git", ["rev-parse", "HEAD"], clone).stdout.trim();
  if (!head.startsWith(PIN)) fail(`clone ${clone} is at ${head}, not the pin ${PIN}`);
  if (sh("git", ["status", "--porcelain"], clone).stdout.trim()) fail(`clone ${clone} has uncommitted changes`);
}

function setup(args) {
  const o = flags(args, ["src", "vars"]);
  const src = resolve(o.src ?? dirname(REPO));
  const vars = varsDir(o);
  mkdirSync(vars, { recursive: true });
  const clone = join(vars, TARGET);
  if (!existsSync(clone)) {
    let r = sh("git", ["clone", "-q", "--no-checkout", join(src, TARGET), clone], vars);
    if (r.status !== 0) fail(`clone of ${join(src, TARGET)} failed: ${r.stderr}`);
    r = sh("git", ["checkout", "-q", "--detach", PIN], clone);
    if (r.status !== 0) fail(`checkout ${PIN} failed: ${r.stderr}`);
  }
  checkClone(clone);
  const harness = join(vars, "harness");
  rmSync(harness, { recursive: true, force: true });
  mkdirSync(harness, { recursive: true });
  for (const d of [...LIBS, "common"]) {
    cpSync(join(HERE, "rust", d), join(harness, d), { recursive: true, filter: (p) => !/(^|\/)target(\/|$)/.test(p) });
  }
  for (const lib of LIBS) {
    const toml = join(harness, lib, "Cargo.toml");
    const text = readFileSync(toml, "utf8");
    if (!text.includes(PATH_DEP)) fail(`${toml} has no path dependency to rewrite`);
    writeFileSync(toml, text.replaceAll(PATH_DEP, "../../crucible-dev-env/"));
  }
  process.stdout.write(`setup done: clone and harness copies under ${vars}\n`);
}

const readRows = (file) => readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

function run(args) {
  const o = flags(args, ["out", "vars", "seeds", "cases", "clean-cases"]);
  const m = /^(\d+)-(\d+)$/.exec(o.seeds ?? "0-49");
  if (!m || Number(m[1]) > Number(m[2])) fail("--seeds must be A-B with A <= B");
  const [a, b] = [Number(m[1]), Number(m[2])];
  const cases = intFlag(o, "cases", 1000);
  const cleanCases = intFlag(o, "clean-cases", 50000);
  const out = o.out ? resolve(o.out) : join(HERE, "results/runs.jsonl");
  const vars = varsDir(o);
  const clone = join(vars, TARGET);
  for (const lib of LIBS) if (!existsSync(join(vars, "harness", lib))) fail("missing harness copy; run setup");
  if (!existsSync(clone)) fail(`missing clone ${clone}; run setup`);
  checkClone(clone);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, "");
  let applied = null;
  const revert = () => {
    if (!applied) return;
    const r = sh("git", ["checkout", "-q", "--", "."], applied);
    if (r.status !== 0) process.stderr.write(`run: REVERT FAILED in ${applied}: ${r.stderr}\n`);
    applied = null;
  };
  const onSignal = (code) => () => { revert(); process.exit(code); };
  process.on("SIGINT", onSignal(130));
  process.on("SIGTERM", onSignal(143));
  process.on("exit", revert);
  const build = (defect) => {
    for (const lib of LIBS) {
      const r = sh("cargo", ["build", "--quiet", "--release", "--locked", "--example", "run"], join(vars, "harness", lib));
      if (r.status !== 0) fail(`build failed for ${lib} on ${defect}: ${(r.stderr ?? "").slice(-500)}`);
    }
  };
  const one = (defect, lib, seed, n) => {
    const dir = join(vars, "harness", lib);
    const t = sh(join(dir, "target/release/examples/run"), [String(seed), String(n)], dir, { timeout: 600_000 });
    const line = (t.stdout ?? "").split("\n").find((l) => l.startsWith("{"));
    const row = line ? JSON.parse(line) : { library: lib, seed, cases: n, status: "error", detected: 0, detail: `no row (exit ${t.status}, signal ${t.signal}): ${(t.stderr ?? "").slice(-200)}` };
    appendFileSync(out, JSON.stringify({ defect, ...row }) + "\n");
  };
  try {
    build("clean");
    for (const lib of LIBS) one("clean", lib, 0, cleanCases);
    for (const d of DEFECTS) {
      applied = clone; // set before apply so a partial apply is also reverted
      const diff = join(HERE, "mutants", `${d.id}.diff`);
      const r = sh("git", ["-C", clone, "apply", diff], clone);
      if (r.status !== 0) fail(`mutant ${d.id} does not apply: ${r.stderr}`);
      if (!sh("git", ["-C", clone, "diff", "--stat"], clone).stdout.trim()) fail(`mutant ${d.id} applied but changed nothing`);
      build(d.id);
      for (let seed = a; seed <= b; seed++) for (const lib of LIBS) one(d.id, lib, seed, cases);
      revert();
    }
  } finally { revert(); }
  process.stdout.write(`wrote ${out}\n`);
}

/** Summary text. Pure over the row list. */
export function summaryTable(rows) {
  const lines = ["| defect | library | detected | 95% CI | errors | exactly minimal | hand minimum | median shrunk steps | median cases to first failure |", "|---|---|---|---|---|---|---|---|---|"];
  for (const d of DEFECTS) for (const lib of LIBS) {
    const rs = rows.filter((r) => r.defect === d.id && r.library === lib);
    if (!rs.length) continue;
    const hits = rs.filter((r) => r.detected === 1);
    const [lo, hi] = clopperPearson(hits.length, rs.length);
    const sizes = hits.map((r) => r.shrunk_steps);
    const med = (xs) => (xs.length ? median(xs) : "");
    lines.push(`| ${d.id} | ${lib} | ${hits.length}/${rs.length} | ${lo.toFixed(3)}-${hi.toFixed(3)} | ${rs.filter((r) => r.status === "error").length} | ${sizes.filter((s) => s === d.min).length}/${hits.length} | ${d.min} | ${med(sizes)} | ${med(hits.map((r) => r.cases_to_first_failure))} |`);
  }
  const clean = rows.filter((r) => r.defect === "clean");
  const out = [...lines, ""];
  for (const r of clean) {
    out.push(r.status === "error" ? `Clean run, ${r.library}: error (${r.detail}).` : r.detected === 1
      ? `Clean run, ${r.library}: FAILED in ${r.cases} cases (seed ${r.seed}); ${r.shrunk_steps} steps, "${r.failed_invariant}".`
      : `Clean run, ${r.library}: no failure in ${r.cases} cases of up to 50 steps (seed ${r.seed}).`);
  }
  return out.join("\n") + "\n";
}

function summary(args) {
  const o = flags(args, ["in", "out"]);
  const text = summaryTable(readRows(o.in ? resolve(o.in) : join(HERE, "results/runs.jsonl")));
  writeFileSync(o.out ? resolve(o.out) : join(HERE, "results/summary.md"), text);
  process.stdout.write(text);
}

if (import.meta.main) {
  const [cmd, ...rest] = argv;
  try {
    if (cmd === "setup") setup(rest);
    else if (cmd === "run") run(rest);
    else if (cmd === "summary") summary(rest);
    else fail("unknown command");
  } catch (e) {
    process.stderr.write(`run.mjs: ${e instanceof Fail ? e.message : (e?.stack ?? e)}\n${e instanceof Fail ? USAGE : ""}`);
    process.exitCode = 1;
  }
}
