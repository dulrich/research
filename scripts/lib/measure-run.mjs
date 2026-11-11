// measure-run.mjs — config validation, line protocol, env probe and the interleaved run loop.
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { mulberry32, permutation, randInt } from "./measure-stats.mjs";

const TOP_KEYS = ["variants", "invocations", "warmup", "padMax", "aa", "baseline", "envPrefix", "seed", "channel", "probe"];
const VAR_KEYS = ["name", "argv", "group"];
const isInt = (x, min) => Number.isInteger(x) && x >= min;
const isStrs = (a) => Array.isArray(a) && a.length > 0 && a.every((s) => typeof s === "string");

/** Strictly validates a config object; returns a list of error messages (empty when valid). */
export function validateConfig(c, { host } = {}) {
  const e = [];
  if (!c || typeof c !== "object" || Array.isArray(c)) return ["config must be a JSON object"];
  for (const k of Object.keys(c)) if (!TOP_KEYS.includes(k)) e.push(`unknown config key "${k}"`);
  if (!isInt(c.invocations, 1)) e.push("invocations must be an integer >= 1");
  if (!isInt(c.warmup, 0)) e.push("warmup must be an integer >= 0");
  if (!isInt(c.padMax, 0)) e.push("padMax must be an integer >= 0");
  if (c.seed !== undefined && !isInt(c.seed, 0)) e.push("seed must be an integer >= 0");
  if (c.envPrefix !== undefined && !isStrs(c.envPrefix)) e.push("envPrefix must be a non-empty array of strings");
  if (c.channel !== undefined) {
    if (!c.channel || typeof c.channel !== "object" || Array.isArray(c.channel)) e.push("channel must be an object { argv, timeoutSec? }");
    else {
      for (const k of Object.keys(c.channel)) if (!["argv", "timeoutSec"].includes(k)) e.push(`channel: unknown key "${k}"`);
      if (!isStrs(c.channel.argv)) e.push("channel.argv must be a non-empty array of strings");
      if (c.channel.timeoutSec !== undefined && !isInt(c.channel.timeoutSec, 1)) e.push("channel.timeoutSec must be an integer >= 1");
    }
  }
  if (c.probe !== undefined) {
    if (!c.probe || typeof c.probe !== "object" || Array.isArray(c.probe)) e.push("probe must be an object { cpu?, container? }");
    else {
      for (const k of Object.keys(c.probe)) if (!["cpu", "container"].includes(k)) e.push(`probe: unknown key "${k}"`);
      if (c.probe.cpu !== undefined && !isInt(c.probe.cpu, 0)) e.push("probe.cpu must be an integer >= 0");
      if (c.probe.container !== undefined && (typeof c.probe.container !== "string" || !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(c.probe.container))) e.push("probe.container must be a docker container name ([A-Za-z0-9][A-Za-z0-9_.-]*)");
    }
  }
  if (!Array.isArray(c.variants) || !c.variants.length) return [...e, "variants must be a non-empty array"];
  const names = new Set();
  const groups = new Set();
  for (const [i, v] of c.variants.entries()) {
    if (!v || typeof v !== "object") { e.push(`variants[${i}] must be an object`); continue; }
    for (const k of Object.keys(v)) if (!VAR_KEYS.includes(k)) e.push(`variants[${i}]: unknown key "${k}"`);
    if (typeof v.name !== "string" || !v.name) e.push(`variants[${i}]: name must be a non-empty string`);
    else if (names.has(v.name)) e.push(`duplicate variant name "${v.name}"`);
    names.add(v.name);
    if (!isStrs(v.argv)) e.push(`variants[${i}]: argv must be a non-empty array of strings`);
    if (v.group !== undefined && (typeof v.group !== "string" || !v.group)) e.push(`variants[${i}]: group must be a non-empty string`);
    groups.add(v.group ?? v.name);
  }
  if (Number.isInteger(c.probe?.cpu) && c.variants.every((v) => v && isStrs(v.argv))) {
    const argvCpu = cpusetCpu(c.variants);
    if (argvCpu !== null && argvCpu !== c.probe.cpu) e.push(`probe.cpu ${c.probe.cpu} disagrees with --cpuset-cpus ${argvCpu} in variant argv`);
  }
  const usesHost = [...c.variants.flatMap((v) => (Array.isArray(v.argv) ? v.argv : [])), ...(c.envPrefix ?? []), ...(isStrs(c.channel?.argv) ? c.channel.argv : [])].some((s) => typeof s === "string" && s.includes("{host}"));
  if (usesHost && !host) e.push("config uses {host} but --host was not given");
  if (c.aa !== undefined) {
    if (!Array.isArray(c.aa) || c.aa.length !== 2 || c.aa[0] === c.aa[1]) e.push("aa must be two distinct names");
    else for (const n of c.aa) if (!groups.has(n)) e.push(`aa names unknown group "${n}"`);
  }
  if (c.baseline !== undefined && !groups.has(c.baseline)) e.push(`baseline names unknown group "${c.baseline}"`);
  return e;
}

