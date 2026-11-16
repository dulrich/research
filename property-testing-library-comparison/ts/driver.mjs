#!/usr/bin/env bun
// driver.mjs: sets up the pinned target and mutant copies, runs the 50-seed comparison, tallies results.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { handleBuildFlags } from "./lib/build-id.mjs";

const USAGE = `usage: driver.mjs setup
       driver.mjs run [--libs hegel,fastcheck] [--defects ID,ID] [--seeds A-B] [--cases N]
       driver.mjs tally
       driver.mjs --help | --build | --version

setup   copies the pinned target (scripts/lib/measure-stats.mjs at commit 0384852, read with git show) into
        the gitignored var/ptlc-ts/ and applies each mutants/ts/<id>.diff to its own copy with patch.
run     for each (library, defect) runs ts/runner.mjs once over the seeds (default 0-49) at N cases (default
        1000) against that defect's mutant, writing one JSON row per run to results/ts/<library>__<defect>.jsonl.
tally   prints detection k/50 with a Clopper-Pearson 95% interval, median cases to first failure, and the
        exactly-minimal and size-minimal fractions of the detecting runs, as Markdown (also written to
        results/ts/tally.md).
Run from the repository root. Mutants are applied to var/ copies; scripts/lib/ is never edited.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.length === 0) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "driver" });
if (rc !== null) process.exit(rc);

const TS = fileURLToPath(new URL(".", import.meta.url));
const FOLDER = join(TS, "..");
const ROOT = join(FOLDER, "..");
const VAR = join(ROOT, "var", "ptlc-ts");
const BASE_COMMIT = "0384852";
const { DEFECTS, DEFECT_IDS, MIN_SIZE } = await import("./defects.mjs");
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const sh = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 28, ...o });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} failed (${r.status}): ${r.stderr}`);
  return r.stdout;
};
const targetFor = (id) => (id === "baseline" ? join(VAR, "measure-stats.mjs") : join(VAR, "m", id, "measure-stats.mjs"));

function setup() {
  mkdirSync(VAR, { recursive: true });
  writeFileSync(join(VAR, "measure-stats.mjs"), sh("git", ["show", `${BASE_COMMIT}:scripts/lib/measure-stats.mjs`], { cwd: ROOT }));
  for (const id of DEFECT_IDS) {
    const dir = join(VAR, "m", id);
    mkdirSync(dir, { recursive: true });
    copyFileSync(join(VAR, "measure-stats.mjs"), join(dir, "measure-stats.mjs"));
    sh("patch", ["-s", "-p1", "-i", join(FOLDER, "mutants", "ts", DEFECTS[id].mutant)], { cwd: dir });
    process.stdout.write(`mutant ${id} applied to ${dir}\n`);
  }
}

function run() {
  const libs = opt("--libs", "hegel,fastcheck").split(",");
  const defects = opt("--defects", DEFECT_IDS.join(",")).split(",");
  const seeds = opt("--seeds", "0-49");
  const cases = opt("--cases", "1000");
  mkdirSync(join(FOLDER, "results", "ts"), { recursive: true });
  for (const lib of libs) for (const id of defects) {
    const d = DEFECTS[id];
    if (!d) throw new Error(`unknown defect ${id}`);
    const t0 = performance.now();
    const out = sh("bun", [join(TS, "runner.mjs"), lib, d.property, "--seeds", seeds, "--cases", cases, "--defect", id], {
      cwd: join(TS, lib),
      env: { ...process.env, PTLC_TARGET: targetFor(id) },
    });
    writeFileSync(join(FOLDER, "results", "ts", `${lib}__${id}.jsonl`), out);
    process.stdout.write(`${lib} ${id}: ${out.trim().split("\n").length} rows in ${((performance.now() - t0) / 1000).toFixed(1)} s\n`);
  }
}

async function tally() {
  const { clopperPearson, median } = await import("../../scripts/lib/measure-stats.mjs");
  const lines = ["| defect | library | detected k/N | 95% CI (Clopper-Pearson) | median cases to first failure | exactly minimal (of detecting) | size-minimal (of detecting) | median final size |", "|---|---|---|---|---|---|---|---|"];
  for (const id of DEFECT_IDS) for (const lib of ["hegel", "fastcheck"]) {
    const f = join(FOLDER, "results", "ts", `${lib}__${id}.jsonl`);
    if (!existsSync(f)) continue;
    const rows = readFileSync(f, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const det = rows.filter((r) => r.detected === 1);
    const [lo, hi] = clopperPearson(det.length, rows.length);
    const sizes = det.map((r) => DEFECTS[id].size(r.inputs));
    const exact = det.filter((r) => DEFECTS[id].isMinimal(r.inputs)).length;
    const sizeMin = det.filter((r) => DEFECTS[id].size(r.inputs) === MIN_SIZE[id]).length;
    const cs = det.map((r) => r.cases).filter((c) => c !== "");
    lines.push(`| ${id} | ${lib} | ${det.length}/${rows.length} | [${lo.toFixed(3)}, ${hi.toFixed(3)}] | ${cs.length ? median(cs) : ""} | ${det.length ? `${exact}/${det.length}` : ""} | ${det.length ? `${sizeMin}/${det.length}` : ""} | ${sizes.length ? median(sizes) : ""} |`);
  }
  const md = lines.join("\n") + "\n";
  writeFileSync(join(FOLDER, "results", "ts", "tally.md"), md);
  process.stdout.write(md);
}


const cmd = argv[0];
if (cmd === "setup") setup();
else if (cmd === "run") run();
else if (cmd === "tally") await tally();
else {
  process.stderr.write(`unknown command ${cmd}\n`);
  process.exit(2);
}
