#!/usr/bin/env bun
// drive.mjs — seeded comparison driver for the Rust harness (Hegel vs proptest).
// Applies each defect's mutant diff to a throwaway clone, builds both packages, runs every (library, defect, seed)
// as one child process, and appends one JSON row per run to the results file. Always reverts the mutant.
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { handleBuildFlags } from "../../scripts/lib/build-id.mjs";

const USAGE = `usage: drive.mjs run [--defect ID]... [--seeds A-B] [--cases N] [--out FILE] [--vars DIR]
       drive.mjs clean-build <hegel|proptest>
       drive.mjs summary [--in FILE]
       drive.mjs --help | --build | --version

run          For each defect (all, or the --defect ids): apply its mutant diff (real defects need none), build both
             packages, then for each seed run each library once. Appends one JSON row per run to --out
             (default results/rust/runs.jsonl, relative to the investigation folder). Defaults: seeds 0-49,
             cases 1000, vars = the git-ignored clone directory three levels above this folder (var/pbt-cmp).
             Refuses to start when a clone has uncommitted changes; always reverts the mutant, also on a signal.
clean-build  Deletes the package's target/ and times 'cargo test --no-run'; prints MEASURE first_build_s <seconds> s.
summary      Prints detection k/50 per (library, defect) with a Clopper-Pearson 95% interval, the exactly-minimal
             fraction among detecting runs, and the median shrink time, from the rows file.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "drive" });
if (rc !== null) process.exit(rc);

const HERE = import.meta.dirname; // .../property-testing-library-comparison/rust
const FOLDER = resolve(HERE, "..");
const LIBS = ["hegel", "proptest"];

/** Defect catalogue (mirrors catalogue/rust.md). `size` maps a recorded counterexample string to its size measure. */
export const DEFECTS = [
  { id: "url-idempotent-arxiv", property: "url_idempotent", repo: "crucible-vault", diff: null, min: 25, minErrata: 21, size: (c) => debugStrChars(c) },
  { id: "action-layout-name", property: "action_layout_name", repo: "crucible-dev-env", diff: null, min: 0, size: (c) => layoutNameChars(c) },
  { id: "url-tracking-case", property: "url_invariants", repo: "crucible-vault", diff: "url-tracking-case.diff", min: 10, size: (c) => debugStrChars(c) },
  { id: "url-drop-gclid", property: "url_invariants", repo: "crucible-vault", diff: "url-drop-gclid.diff", min: 12, size: (c) => debugStrChars(c) },
  { id: "action-delta-i32", property: "action_roundtrip", repo: "crucible-dev-env", diff: "action-delta-i32.diff", min: 2147483648, size: (c) => intArg(c) },
  { id: "action-kelvin-max-exclusive", property: "action_roundtrip", repo: "crucible-dev-env", diff: "action-kelvin-max-exclusive.diff", min: 6500, size: (c) => intArg(c) },
  { id: "action-slot-nine-rejected", property: "action_roundtrip", repo: "crucible-dev-env", diff: "action-slot-nine-rejected.diff", min: 9, size: (c) => intArg(c) },
];

/** Characters in a Rust `{:?}` string literal (each escape counts as one character); NaN when it is not a quoted literal. */
export function debugStrChars(c) {
  if (!/^".*"$/s.test(c)) return NaN;
  return [...c.slice(1, -1).replace(/\\u\{[0-9a-fA-F]+\}|\\./g, "x")].length;
}

/** `SetLayout("ab")` -> 2 (characters in the name); NaN when the counterexample is some other form. */
export function layoutNameChars(c) {
  const m = /^SetLayout\((".*")\)$/s.exec(c);
  if (!m) return NaN;
  // Rust Debug string escapes (\u{..}, \n, \", \\) each stand for one character.
  const body = m[1].slice(1, -1);
  return [...body.replace(/\\u\{[0-9a-fA-F]+\}|\\./g, "x")].length;
}

/** The first integer inside the outermost parentheses, absolute value: `CycleStack(-5)` -> 5, `Slot(9)` -> 9, `NightLight(Kelvin(6500))` -> 6500. */
export function intArg(c) {
  const m = /(-?\d+)\)+$/.exec(c);
  return m ? Math.abs(Number(m[1])) : NaN;
}

function die(msg) { process.stderr.write(`drive: ${msg}\n${USAGE}`); process.exit(2); }

function flags(args) {
  const o = { _: [], defect: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    if (!["defect", "seeds", "cases", "out", "in", "vars"].includes(k) || i + 1 >= args.length) die(`bad argument ${a}`);
    if (k === "defect") o.defect.push(args[++i]); else o[k] = args[++i];
  }
  return o;
}

function sh(cmd, args, cwd, extra = {}) {
  return spawnSync(cmd, args, { cwd, encoding: "utf8", maxBuffer: 1 << 26, ...extra });
}

function run(args) {
  const o = flags(args);
  const [a, b] = (o.seeds ?? "0-49").split("-").map((x) => (/^\d+$/.test(x) ? Number(x) : die("--seeds must be A-B")));
  if (b === undefined || a > b) die("--seeds must be A-B with A <= B");
  const cases = /^\d+$/.test(o.cases ?? "1000") ? Number(o.cases ?? "1000") : die("--cases must be an integer");
  const out = resolve(FOLDER, o.out ?? "results/rust/runs.jsonl");
  const vars = resolve(o.vars ?? join(FOLDER, "../var/pbt-cmp"));
  const wanted = o.defect.length ? DEFECTS.filter((d) => o.defect.includes(d.id)) : DEFECTS;
  if (o.defect.some((id) => !DEFECTS.some((d) => d.id === id))) die("unknown --defect id");
  for (const r of ["crucible-vault", "crucible-dev-env"]) {
    if (!existsSync(join(vars, r))) die(`missing clone ${join(vars, r)}`);
    if (sh("git", ["status", "--porcelain"], join(vars, r)).stdout.trim()) die(`clone ${r} has uncommitted changes`);
  }
  mkdirSync(dirname(out), { recursive: true });
  let applied = null;
  const revert = () => { if (applied) { sh("git", ["checkout", "-q", "--", "."], applied); applied = null; } };
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { revert(); process.exit(130); });
  try {
    for (const d of wanted) {
      if (d.diff) {
        const r = sh("git", ["apply", join(FOLDER, "mutants/rust", d.diff)], join(vars, d.repo));
        if (r.status !== 0) die(`mutant ${d.diff} does not apply: ${r.stderr}`);
        applied = join(vars, d.repo);
      }
      for (const lib of LIBS) {
        const r = sh("cargo", ["build", "--quiet", "--example", "run"], join(HERE, lib));
        if (r.status !== 0) die(`build failed for ${lib} on ${d.id}: ${r.stderr.slice(-500)}`);
      }
      for (let seed = a; seed <= b; seed++) {
        for (const lib of LIBS) {
          const bin = join(HERE, lib, "target/debug/examples/run");
          const t = sh(bin, [d.property, String(seed), String(cases)], join(HERE, lib), { timeout: 300_000 });
          const line = (t.stdout ?? "").split("\n").find((l) => l.startsWith("{"));
          let row;
          if (line) row = JSON.parse(line); else row = { library: lib, property: d.property, seed, cases, status: "error", detail: `no row (exit ${t.status}, signal ${t.signal}): ${(t.stderr ?? "").slice(-200)}` };
          appendFileSync(out, JSON.stringify({ defect: d.id, detected: row.status === "fail" ? 1 : 0, ...row }) + "\n");
        }
      }
      revert();
    }
  } finally { revert(); }
}

function clopperPearson(k, n) {
  // Exact interval by bisection on the binomial tail (counts only; no dependency).
  const lgam = (x) => { let s = 0; for (let i = 2; i < x; i++) s += Math.log(i); return s; };
  const lchoose = (n, k) => lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1);
  const pmf = (i, p) => (p === 0 ? (i === 0 ? 1 : 0) : p === 1 ? (i === n ? 1 : 0) : Math.exp(lchoose(n, i) + i * Math.log(p) + (n - i) * Math.log(1 - p)));
  const cdf = (j, p) => { let s = 0; for (let i = 0; i <= j; i++) s += pmf(i, p); return s; };
  const solve = (f) => { let lo = 0, hi = 1; for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (f(m)) lo = m; else hi = m; } return (lo + hi) / 2; };
  const lower = k === 0 ? 0 : solve((p) => 1 - cdf(k - 1, p) < 0.025);
  const upper = k === n ? 1 : solve((p) => cdf(k, p) > 0.025);
  return [lower, upper];
}

function summary(args) {
  const o = flags(args);
  const file = resolve(FOLDER, o.in ?? "results/rust/runs.jsonl");
  const rows = readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const median = (xs) => (xs.length ? xs.sort((x, y) => x - y)[Math.floor((xs.length - 1) / 2)] : null);
  const lines = ["| defect | library | detected | 95% CI | errors | exactly minimal | exactly minimal (errata) | median size | median shrink ms |", "|---|---|---|---|---|---|---|---|---|"];
  for (const d of DEFECTS) for (const lib of LIBS) {
    const rs = rows.filter((r) => r.defect === d.id && r.library === lib);
    if (!rs.length) continue;
    const k = rs.filter((r) => r.detected === 1).length;
    const [lo, hi] = clopperPearson(k, rs.length);
    const hits = rs.filter((r) => r.detected === 1);
    const exact = hits.filter((r) => d.size(r.counterexample) === d.min).length;
    const med = median(hits.map((r) => d.size(r.counterexample)));
    const sh = median(hits.map((r) => r.shrink_ms).filter((x) => x !== null));
    lines.push(`| ${d.id} | ${lib} | ${k}/${rs.length} | ${lo.toFixed(3)}-${hi.toFixed(3)} | ${rs.filter((r) => r.status === "error").length} | ${exact}/${hits.length} | ${d.minErrata === undefined ? "" : hits.filter((r) => d.size(r.counterexample) === d.minErrata).length + "/" + hits.length} | ${med === null ? "" : med} | ${sh === null ? "" : sh.toFixed(1)} |`);
  }
  process.stdout.write(lines.join("\n") + "\n");
}

function cleanBuild(args) {
  const lib = args[0];
  if (!LIBS.includes(lib)) die("clean-build needs hegel or proptest");
  rmSync(join(HERE, lib, "target"), { recursive: true, force: true });
  const t0 = performance.now();
  const r = sh("cargo", ["test", "--no-run", "--quiet"], join(HERE, lib));
  const s = (performance.now() - t0) / 1000;
  if (r.status !== 0) { process.stderr.write(r.stderr); process.exit(1); }
  process.stdout.write(`MEASURE first_build_s ${s.toFixed(3)} s\n`);
}

const [cmd, ...rest] = argv;
if (cmd === "run") run(rest);
else if (cmd === "summary") summary(rest);
else if (cmd === "clean-build") cleanBuild(rest);
else die("unknown command");
