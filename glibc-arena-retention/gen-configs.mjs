// gen-configs.mjs - writes configs/mech.json (mechanism class) and configs/pilot/*.json (pilot runs) for scripts/measure.mjs.
// usage: bun glibc-arena-retention/gen-configs.mjs [--bad-mib N]   (N: bad-mode threshold in MiB, fixed from the pilot)
// configs/pilot/settle.json (a rate pilot) is written only with --bad-mib.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) { console.log("usage: gen-configs.mjs [--bad-mib N]\nWrites configs/mech.json and configs/pilot/*.json for scripts/measure.mjs; --bad-mib N (a positive integer, the\nbad-mode threshold in MiB) also writes configs/pilot/settle.json.\n--help | --build | --version"); process.exit(0); }
const rc = handleBuildFlags(args, { path: import.meta.filename, name: "gen-configs" });
if (rc !== null) process.exit(rc);
const bi = args.indexOf("--bad-mib");
const badMib = bi >= 0 ? Number(args[bi + 1]) : 0;
if (bi >= 0 && !(Number.isInteger(badMib) && badMib > 0)) { console.error("--bad-mib needs a positive integer"); process.exit(2); }

const RUN = "glibc-arena-retention/run.mjs";
const lvl = { kind: "level", better: "lower" };
const rate = { kind: "rate", better: "lower" };
const mk = (names, m) => Object.fromEntries(names.map((n) => [n, m]));
// run.mjs options, then "--", then retain arguments
const v = (name, retain, o = {}) => {
  const opt = ["--interval", o.interval ?? "0.1", "--settle", o.settle ?? "0,3"];
  if (o.badMib) opt.push("--bad-mib", String(o.badMib));
  if (o.tunables) opt.push("--tunables", o.tunables);
  return { name, group: name, argv: ["bun", RUN, ...opt, "--", ...retain, ...(o.idle ? ["--idle", String(o.idle)] : [])] };
};
const base = { padMax: 4096, seed: 20261114 };
// Ground truth and self-report metrics are levels (bad_drawn is -1 in pool mode, so it cannot be a rate; release_* are seconds, -1 = none).
const truth = ["bad_drawn", "release_delay_s", "release_actual_s", "self_rssanon_boundary_mib", "self_rssanon_mib"];
const probeFor = (ws) => ["cgroup_peak_mib", "cgroup_anon_hwm_mib", "cgroup_file_hwm_mib", "vmhwm_mib", ...ws.flatMap((w) => [`anon_settled_${w}s_mib`, `rssanon_settled_${w}s_mib`])];

// Mechanism class: thread burst without a pin is the bad mode; every variant trims unless it is about trim.
const T = ["--trim"];
const mech = {
  ...base, warmup: 1, invocations: 6,
  variants: [
    v("thread", T), v("thread-copy", T), v("main", ["--main", ...T]),
    v("fast0", ["--fast-pct", "0", ...T]), v("fast70", ["--fast-pct", "70", ...T]), v("fast100", ["--fast-pct", "100", ...T]),
    v("mxfast0", T, { tunables: "glibc.malloc.mxfast=0" }),
    v("pin0.1", ["--pin-at", "0.1", ...T]), v("pin0.5", ["--pin-at", "0.5", ...T]), v("pin0.9", ["--pin-at", "0.9", ...T]), v("pin0.99", ["--pin-at", "0.99", ...T]),
    v("mib16", ["--mib", "16", ...T]), v("mib48", ["--mib", "48", ...T]), v("mib100", ["--mib", "100", ...T]),
    v("notrim", []), v("thr128k", ["--trim-threshold", "131072", ...T]), v("thr128k-notrim", ["--trim-threshold", "131072"]),
    v("late1s", ["--late-max", "1", ...T], { idle: 5 }),
  ],
  aa: ["thread", "thread-copy"], baseline: "thread",
  metrics: mk([...probeFor([0, 3]), ...truth], lvl),
};
// Pilot p: both endpoints of --bad-p with the claim-run burst settings (25 MiB thread burst, 70% fastbin, trim).
const pilotP = {
  ...base, warmup: 1, invocations: 12,
  variants: [v("p0", ["--bad-p", "0", ...T]), v("p1", ["--bad-p", "1", ...T])], baseline: "p0",
  metrics: mk([...probeFor([0, 3]), ...truth], lvl),
};
mkdirSync(join(here, "configs", "pilot"), { recursive: true });
writeFileSync(join(here, "configs", "mech.json"), JSON.stringify(mech, null, 1) + "\n");
writeFileSync(join(here, "configs", "pilot", "p.json"), JSON.stringify(pilotP, null, 1) + "\n");
// Pilot settle: bad mode always present, late free uniform in [0, 10 s], windows 0-12 s, probe interval 0.1 s.
if (badMib) {
  const ws = [0, 2, 4, 6, 8, 10, 12];
  const o = { interval: "0.1", settle: ws.join(","), badMib, idle: 14 };
  const settle = {
    ...base, warmup: 1, invocations: 12,
    variants: [v("late10", ["--bad-p", "1", "--late-max", "10", ...T], o), v("nolate", ["--bad-p", "1", ...T], o)], baseline: "nolate",
    metrics: { ...mk([...probeFor(ws), ...truth], lvl), ...mk(ws.map((w) => `bad_mode_${w}s`), rate) },
  };
  writeFileSync(join(here, "configs", "pilot", "settle.json"), JSON.stringify(settle, null, 1) + "\n");
}