const LINE = /^MEASURE (\S+) (\S+)(?: (\S+))?$/;

/** Parses MEASURE lines from stdout. Returns { metrics, other, errors }. */
export function parseProtocol(stdout) {
  const metrics = {};
  const other = [];
  const errors = [];
  for (const line of stdout.split("\n")) {
    if (!line.startsWith("MEASURE")) { if (line) other.push(line); continue; }
    const m = LINE.exec(line);
    const value = m ? Number(m[2]) : NaN;
    if (!m || m[2].trim() === "" || !Number.isFinite(value)) { errors.push(`protocol error: ${JSON.stringify(line)}`); continue; }
    if (m[1] in metrics) { errors.push(`protocol error: duplicate metric ${m[1]}`); continue; }
    metrics[m[1]] = { value, unit: m[3] ?? "" };
  }
  return { metrics, other, errors };
}

export const substitute = (argv, { pad, host }) => argv.map((s) => s.replaceAll("{pad}", pad).replaceAll("{host}", host ?? "{host}"));
export const shQuote = (s) => `'${s.replaceAll("'", "'\\''")}'`;

/** POSIX sh + coreutils + procfs/sysfs env probe; prints key=value lines. */
export function probeScript(cpu, container) {
  const pin = cpu == null ? "" : `r pinned_cpu_siblings ${S}/cpu${cpu}/topology/thread_siblings_list\nr pinned_cpu_online ${S}/cpu${cpu}/online\n`;
  const ctr = container == null ? "" : `d() { v=; command -v docker >/dev/null 2>&1 && v=$(docker inspect --format "$2" ${shQuote(container)} 2>/dev/null); printf '%s=%s\\n' "$1" "\${v:-unavailable}"; }
d container_image '{{.Image}}'; d container_cpuset '{{.HostConfig.CpusetCpus}}'
`;
  return `r() { v=; [ -r "$2" ] && v=$(cat "$2" 2>/dev/null); printf '%s=%s\\n' "$1" "\${v:-unavailable}"; }
c() { v=$(sed -n "s/^$2[[:space:]]*: //p" /proc/cpuinfo 2>/dev/null | head -n 1); printf '%s=%s\\n' "$1" "\${v:-unavailable}"; }
printf 'hostname=%s\\n' "$(uname -n)"
printf 'kernel=%s\\n' "$(uname -r)"
c cpu_model 'model name'; c cpu_vendor vendor_id; c microcode microcode
r smt_control ${S}/smt/control; r smt_active ${S}/smt/active
r governor ${S}/cpu0/cpufreq/scaling_governor; r pstate_driver ${S}/cpu0/cpufreq/scaling_driver
r epp ${S}/cpu0/cpufreq/energy_performance_preference
r boost ${S}/cpufreq/boost; r intel_no_turbo ${S}/intel_pstate/no_turbo
r perf_event_paranoid /proc/sys/kernel/perf_event_paranoid; r randomize_va_space /proc/sys/kernel/randomize_va_space
r loadavg /proc/loadavg
${pin}v=; command -v docker >/dev/null 2>&1 && v=$(docker version --format '{{.Server.Version}}' 2>/dev/null)
printf 'docker_server=%s\\n' "\${v:-unavailable}"
${ctr}`;
}
const S = "/sys/devices/system/cpu";

/** The first `--cpuset-cpus N` / `--cpuset-cpus=N` CPU number found in any variant argv, or null. */
export function cpusetCpu(variants) {
  for (const { argv } of variants)
    for (let i = 0; i < argv.length; i++) {
      const v = argv[i] === "--cpuset-cpus" ? argv[i + 1] : argv[i].startsWith("--cpuset-cpus=") ? argv[i].slice(14) : null;
      const m = v && /^\d+/.exec(v);
      if (m) return Number(m[0]);
    }
  return null;
}

const probeCpu = (config) => config.probe?.cpu ?? cpusetCpu(config.variants);
const parseProbe = (stdout, status, stderr, config) => {
  const out = {};
  for (const l of (stdout ?? "").split("\n")) { const i = l.indexOf("="); if (i > 0) out[l.slice(0, i)] = l.slice(i + 1); }
  if (status !== 0 || !out.hostname) out.probe_error = `exit ${status}: ${(stderr ?? "").trim()}`;
  const name = config.probe?.container;
  if (name !== undefined && !(out.container_image && out.container_image !== "unavailable" && out.container_cpuset && out.container_cpuset !== "unavailable"))
    out.container_probe_error = `docker inspect ${name} failed: container_image=${out.container_image ?? "missing"} container_cpuset=${out.container_cpuset ?? "missing"}`;
  return out;
};

