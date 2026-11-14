// run.mjs - one invocation of the retain program in a throwaway container (the driver's argv entry point).
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "../scripts/lib/build-id.mjs";

const USAGE = `usage: run.mjs [--interval S] [--settle S[,S...]] [--bad-mib N] [--tunables STR] -- <retain args>
       run.mjs --help | --build | --version

Runs the gar:1 image (build it with: docker build -t gar:1 glibc-arena-retention) once with --rm, pinned by
--cpuset-cpus $CAL_PIN (default 6-11,18-23), forwards MEASURE_PAD into the container, and runs the retain
program under scripts/memprobe.sh (boundary line BOUNDARY). Everything after -- goes to retain (see
"retain --help" in the image). All MEASURE lines go to stdout.

  --interval S    probe sampling period in seconds, a positive decimal (default 0.2)
  --settle LIST   settle windows, whole seconds after the boundary, comma-separated (default 0)
  --bad-mib N     bad-mode threshold in MiB: adds bad_mode_<S>s = 1 when anon_settled_<S>s_mib exceeds N, else 0
  --tunables STR  passed into the container as GLIBC_TUNABLES (for example glibc.malloc.mxfast=0)
retain is given --idle (largest settle window + 2) unless the arguments already carry one.
Exit status 2: usage error.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "run" });
if (rc !== null) process.exit(rc);

function die(msg) { process.stderr.write(`run.mjs: ${msg}\n${USAGE}`); process.exit(2); }

let interval = "0.2", settle = "0", badMib = null, tunables = null;
const sep = argv.indexOf("--");
if (sep < 0) die("missing -- before the retain arguments");
const opts = argv.slice(0, sep), rargs = argv.slice(sep + 1);
for (let i = 0; i < opts.length; i++) {
  const k = opts[i], val = opts[i + 1];
  if (val === undefined) die(`missing value for ${k}`);
  if (k === "--interval") interval = val;
  else if (k === "--settle") settle = val;
  else if (k === "--bad-mib") badMib = val;
  else if (k === "--tunables") tunables = val;
  else die(`unknown option ${k}`);
  i++;
}
if (!/^[0-9]+(\.[0-9]+)?$/.test(interval) || !(Number(interval) > 0)) die(`--interval '${interval}' is not a positive decimal`);
if (!/^[0-9]+(,[0-9]+)*$/.test(settle)) die(`--settle '${settle}' is not a comma list of whole seconds`);
if (badMib !== null && !(/^[0-9]+(\.[0-9]+)?$/.test(badMib) && Number(badMib) > 0)) die(`--bad-mib '${badMib}' is not a positive number`);
if (tunables !== null && !/^[A-Za-z0-9_.:=-]+$/.test(tunables)) die(`--tunables '${tunables}' has unexpected characters`);
const pin = process.env.CAL_PIN || "6-11,18-23";
if (!/^[0-9,-]+$/.test(pin)) die(`CAL_PIN '${pin}' is not a cpuset list`);
const maxSettle = Math.max(...settle.split(",").map(Number));
if (!rargs.includes("--idle")) rargs.push("--idle", String(maxSettle + 2));

const here = dirname(fileURLToPath(import.meta.url));
const probe = join(here, "..", "scripts", "memprobe.sh");
const dargs = ["run", "--rm", "--cpuset-cpus", pin, "-e", `MEASURE_PAD=${process.env.MEASURE_PAD ?? ""}`];
if (tunables) dargs.push("-e", `GLIBC_TUNABLES=${tunables}`);
dargs.push("-v", `${probe}:/probe/memprobe.sh:ro`, "gar:1",
  "/probe/memprobe.sh", "--interval", interval, "--boundary-line", "BOUNDARY", "--settle", settle, "--", "retain", ...rargs);
const r = spawnSync("docker", dargs, { encoding: "utf8", maxBuffer: 1 << 26 });
if (r.error) { process.stderr.write(`run.mjs: cannot run docker: ${r.error.message}\n`); process.exit(1); }
process.stdout.write(r.stdout);
process.stderr.write(r.stderr);
if (badMib !== null) {
  for (const line of r.stdout.split("\n")) {
    const m = /^MEASURE anon_settled_(\d+)s_mib (\S+)/.exec(line);
    if (m) process.stdout.write(`MEASURE bad_mode_${m[1]}s ${Number(m[2]) > Number(badMib) ? 1 : 0}\n`);
  }
}
process.exit(r.status ?? 1);
