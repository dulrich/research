#!/usr/bin/env bun
// gen-configs.mjs - writes the per-class measure.mjs configs under configs/ (frozen files, committed).
// usage: bun live-host-measurement-confounds/gen-configs.mjs [--out-dir <dir>] | --help | --build | --version
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`usage: gen-configs.mjs [--out-dir <dir>]
       gen-configs.mjs --help | --build | --version
Writes the per-class measure.mjs configs (k1-pinned, k1-unpinned, k2, k3, k3s, k4-warm, k4-cold, k4-cold-local) with the frozen
invocation/warm-up counts from COUNTS below. K1 variants come from the round-5 mixed config (5 groups, all layouts).`);
  process.exit(0);
}
if (argv.includes("--build") || argv.includes("--version")) {
  const r = spawnSync("sh", [join(here, "ctl"), "--build"], { encoding: "utf8" });
  console.log(r.stdout.trim());
  process.exit(0);
}
const oi = argv.indexOf("--out-dir");
const outDir = oi >= 0 ? argv[oi + 1] : join(here, "configs");
mkdirSync(outDir, { recursive: true });

// Frozen counts (WP-1 pilot): invocations per variant per cell and discarded warm-up rounds. See notes.md.
export const COUNTS = {
  k1: { invocations: 10, warmup: 3 },
  k2: { invocations: 10, warmup: 1 },
  k3: { invocations: 10, warmup: 1 },
  k3s: { invocations: 10, warmup: 3 },
  "k4-warm": { invocations: 10, warmup: 3 },
  "k4-cold": { invocations: 10, warmup: 1 },
  "k4-cold-local": { invocations: 10, warmup: 3 },
};
const base = JSON.parse(readFileSync(join(here, "..", "sqlite-parse-number-rust-tuning", "measure-r5-mixed.json"), "utf8"));
const K1_GROUPS = ["c-gcc-O3-pgo", "c-gcc-O3-pgo-copy", "c-gcc-O2", "raw-nostd-gcc-o2", "safe-std-gcc-o2"];
const K1_VARIANTS = base.variants
  .filter((v) => K1_GROUPS.includes(v.group))
  .map((v) => ({ ...v, argv: v.argv.map((a) => (a === "r5bench" ? "lhmc-k1" : a)) }));
const rel = "live-host-measurement-confounds/runk.sh";
const kv = (name, cls) => ({ name, group: name, argv: ["sh", rel, cls, "{pad}"] });
const mk = (cls, variants, extra = {}) => ({
  variants,
  ...COUNTS[cls],
  padMax: 4096,
  aa: [variants[0].group ?? variants[0].name, variants[1].group ?? variants[1].name],
  baseline: variants[0].group ?? variants[0].name,
  seed: 20261112,
  ...extra,
});
const out = {
  "k1-pinned": mk("k1", K1_VARIANTS, { aa: base.aa, baseline: base.baseline, probe: { cpu: 8, container: "lhmc-k1" } }),
  "k1-unpinned": mk("k1", K1_VARIANTS, { aa: base.aa, baseline: base.baseline, probe: { container: "lhmc-k1" } }),
};
for (const [cls, cmd] of [["k2", "k2"], ["k3", "k3"], ["k3s", "k3s"], ["k4-warm", "k4-warm"], ["k4-cold", "k4-cold"], ["k4-cold-local", "k4-cold-local"]]) {
  out[cls] = mk(cls, [kv(`${cls}-a`, cmd), kv(`${cls}-a-copy`, cmd)]);
}
out["k1-pinned"].invocations = out["k1-unpinned"].invocations = COUNTS.k1.invocations;
for (const [name, cfg] of Object.entries(out)) writeFileSync(join(outDir, `${name}.json`), `${JSON.stringify(cfg, null, 1)}\n`);
console.log(`wrote ${Object.keys(out).length} configs to ${outDir}`);
