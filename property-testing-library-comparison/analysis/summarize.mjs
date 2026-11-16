#!/usr/bin/env bun
// summarize.mjs: numbers the README needs that no results table already carries: median cases to first
// failure for the Rust runs, and generator line counts per property for all four harness files.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleBuildFlags } from "../ts/lib/build-id.mjs";
import { median } from "../../scripts/lib/measure-stats.mjs";

const USAGE = `usage: summarize.mjs [print | write]
       summarize.mjs --help | --build | --version

print   Prints two Markdown tables to stdout: (1) median and maximum cases to first failure per (defect, library)
        for the Rust runs, from results/rust/runs.jsonl (detecting runs only); (2) generator line counts.
write   The same text, also written to results/summary.md.
Generator lines are the non-blank, non-comment lines of the generator definitions: for Rust the items from the
first generator function up to the property enum (shared const tables are excluded), per function; for
TypeScript the definitions between the file header and DEFAULT_CASES, split into shared definitions and one
entry per property. Run from the repository root.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "summarize" });
if (rc !== null) process.exit(rc);
const cmd = argv[0] ?? "print";
if (cmd !== "print" && cmd !== "write") {
  process.stderr.write(`unknown command ${cmd}\n`);
  process.exit(2);
}

const FOLDER = join(import.meta.dirname, "..");
const code = (lines) => lines.filter((l) => l.trim() !== "" && !l.trim().startsWith("//")).length;

function rustCases() {
  const rows = readFileSync(join(FOLDER, "results/rust/runs.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const out = ["| defect | library | detecting runs | median cases to first failure | max |", "|---|---|---|---|---|"];
  const ids = [...new Set(rows.map((r) => r.defect))];
  for (const id of ids) for (const lib of ["hegel", "proptest"]) {
    const cs = rows.filter((r) => r.defect === id && r.library === lib && r.detected === 1).map((r) => r.cases_to_first_failure);
    out.push(`| ${id} | ${lib} | ${cs.length} | ${cs.length ? median(cs) : ""} | ${cs.length ? Math.max(...cs) : ""} |`);
  }
  return out;
}

/** Non-blank, non-comment lines of the Rust item named `name` (with its attribute lines), up to its closing brace. */
function rustItem(lines, name) {
  const i = lines.findIndex((l) => l.startsWith(`fn ${name}(`));
  if (i < 0) return null;
  let s = i;
  while (s > 0 && (lines[s - 1].startsWith("#[") || lines[s - 1].startsWith("///"))) s--;
  let e = i;
  while (lines[e] !== "}") e++;
  return code(lines.slice(s, e + 1));
}

function rustCounts() {
  const rows = [];
  for (const [lib, names] of [
    ["hegel", ["structured_url", "any_input", "direction", "word", "trimmed_command", "action"]],
    ["proptest", ["text", "structured_url", "any_input", "direction", "word", "trimmed_command", "action"]],
  ]) {
    const lines = readFileSync(join(FOLDER, "rust", lib, "src/lib.rs"), "utf8").split("\n");
    const per = names.map((n) => [n, rustItem(lines, n)]);
    rows.push(`| rust ${lib} | ${per.map(([n, c]) => `${n} ${c}`).join(", ")} | ${per.reduce((a, [, c]) => a + c, 0)} |`);
  }
  return rows;
}

function tsCounts() {
  const rows = [];
  for (const [lib, table] of [["hegel", "GENS"], ["fastcheck", "ARBS"]]) {
    const lines = readFileSync(join(FOLDER, "ts", lib, "props.mjs"), "utf8").split("\n");
    const t = lines.findIndex((l) => l.startsWith(`export const ${table} = {`));
    const end = lines.findIndex((l, i) => i > t && l === "};");
    const first = lines.findIndex((l) => l.startsWith("// k successes"));
    const shared = code(lines.slice(first, t));
    const entries = [];
    let cur = null;
    for (const l of lines.slice(t + 1, end)) {
      const m = l.match(/^ {2}"([^"]+)":/);
      if (m) entries.push((cur = [m[1], []]));
      if (cur) cur[1].push(l);
    }
    const per = entries.map(([id, ls]) => [id, code(ls)]);
    const total = shared + per.reduce((a, [, c]) => a + c, 0);
    rows.push(`| ts ${lib} | shared definitions ${shared}; ${per.map(([n, c]) => `${n} ${c}`).join(", ")} | ${total} |`);
  }
  return rows;
}

const text = [
  "# Summary numbers",
  "",
  "Median cases to first failure, Rust (detecting runs; test-function invocations counted by the harness). Source: `results/rust/runs.jsonl`.",
  "",
  ...rustCases(),
  "",
  "Generator lines (non-blank, non-comment). Sources: `rust/*/src/lib.rs`, `ts/*/props.mjs`.",
  "",
  "| harness | lines per item | total |",
  "|---|---|---|",
  ...rustCounts(),
  ...tsCounts(),
  "",
].join("\n");
process.stdout.write(text);
if (cmd === "write") writeFileSync(join(FOLDER, "results", "summary.md"), text);
