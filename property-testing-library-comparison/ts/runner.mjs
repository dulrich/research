#!/usr/bin/env bun
// runner.mjs: runs one property of one library over a range of seeds, one JSON row per run on stdout.
import { handleBuildFlags } from "./lib/build-id.mjs";

const USAGE = `usage: runner.mjs <hegel|fastcheck> <property-id> [--seeds A-B] [--cases N] [--defect ID] [--measure]
       runner.mjs --help | --build | --version

Runs the property once per seed (default 0-49) at N test cases (default 1000) against the target selected by
the PTLC_TARGET environment variable (default: the unmodified copy under var/), printing one JSON row per
run: library, defect, seed, detected (0/1), cases, counterexample (verbatim), inputs, shrinkMs, totalMs.
--defect only labels the rows. --measure prints "MEASURE run_ms <v> ms" (sum over seeds) and
"MEASURE process_ms <v> ms" (process start to end) instead of rows, for scripts/measure.mjs.
Property ids: cp-bounds cp-symmetry cp-narrowing nd-props pct-bounds pct-monotone pct-perm.
Hegel is configured by hegel.toml in ts/hegel (run from that directory) and per run with the database off.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.length === 0) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "runner" });
if (rc !== null) process.exit(rc);

const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const [lib, id] = argv;
if (!["hegel", "fastcheck"].includes(lib)) {
  process.stderr.write(`unknown library ${lib}\n`);
  process.exit(2);
}
const m = /^(\d+)-(\d+)$/.exec(opt("--seeds", "0-49"));
if (!m) {
  process.stderr.write("bad --seeds (want A-B)\n");
  process.exit(2);
}
const cases = Number(opt("--cases", "1000"));
if (!Number.isInteger(cases) || cases < 1) {
  process.stderr.write("bad --cases\n");
  process.exit(2);
}
const defect = opt("--defect", "baseline");
const { runProp } = await import(`./${lib}/props.mjs`);
const { PROP_IDS } = await import("./checks.mjs");
if (!PROP_IDS.includes(id)) {
  process.stderr.write(`unknown property ${id}\n`);
  process.exit(2);
}
let sum = 0;
for (let seed = Number(m[1]); seed <= Number(m[2]); seed++) {
  const r = await runProp(id, { seed, testCases: cases });
  sum += r.totalMs;
  if (!argv.includes("--measure")) process.stdout.write(JSON.stringify({ library: lib, defect, property: id, seed, cases_budget: cases, ...r }) + "\n");
}
if (argv.includes("--measure")) {
  process.stdout.write(`MEASURE run_ms ${sum.toFixed(3)} ms\nMEASURE process_ms ${performance.now().toFixed(3)} ms\n`);
}
