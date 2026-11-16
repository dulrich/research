#!/usr/bin/env bun
// verify-minimal.mjs: brute-force check of the catalogue's hand-derived minimal counterexamples.
// Not a library run: it enumerates a small input domain directly against each mutant (one child
// process per defect so PTLC_TARGET picks the mutant) and reports the smallest failing input by
// the catalogue's size measure. Usage: bun ts/verify-minimal.mjs <defect-id> | --help | --build | --version
import { handleBuildFlags } from "./lib/build-id.mjs";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.length === 0) {
  process.stdout.write(`usage: verify-minimal.mjs <defect-id> | --help | --build | --version

Enumerates a small input domain against the mutant selected by PTLC_TARGET (set by driver.mjs verify)
and prints the failing inputs of smallest size for the defect's designated property.
`);
  process.exit(0);
}
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "verify-minimal" });
if (rc !== null) process.exit(rc);

const { CHECKS } = await import("./checks.mjs");
const { DEFECTS } = await import("./defects.mjs");
const id = argv[0];
const d = DEFECTS[id];
if (!d) {
  process.stderr.write(`unknown defect ${id}\n`);
  process.exit(2);
}
const fails = (inputs) => {
  const copy = structuredClone(inputs);
  try { CHECKS[d.property](copy); return false; } catch { return true; }
};
const found = [];
const alphas = [0.001, 0.002, 0.01, 0.05, 0.1, 0.5];
const vals = [-2, -1, -0.5, 0, 0.5, 1, 2];
const qs = [0, 0.25, 0.5, 0.9, 0.995, 1];
const arrays = [];
for (const a of vals) { arrays.push([a]); for (const b of vals) { arrays.push([a, b]); for (const c of vals) arrays.push([a, b, c]); } }
if (d.property.startsWith("cp-")) {
  for (let n = 1; n <= 8; n++) for (let k = 0; k <= n; k++) for (const alpha of alphas) {
    const inputs = d.property === "cp-narrowing" ? { k, n, a1: alpha, a2: 0.5 } : { k, n, alpha };
    if (fails(inputs)) found.push(inputs);
  }
} else if (d.property === "nd-props") {
  for (let n1 = 1; n1 <= 3; n1++) for (let k1 = 0; k1 <= n1; k1++) for (let n2 = 1; n2 <= 3; n2++) for (let k2 = 0; k2 <= n2; k2++) {
    const inputs = { k1, n1, k2, n2 };
    if (fails(inputs)) found.push(inputs);
  }
} else {
  for (const xs of arrays) for (const q of qs) {
    const inputs = d.property === "pct-perm" ? { xs, ys: [...xs].reverse(), q } : { xs, q };
    if (fails(inputs)) found.push(inputs);
  }
}
found.sort((a, b) => d.size(a) - d.size(b));
const best = found.length ? d.size(found[0]) : null;
process.stdout.write(`${id}: ${found.length} failing inputs in the domain; minimal size ${best}\n`);
for (const f of found.filter((f) => d.size(f) === best).slice(0, 6)) process.stdout.write(`  ${JSON.stringify(f)} isMinimal=${d.isMinimal(f)}\n`);
