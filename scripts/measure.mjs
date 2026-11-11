#!/usr/bin/env bun
// measure.mjs — host-side timing driver: interleaved, seeded, padded invocations; hierarchical bootstrap report.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildId, handleBuildFlags } from "./lib/build-id.mjs";
import { buildReport } from "./lib/measure-report.mjs";
import { runProbe, runRounds, validateConfig } from "./lib/measure-run.mjs";

const USAGE = `usage: measure.mjs run --config <file.json> --out <dir> [--seed N] [--host NAME]
       measure.mjs report <dir> [--resamples N]
       measure.mjs --help | --build | --version

run     Runs warmup+invocations rounds; each round runs every variant once in a seeded random order,
        with env MEASURE_PAD (and argv token {pad}) set to 0..padMax bytes of padding and {host}
        replaced by --host. Variants print "MEASURE <metric> <number> [unit]" lines on stdout.
        Writes <out>/raw.jsonl, <out>/env.json and <out>/log.txt. A non-zero exit, a protocol error
        or a missing metric fails the run (exit 1) after writing what was recorded.
report  Prints per-metric Markdown tables (hierarchical bootstrap over layout builds, then
        invocations; ratio vs baseline; A/A noise floor; claim-rule verdicts) and writes <dir>/report.md.

Config: { variants: [{ name, argv, group? }], invocations, warmup, padMax, aa?: [groupA, groupB],
          baseline?: group, envPrefix?: [argv...], seed? }
`;

const argv = process.argv.slice(2);
if (argv.includes("--help")) { process.stdout.write(USAGE); process.exit(0); }
const rc = handleBuildFlags(argv, { path: import.meta.filename, name: "measure" });
if (rc !== null) process.exit(rc);

function die(msg, code = 2) { process.stderr.write(`measure: ${msg}\n${code === 2 ? USAGE : ""}`); process.exit(code); }

function flags(args, known) {
  const o = { _: [] };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (!a.startsWith("--")) { o._.push(a); continue; }
    const k = a.slice(2);
    if (!known.includes(k) || i + 1 >= args.length) die(`bad argument ${a}`);
    o[k] = args[++i];
  }
  return o;
}
const intFlag = (s, name) => (/^\d+$/.test(s) ? Number(s) : die(`--${name} must be a non-negative integer`));

const [cmd, ...rest] = argv;
if (cmd === "run") {
  const o = flags(rest, ["config", "out", "seed", "host"]);
  if (o._.length || !o.config || !o.out) die("run needs --config and --out");
  let text, config;
  try { text = readFileSync(o.config, "utf8"); config = JSON.parse(text); } catch (e) { die(`cannot read config: ${e.message}`, 1); }
  const errs = validateConfig(config, { host: o.host });
  if (errs.length) die(`invalid config ${o.config}:\n  ${errs.join("\n  ")}`, 1);
  const seed = o.seed !== undefined ? intFlag(o.seed, "seed") : config.seed ?? (Date.now() % 2 ** 32) >>> 0;
  const command = ["measure.mjs", ...argv.map((a, i, all) => (all[i - 1] === "--host" ? "{host}" : a))];
  const env = { start: new Date().toISOString(), seed, build: buildId(import.meta.filename), configHash: createHash("sha256").update(text).digest("hex"), command, config };
  env.before = runProbe(config, o.host);
  env.probeHost = env.before.hostname ?? "unavailable";
  const write = () => writeFileSync(join(o.out, "env.json"), `${JSON.stringify(env, null, 2)}\n`);
  const { failures } = runRounds(config, { out: o.out, seed, host: o.host, log: (m) => process.stderr.write(`${m}\n`) });
  env.after = runProbe(config, o.host);
  env.end = new Date().toISOString();
  if (failures.length) env.failed = true;
  write();
  if (failures.length) die(`run failed; records kept in ${join(o.out, "raw.jsonl")}`, 1);
  process.stderr.write(`measure: wrote ${o.out}/raw.jsonl, env.json, log.txt (seed ${seed})\n`);
} else if (cmd === "report") {
  const o = flags(rest, ["resamples"]);
  if (o._.length !== 1) die("report needs exactly one <dir>");
  const dir = o._[0];
  if (!existsSync(join(dir, "raw.jsonl")) || !existsSync(join(dir, "env.json"))) die(`${dir} lacks raw.jsonl or env.json`, 1);
  const records = readFileSync(join(dir, "raw.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const env = JSON.parse(readFileSync(join(dir, "env.json"), "utf8"));
  const md = buildReport(records, env, { resamples: o.resamples ? intFlag(o.resamples, "resamples") || die("--resamples must be >= 1") : 10000 });
  writeFileSync(join(dir, "report.md"), md);
  process.stdout.write(md);
} else die(cmd ? `unknown subcommand ${cmd}` : "missing subcommand");
