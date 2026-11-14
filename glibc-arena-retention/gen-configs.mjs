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
// Claim classes (configs/{r,s,p}.json), written with --bad-mib: burst settings match the pilot (25 MiB thread burst, 70% fastbin, trim, interval 0.1 s).
if (badMib) {
  const rateM = (ws) => ({ ...mk([...probeFor(ws), ...truth], lvl), ...mk(ws.map((w) => `bad_mode_${w}s`), rate) });
  // R: rate recovery. Baseline p0 (the always-good-mode endpoint); p25b is the A/A copy of p25.
  const wr = [0, 2];
  const ro = { interval: "0.1", settle: wr.join(","), badMib };
  const r = {
    ...base, warmup: 1, invocations: 60,
    variants: [v("p0", ["--bad-p", "0", ...T], ro), v("p25", ["--bad-p", "0.25", ...T], ro), v("p25b", ["--bad-p", "0.25", ...T], ro), v("p50", ["--bad-p", "0.5", ...T], ro)],
    aa: ["p25", "p25b"], baseline: "p0", metrics: rateM(wr),
  };
  // S: settle-window bias. Bad mode always present; late free uniform in [0, 10 s] vs none.
  const ws = [0, 2, 4, 6, 8, 10, 12];
  const so = { interval: "0.1", settle: ws.join(","), badMib, idle: 14 };
  const s = {
    ...base, warmup: 1, invocations: 30,
    variants: [v("late10", ["--bad-p", "1", "--late-max", "10", ...T], so), v("nolate", ["--bad-p", "1", ...T], so)], baseline: "nolate", metrics: rateM(ws),
  };
  // P: continuous spread in pool mode (4 workers, 12 requests, default queue); the rate at other thresholds is derived from the levels by analyze.mjs.
  const wp = [0, 3];
  const po = { interval: "0.1", settle: wp.join(","), badMib };
  const p = {
    ...base, warmup: 1, invocations: 40,
    variants: [v("pool", ["--pool", "4", "--requests", "12", ...T], po)], baseline: "pool", metrics: rateM(wp),
  };
  for (const [n, c] of [["r", r], ["s", s], ["p", p]]) writeFileSync(join(here, "configs", `${n}.json`), JSON.stringify(c, null, 1) + "\n");
}
