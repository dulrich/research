// gen-configs.mjs - writes configs/{a,b,c,d}.json (claim runs) and configs/pilot/*.json (pilot runs).
// usage: bun gen-configs.mjs [--bad-mib N]   (N: class c bad-mode threshold in MiB, fixed from the pilot)
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) { console.log("usage: gen-configs.mjs [--bad-mib N]\nWrites configs/*.json and configs/pilot/*.json for scripts/measure.mjs."); process.exit(0); }
if (args.includes("--build") || args.includes("--version")) { console.log("unknown"); process.exit(0); }
const bi = args.indexOf("--bad-mib");
const badMib = bi >= 0 ? Number(args[bi + 1]) : 0;
if (bi >= 0 && !(Number.isInteger(badMib) && badMib > 0)) { console.error("--bad-mib needs a positive integer"); process.exit(2); }
const RUN = "memory-measurement-calibration/run.sh";
const lvl = { kind: "level", better: "lower" };
const rate = { kind: "rate", better: "lower" };
const v = (name, ...a) => ({ name, group: name, argv: ["sh", RUN, ...a] });
const base = { warmup: 3, padMax: 4096, seed: 20261113 };
const alloc = ["cgroup_peak_mib", "cgroup_anon_hwm_mib", "cgroup_file_hwm_mib", "vmhwm_mib", "anon_settled_0s_mib", "rssanon_settled_0s_mib", "self_vmhwm_mib", "self_cgroup_peak_mib"];
const mk = (names, m) => Object.fromEntries(names.map((n) => [n, m]));
const classes = {
  a: { ...base, invocations: 30, variants: [v("a0", "probe-alloc", "0", "0"), v("a16", "probe-alloc", "16", "0"), v("a64", "probe-alloc", "64", "0"), v("a256", "probe-alloc", "256", "0"), v("a64-copy", "probe-alloc", "64", "0")],
       aa: ["a64", "a64-copy"], baseline: "a64", metrics: mk(alloc, lvl) },
  b: { ...base, invocations: 30, variants: [v("b64f256", "probe-alloc", "64", "256"), v("b256f256", "probe-alloc", "256", "256"), v("b64f256-copy", "probe-alloc", "64", "256")],
       aa: ["b64f256", "b64f256-copy"], baseline: "b64f256", metrics: mk(alloc, lvl) },
  d: { ...base, invocations: 30, variants: [v("bare", "bare-alloc", "64", "0"), v("probe", "probe-alloc", "64", "0"), v("probe-copy", "probe-alloc", "64", "0")],
       aa: ["probe", "probe-copy"], baseline: "bare", metrics: mk(["self_vmhwm_mib", "self_cgroup_peak_mib"], lvl) },
  c: { ...base, warmup: 1, invocations: 20, variants: [
         v("c12", "probe-churn", "12", "0", String(badMib)), v("c6", "probe-churn", "12", "0", String(badMib)), v("c2", "probe-churn", "12", "0", String(badMib)),
         v("c6-arena2", "probe-churn", "12", "2", String(badMib)), v("c6-copy", "probe-churn", "12", "0", String(badMib))],
       aa: ["c6", "c6-copy"], baseline: "c6",
       metrics: { ...mk(["cgroup_peak_mib", "cgroup_anon_hwm_mib", "cgroup_file_hwm_mib", "vmhwm_mib", "anon_settled_0s_mib", "anon_settled_30s_mib", "anon_settled_120s_mib",
         "rssanon_settled_0s_mib", "rssanon_settled_30s_mib", "rssanon_settled_120s_mib", "self_rssanon_mib", "arenas"], lvl),
         ...mk(["bad_mode_0s", "bad_mode_30s", "bad_mode_120s"], rate) } },
};
// the cpuset of a churn variant is a runtime env of run.sh; measure.mjs sets argv only, so it is carried by envPrefix
const cpus = { c12: "6-11,18-23", c6: "6-11", c2: "6,7", "c6-arena2": "6-11", "c6-copy": "6-11" };
for (const v of classes.c.variants) v.argv = ["env", `CAL_PIN=${cpus[v.name]}`, ...v.argv];
mkdirSync(join(here, "configs", "pilot"), { recursive: true });
for (const [k, c] of Object.entries(classes)) {
  if (k === "c" && !badMib) { console.error("class c written only with --bad-mib; skipped"); continue; }
  writeFileSync(join(here, "configs", `${k}.json`), JSON.stringify(c, null, 1) + "\n");
}
// pilot configs: few invocations, same variants (class c: only the 12- and 2-CPU conditions, bad threshold unused)
for (const [k, c] of Object.entries(classes)) {
  if (k === "c") continue;
  writeFileSync(join(here, "configs", "pilot", `${k}.json`), JSON.stringify({ ...c, invocations: 6, warmup: 1 }, null, 1) + "\n");
}
const pc = { ...classes.c, warmup: 0, invocations: 4, variants: classes.c.variants.filter((x) => /c12|c2/.test(x.name) && !/copy/.test(x.name)).map((x) => ({ ...x, argv: x.argv.map((t) => (t === String(badMib) ? "1" : t)) })) };
pc.aa = undefined; pc.baseline = "c12"; delete pc.aa;
writeFileSync(join(here, "configs", "pilot", "c.json"), JSON.stringify(pc, null, 1) + "\n");