/** Env probe through a persistent channel (config.channel); never throws, failures land in probe_error. */
export async function runProbeChannel(config, channel) {
  try {
    const r = await channel.run(probeScript(probeCpu(config), config.probe?.container));
    return parseProbe(r.stdout, r.status, r.stderr, config);
  } catch (e) {
    return parseProbe("", null, e.message, config);
  }
}

export function runProbe(config, host) {
  if (config.probe !== undefined) {
    const script = probeScript(probeCpu(config), config.probe.container);
    const argv = config.envPrefix ? [...substitute(config.envPrefix, { pad: "", host }), `sh -c ${shQuote(script)}`] : ["sh", "-c", script];
    const r = spawnSync(argv[0], argv.slice(1), { encoding: "utf8" });
    return parseProbe(r.stdout, r.status, r.stderr ?? r.error?.message, config);
  }
  const script = probeScript(cpusetCpu(config.variants));
  const argv = config.envPrefix ? [...substitute(config.envPrefix, { pad: "", host }), `sh -c ${shQuote(script)}`] : ["sh", "-c", script];
  const r = spawnSync(argv[0], argv.slice(1), { encoding: "utf8" });
  const out = {};
  for (const l of (r.stdout ?? "").split("\n")) { const i = l.indexOf("="); if (i > 0) out[l.slice(0, i)] = l.slice(i + 1); }
  if (r.status !== 0 || !out.hostname) out.probe_error = `exit ${r.status}: ${(r.stderr ?? r.error?.message ?? "").trim()}`;
  return out;
}

/** Seeded schedule: per round a permutation of variant indices and a pad length per slot. */
export function schedule(nVariants, rounds, padMax, seed) {
  const rng = mulberry32(seed);
  return Array.from({ length: rounds }, () => permutation(rng, nVariants).map((v) => ({ v, padLen: randInt(rng, padMax + 1) })));
}

/** Runs every round; returns { failures }. Writes raw.jsonl and log.txt in `out` as it goes. */
export async function runRounds(config, { out, seed, host, log = () => {}, channel = null }) {
  mkdirSync(out, { recursive: true });
  const rawPath = join(out, "raw.jsonl");
  const logPath = join(out, "log.txt");
  writeFileSync(rawPath, "");
  writeFileSync(logPath, "");
  const seen = config.variants.map(() => new Set());
  const rounds = config.warmup + config.invocations;
  const failures = [];
  for (const [round, slots] of schedule(config.variants.length, rounds, config.padMax, seed).entries()) {
    for (const [order, { v, padLen }] of slots.entries()) {
      const variant = config.variants[v];
      const pad = "x".repeat(padLen);
      const argv = substitute(variant.argv, { pad, host });
      const t0 = performance.now();
      let r;
      if (channel) {
        try { r = await channel.run(channel.invocationScript(argv, pad)); } catch (e) { r = { stdout: "", stderr: "", status: null, channelError: e.message }; }
      } else r = spawnSync(argv[0], argv.slice(1), { encoding: "utf8", env: { ...process.env, MEASURE_PAD: pad }, maxBuffer: 1 << 28 });
      const wallMs = performance.now() - t0;
      const p = parseProtocol(r.stdout ?? "");
      const errors = [...p.errors];
      if (r.error) errors.push(`spawn error: ${r.error.message}`);
      if (r.channelError) errors.push(r.channelError);
      if (r.status !== 0 && !r.channelError) errors.push(`exit code ${r.status}${r.signal ? ` (signal ${r.signal})` : ""}`);
      for (const m of seen[v]) if (!(m in p.metrics)) errors.push(`missing metric ${m} reported earlier`);
      for (const m of Object.keys(p.metrics)) seen[v].add(m);
      const rec = { round, order, variant: variant.name, group: variant.group ?? variant.name, warmup: round < config.warmup, padLen, exit: r.status, wallMs, metrics: p.metrics };
      if (errors.length) rec.errors = errors;
      appendFileSync(rawPath, `${JSON.stringify(rec)}\n`);
      appendFileSync(logPath, `## round ${round} order ${order} ${variant.name}\n${p.other.join("\n")}${p.other.length ? "\n" : ""}${r.stderr ?? ""}`);
      if (errors.length) {
        failures.push(rec);
        log(`measure: FAILED ${variant.name} round ${round}: ${errors.join("; ")}`);
        return { failures };
      }
    }
  }
  return { failures };
}
