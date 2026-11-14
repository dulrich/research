// gen-configs.mjs - writes configs/*.json (claim runs) and configs/pilot/*.json (pilot runs) for scripts/measure.mjs.
// usage: bun gen-configs.mjs
// Desktop configs run locally (pinned to CPU 6, its SMT sibling is CPU 18); laptop configs use {host} in the ssh channel
// (give --host on the measure.mjs command line) and the folder's run.sh and the probe copied to /var/tmp/cpucal on the laptop.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.includes("--help")) { console.log("usage: gen-configs.mjs\nWrites configs/*.json and configs/pilot/*.json for scripts/measure.mjs."); process.exit(0); }
if (args.includes("--build") || args.includes("--version")) { console.log("unknown"); process.exit(0); }

const LOCAL = "cpu-measurement-calibration/run.sh";
const REMOTE = "/var/tmp/cpucal/cpu-measurement-calibration/run.sh";
const lvl = { kind: "level", better: "lower" };
const mk = (names) => Object.fromEntries(names.map((n) => [n, lvl]));
const base = { warmup: 3, padMax: 4096, seed: 20261113, invocations: 30 };
const PROBE = ["cpu_task_clock_ms", "cpu_user_ms", "cpu_sys_ms", "instructions_u", "cycles_u", "cgroup_usage_ms", "sibling_busy", "cpuset_ncpus"];
const KERNEL = ["instructions_k", "cycles_k"];
const WL = 300000000; // iterations of the fixed workload in classes b-e
const host = {
  desktop: { run: LOCAL, wrap: (c) => c, pin: "6", sib: "18", probe: { cpu: 6 } },
  laptop: { run: REMOTE, wrap: (c) => ({ ...c, channel: { argv: ["ssh", "{host}", "sh", "-s"] } }), pin: "2", sib: "3", probe: { cpu: 2 } },
};
const cell = (h, name, mode, wl, n, ...extra) => ({ name, group: name, argv: ["sh", host[h].run, mode, wl, String(n), ...extra] });
const cfg = (h, c) => host[h].wrap({ ...base, probe: host[h].probe, ...c });

const out = {};
// (a) source agreement and control subtraction: zero-work control and three sizes, latency mode, A/A on the middle size
for (const h of ["desktop", "laptop"]) {
  const ex = ["--pin", host[h].pin, "--sibling", host[h].sib, "--kernel"];
  out[`a-${h}`] = cfg(h, {
    variants: [cell(h, "n0", "probe", "lat", 0, ...ex), cell(h, "n1e8", "probe", "lat", 100000000, ...ex), cell(h, "n3e8", "probe", "lat", 300000000, ...ex),
      cell(h, "n1e9", "probe", "lat", 1000000000, ...ex), cell(h, "n3e8-copy", "probe", "lat", 300000000, ...ex)],
    aa: ["n3e8", "n3e8-copy"], baseline: "n3e8", metrics: mk([...PROBE, ...KERNEL]),
  });
}
// (b) warm-up: first invocation in a fresh container vs the second in the same container (a measured condition of the variant)
{
  const h = "desktop", ex = ["--pin", host[h].pin, "--sibling", host[h].sib];
  const pair = ["first_", "second_"].flatMap((p) => PROBE.filter((m) => m !== "cpuset_ncpus").map((m) => p + m));
  out.b = cfg(h, {
    variants: [cell(h, "fresh", "probe", "lat", WL, ...ex), cell(h, "later", "later", "lat", WL, ...ex), cell(h, "pair", "pair", "lat", WL, ...ex), cell(h, "fresh-copy", "probe", "lat", WL, ...ex)],
    aa: ["fresh", "fresh-copy"], baseline: "fresh", metrics: mk([...PROBE, ...pair]),
  });
}
// (c) desktop, live: pinned to CPU 6 vs unpinned, latency and throughput modes (diagnostic LH2 exceptions: placement and frequency only)
for (const wl of ["lat", "thr"]) {
  const h = "desktop", sib = ["--sibling", host[h].sib];
  out[`c-${wl}`] = cfg(h, {
    variants: [cell(h, `pinned-${wl}`, "probe", wl, WL, "--pin", host[h].pin, ...sib), cell(h, `unpinned-${wl}`, "probe", wl, WL, ...sib), cell(h, `pinned-${wl}-copy`, "probe", wl, WL, "--pin", host[h].pin, ...sib)],
    aa: [`pinned-${wl}`, `pinned-${wl}-copy`], baseline: `pinned-${wl}`, metrics: mk(PROBE),
  });
}
// (d) laptop, idle: pinned to CPU 2, sibling CPU 3 idle vs a same-workload antagonist pinned to CPU 3
// (e) laptop, CPU 3 offline (run by offline-run.sh): the same cells with an idle-equivalent offline sibling
for (const wl of ["lat", "thr"]) {
  const h = "laptop", ex = ["--pin", host[h].pin, "--sibling", host[h].sib];
  out[`d-${wl}`] = cfg(h, {
    variants: [cell(h, `idle-${wl}`, "probe", wl, WL, ...ex), cell(h, `busy-${wl}`, "probe", wl, WL, ...ex, "--antagonist", host[h].sib), cell(h, `idle-${wl}-copy`, "probe", wl, WL, ...ex)],
    aa: [`idle-${wl}`, `idle-${wl}-copy`], baseline: `idle-${wl}`, metrics: mk(PROBE),
  });
  out[`e-${wl}`] = { ...cfg(h, {
    variants: [cell(h, `offline-${wl}`, "probe", wl, WL, ...ex), cell(h, `offline-${wl}-copy`, "probe", wl, WL, ...ex)],
    aa: [`offline-${wl}`, `offline-${wl}-copy`], baseline: `offline-${wl}`, metrics: mk(PROBE),
  }), probe: { cpu: 3 } };
}

mkdirSync(join(here, "configs", "pilot"), { recursive: true });
for (const [k, c] of Object.entries(out)) {
  writeFileSync(join(here, "configs", `${k}.json`), JSON.stringify(c, null, 1) + "\n");
  writeFileSync(join(here, "configs", "pilot", `${k}.json`), JSON.stringify({ ...c, invocations: 6, warmup: 1 }, null, 1) + "\n");
}
