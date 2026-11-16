#!/usr/bin/env bun
// run.mjs — driver for the sampled-list order x content study (Hegel and proptest, URL cells of the comparison).
// setup: clones the targets at their pins and builds a scratch copy of the two harness packages with the variant diffs applied.
// run: applies each mutant to its clone, builds, runs variants x seeds x libraries, always reverts the mutant.
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { clopperPearson, median } from "../scripts/lib/measure-stats.mjs";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";

const USAGE = `usage: run.mjs setup [--src DIR] [--vars DIR]
       run.mjs run [--out FILE] [--vars DIR] [--seeds A-B] [--cases N]
       run.mjs summary [--in FILE] [--out FILE]
       run.mjs baseline [--in FILE]
       run.mjs --help | --build | --version

setup     Clones crucible-vault (49a46372) and crucible-dev-env (d02df23) from SRC/<repo> into VARS, copies the
          comparison's two harness packages (without target/) to VARS/harness/<lib>, rewrites their path
          dependencies to the clones, and applies diffs/<lib>.diff. SRC defaults to the directory holding this
          repository; VARS defaults to runs/spike/slos in this repository (git-ignored). Needs git, patch, cargo, network for
          the first cargo build. Idempotent: an existing clone must be at its pin and clean.
run       For each defect (url-idempotent-arxiv, url-tracking-case, url-drop-gclid): apply its mutant diff to the
          clone, build both packages (debug, as the comparison), then run every variant x seed x library as one child
          process with SLOS_LISTS set. Writes one JSON row per run to --out (default results/runs.jsonl; the file
          is replaced). Defaults: seeds 0-49, cases 1000. Refuses to start on a dirty clone; every failure after
          a mutant is applied unwinds through the revert, also on SIGINT/SIGTERM. Exits non-zero on failure.
summary   Writes the per-cell table (detection, Clopper-Pearson 95%, exactly minimal, median size) from --in
          (default results/runs.jsonl) to --out (default results/summary.md) and prints it.
baseline  Compares the committed-variant rows with the comparison's results/rust/runs.jsonl on the projected
          fields (defect, library, variant, seed, status, detected, cases_to_first_failure, counterexample).
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "run" });
if (rc !== null) process.exit(rc);

const HERE = import.meta.dirname;
const REPO = resolve(HERE, "..");
const COMPARISON = join(REPO, "property-testing-library-comparison");
const LIBS = ["hegel", "proptest"];
const VARIANTS = ["committed", "ordered", "committed+short", "ordered+short"];
const PINS = { "crucible-vault": "49a46372", "crucible-dev-env": "d02df23" };
const PROJECTED = ["defect", "library", "variant", "seed", "status", "detected", "cases_to_first_failure", "counterexample"];

/** Characters in a Rust `{:?}` string literal (each escape counts as one character); NaN when not a quoted literal. */
export function debugStrChars(c) {
  if (typeof c !== "string" || !/^".*"$/s.test(c)) return NaN;
  return [...c.slice(1, -1).replace(/\\u\{[0-9a-fA-F]+\}|\\./g, "x")].length;
}

/** The comparison's catalogue entries for the three URL cells (minima from its catalogue). */
export const DEFECTS = [
  { id: "url-idempotent-arxiv", property: "url_idempotent", repo: "crucible-vault", diff: null, min: 25, minErrata: 21, size: debugStrChars },
  { id: "url-tracking-case", property: "url_invariants", repo: "crucible-vault", diff: "url-tracking-case.diff", min: 10, size: debugStrChars },
  { id: "url-drop-gclid", property: "url_invariants", repo: "crucible-vault", diff: "url-drop-gclid.diff", min: 12, size: debugStrChars },
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

const varsDir = (o) => resolve(o.vars ?? join(REPO, "runs/spike/slos"));

function setup(args) {
  const o = flags(args, ["src", "vars"]);
  const src = resolve(o.src ?? dirname(REPO));
  const vars = varsDir(o);
  mkdirSync(vars, { recursive: true });
  for (const [repo, pin] of Object.entries(PINS)) {
    const dir = join(vars, repo);
    if (!existsSync(dir)) {
      let r = sh("git", ["clone", "-q", "--no-checkout", join(src, repo), dir], vars);
      if (r.status !== 0) fail(`clone of ${join(src, repo)} failed: ${r.stderr}`);
      r = sh("git", ["checkout", "-q", "--detach", pin], dir);
      if (r.status !== 0) fail(`checkout ${pin} in ${repo} failed: ${r.stderr}`);
    }
    const head = sh("git", ["rev-parse", "HEAD"], dir).stdout.trim();
    if (!head.startsWith(pin)) fail(`clone ${repo} is at ${head}, not the pin ${pin}`);
    if (sh("git", ["status", "--porcelain"], dir).stdout.trim()) fail(`clone ${repo} has uncommitted changes`);
  }
  for (const lib of LIBS) {
    const dst = join(vars, "harness", lib);
    rmSync(dst, { recursive: true, force: true });
    cpSync(join(COMPARISON, "rust", lib), dst, { recursive: true, filter: (p) => !/(^|\/)target(\/|$)/.test(p) });
    const toml = join(dst, "Cargo.toml");
    const text = readFileSync(toml, "utf8");
    if (!text.includes("../../../runs/spike/pbt-cmp/")) fail(`${toml} has no path dependency to rewrite`);
    writeFileSync(toml, text.replaceAll("../../../runs/spike/pbt-cmp/", "../../"));
    const r = sh("patch", ["-p1", "-s", "-d", dst, "-i", join(HERE, "diffs", `${lib}.diff`)], dst);
    if (r.status !== 0) fail(`diffs/${lib}.diff does not apply: ${r.stderr}`);
  }
  process.stdout.write(`setup done: clones and harness copies under ${vars}\n`);
}

function run(args) {
  const o = flags(args, ["out", "vars", "seeds", "cases"]);
  const m = /^(\d+)-(\d+)$/.exec(o.seeds ?? "0-49");
  if (!m || Number(m[1]) > Number(m[2])) fail("--seeds must be A-B with A <= B");
  const [a, b] = [Number(m[1]), Number(m[2])];
  if (!/^\d+$/.test(o.cases ?? "1000")) fail("--cases must be an integer");
  const cases = Number(o.cases ?? "1000");
  const out = (o.out ? resolve(o.out) : join(HERE, "results/runs.jsonl"));
  const vars = varsDir(o);
  for (const lib of LIBS) if (!existsSync(join(vars, "harness", lib))) fail("missing harness copy; run setup");
  for (const r of Object.keys(PINS)) {
    if (!existsSync(join(vars, r))) fail(`missing clone ${join(vars, r)}; run setup`);
    if (sh("git", ["status", "--porcelain"], join(vars, r)).stdout.trim()) fail(`clone ${r} has uncommitted changes`);
  }
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
  try {
    for (const d of DEFECTS) {
      if (d.diff) {
        const clone = join(vars, d.repo);
        applied = clone; // set before apply so a partial apply is also reverted
        const r = sh("git", ["apply", join(COMPARISON, "mutants/rust", d.diff)], clone);
        if (r.status !== 0) fail(`mutant ${d.diff} does not apply: ${r.stderr}`);
      }
      for (const lib of LIBS) {
        const r = sh("cargo", ["build", "--quiet", "--example", "run"], join(vars, "harness", lib));
        if (r.status !== 0) fail(`build failed for ${lib} on ${d.id}: ${(r.stderr ?? "").slice(-500)}`);
      }
      for (const variant of VARIANTS) for (let seed = a; seed <= b; seed++) for (const lib of LIBS) {
        const dir = join(vars, "harness", lib);
        const t = sh(join(dir, "target/debug/examples/run"), [d.property, String(seed), String(cases)], dir, { timeout: 300_000, env: { ...process.env, SLOS_LISTS: variant } });
        const line = (t.stdout ?? "").split("\n").find((l) => l.startsWith("{"));
        const row = line ? JSON.parse(line) : { library: lib, property: d.property, seed, cases, status: "error", detail: `no row (exit ${t.status}, signal ${t.signal}): ${(t.stderr ?? "").slice(-200)}` };
        appendFileSync(out, JSON.stringify({ defect: d.id, variant, detected: row.status === "fail" ? 1 : 0, ...row }) + "\n");
      }
      revert();
    }
  } finally { revert(); }
  process.stdout.write(`wrote ${out}\n`);
}

const readRows = (file) => readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));

/** Table rows: one per (defect, variant, library). Pure over the row list. */
export function summaryTable(rows) {
  const lines = ["| defect | variant | library | detected | 95% CI | errors | exactly minimal | exactly minimal (errata) | median size | min size |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const d of DEFECTS) for (const variant of VARIANTS) for (const lib of LIBS) {
    const rs = rows.filter((r) => r.defect === d.id && r.variant === variant && r.library === lib);
    if (!rs.length) continue;
    const hits = rs.filter((r) => r.detected === 1);
    const [lo, hi] = clopperPearson(hits.length, rs.length);
    const sizes = hits.map((r) => d.size(r.counterexample));
    const exact = sizes.filter((s) => s === d.min).length;
    const med = median(sizes);
    lines.push(`| ${d.id} | ${variant} | ${lib} | ${hits.length}/${rs.length} | ${lo.toFixed(3)}-${hi.toFixed(3)} | ${rs.filter((r) => r.status === "error").length} | ${exact}/${hits.length} | ${d.minErrata === undefined ? "" : sizes.filter((s) => s === d.minErrata).length + "/" + hits.length} | ${hits.length ? med : ""} | ${hits.length ? Math.min(...sizes) : ""} |`);
  }
  return lines.join("\n") + "\n";
}

function summary(args) {
  const o = flags(args, ["in", "out"]);
  const text = summaryTable(readRows((o.in ? resolve(o.in) : join(HERE, "results/runs.jsonl"))));
  writeFileSync((o.out ? resolve(o.out) : join(HERE, "results/summary.md")), text);
  process.stdout.write(text);
}

/** Per-cell comparison of the committed-variant rows against the comparison's rows on the projected fields. */
export function baselineDiff(mine, theirs) {
  const proj = (r, variant) => JSON.stringify(PROJECTED.map((k) => (k === "variant" ? variant : r[k] ?? null)));
  const out = { cells: [], rows: 0, mismatched: 0 };
  for (const d of DEFECTS) for (const lib of LIBS) {
    const a = mine.filter((r) => r.defect === d.id && r.library === lib && r.variant === "committed");
    const bySeed = new Map(theirs.filter((r) => r.defect === d.id && r.library === lib).map((r) => [r.seed, r]));
    const diffs = [];
    for (const r of a) {
      const t = bySeed.get(r.seed);
      if (!t) { diffs.push({ seed: r.seed, fields: ["missing in comparison"] }); continue; }
      if (proj(r, "committed") !== proj(t, "committed")) diffs.push({ seed: r.seed, fields: PROJECTED.filter((k) => k !== "variant" && JSON.stringify(r[k] ?? null) !== JSON.stringify(t[k] ?? null)) });
    }
    out.rows += a.length;
    out.mismatched += diffs.length;
    out.cells.push({ defect: d.id, library: lib, rows: a.length, mismatched: diffs.length, diffs });
  }
  return out;
}

function baseline(args) {
  const o = flags(args, ["in"]);
  const mine = readRows((o.in ? resolve(o.in) : join(HERE, "results/runs.jsonl")));
  const theirs = readRows(join(COMPARISON, "results/rust/runs.jsonl"));
  const r = baselineDiff(mine, theirs);
  const lines = ["| defect | library | committed rows | mismatching rows | seeds (fields) |", "|---|---|---|---|---|"];
  for (const c of r.cells) lines.push(`| ${c.defect} | ${c.library} | ${c.rows} | ${c.mismatched} | ${c.diffs.map((x) => `${x.seed} (${x.fields.join(",")})`).join("; ")} |`);
  lines.push("", `total: ${r.mismatched} of ${r.rows} committed rows differ on the projected fields`);
  process.stdout.write(lines.join("\n") + "\n");
}

if (import.meta.main) {
  const [cmd, ...rest] = argv;
  try {
    if (cmd === "setup") setup(rest);
    else if (cmd === "run") run(rest);
    else if (cmd === "summary") summary(rest);
    else if (cmd === "baseline") baseline(rest);
    else fail("unknown command");
  } catch (e) {
    process.stderr.write(`run.mjs: ${e instanceof Fail ? e.message : (e?.stack ?? e)}\n${e instanceof Fail ? USAGE : ""}`);
    process.exitCode = 1;
  }
}
