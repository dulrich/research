#!/usr/bin/env bun
// cost-install.mjs: first-install cost of one harness package, for scripts/measure.mjs.
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { handleBuildFlags } from "./lib/build-id.mjs";

const USAGE = `usage: cost-install.mjs <hegel|fastcheck>
       cost-install.mjs --help | --build | --version

Deletes <package>/node_modules, then times \`bun install --frozen-lockfile\` there (package manager cache warm,
no network needed once cached) and the first property run after it. Prints
"MEASURE install_ms <v> ms" and "MEASURE first_run_ms <v> ms" for scripts/measure.mjs.
`;
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.length === 0) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "cost-install" });
if (rc !== null) process.exit(rc);

const lib = argv[0];
if (!["hegel", "fastcheck"].includes(lib)) {
  process.stderr.write(`unknown package ${lib}\n`);
  process.exit(2);
}
const TS = fileURLToPath(new URL(".", import.meta.url));
const dir = join(TS, lib);
rmSync(join(dir, "node_modules"), { recursive: true, force: true });
const time = (args) => {
  const t0 = performance.now();
  const r = spawnSync("bun", args, { cwd: dir, encoding: "utf8" });
  if (r.status !== 0) {
    process.stderr.write(r.stderr);
    process.exit(1);
  }
  return performance.now() - t0;
};
const inst = time(["install", "--frozen-lockfile"]);
const first = time([join(TS, "runner.mjs"), lib, "pct-bounds", "--seeds", "0-0", "--cases", "1000", "--measure"]);
process.stdout.write(`MEASURE install_ms ${inst.toFixed(3)} ms\nMEASURE first_run_ms ${first.toFixed(3)} ms\n`);
