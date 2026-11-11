import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport } from "./lib/measure-report.mjs";
import { cpusetCpu, parseProtocol, probeScript, schedule, shQuote, substitute, validateConfig } from "./lib/measure-run.mjs";
import { ci95, hierBootstrap, median, mulberry32, percentile, permutation, verdict } from "./lib/measure-stats.mjs";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "measure.mjs");
let dir;
beforeEach(() => { dir = fs.mkdtempSync(path.join(process.env.TMPDIR || "/tmp", "measure-")); });
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
const cli = (...args) => {
  const r = Bun.spawnSync(["bun", script, ...args]);
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};

describe("stats", () => {
  test("median and percentile (type 7) match hand computation", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    // sorted [10,20,30,40,50]: h = 4*0.25 = 1 -> 20; h = 4*0.1 = 0.4 -> 10 + 0.4*10 = 14
    expect(percentile([50, 10, 40, 20, 30], 0.25)).toBe(20);
    expect(percentile([50, 10, 40, 20, 30], 0.1)).toBeCloseTo(14, 12);
    expect(percentile([7], 0.975)).toBe(7);
  });
  test("mulberry32 matches its reference first outputs and is reproducible", () => {
    // independent BigInt re-derivation of the mulberry32 step (no Math.imul, explicit mod 2^32)
    const M = 2n ** 32n;
    const mul = (x, y) => (x * y) % M;
    let s = 1n;
    const ref = () => {
      s = (s + 0x6d2b79f5n) % M;
      let t = mul(s ^ (s >> 15n), 1n | s);
      t = ((t + mul(t ^ (t >> 7n), 61n | t)) % M) ^ t;
      return Number(t ^ (t >> 14n));
    };
    const r = mulberry32(1);
    const first = [0, 1, 2].map(() => Math.round(r() * 2 ** 32));
    expect(first).toEqual([ref(), ref(), ref()]);
    expect(first[0]).toBe(2693262067); // pinned: seed 1 first output
    const a = mulberry32(42), b = mulberry32(42);
    for (let i = 0; i < 100; i++) { const x = a(); expect(x).toBe(b()); expect(x >= 0 && x < 1).toBe(true); }
  });
  test("permutation per round is a permutation and reproduces from the seed", () => {
    const s1 = schedule(5, 20, 64, 7);
    expect(schedule(5, 20, 64, 7)).toEqual(s1);
    expect(schedule(5, 20, 64, 8)).not.toEqual(s1);
    for (const round of s1) {
      expect(round.map((x) => x.v).sort()).toEqual([0, 1, 2, 3, 4]);
      for (const { padLen } of round) expect(padLen >= 0 && padLen <= 64).toBe(true);
    }
    expect(permutation(mulberry32(3), 1)).toEqual([0]);
  });
  test("E1: between-layout variation widens the group CI relative to pooled invocations", () => {
    const builds = [10, 11, 12, 13].map((mu) => Array.from({ length: 20 }, (_, i) => mu + (i % 5) * 0.01));
    const width = ([lo, hi]) => hi - lo;
    const hier = width(ci95(hierBootstrap(builds, 2000, mulberry32(1))));
    const pooled = width(ci95(hierBootstrap([builds.flat()], 2000, mulberry32(1))));
    expect(hier).toBeGreaterThan(1.5 * pooled);
    // one build per group reduces to the plain bootstrap: identical draws for the same seed
    expect(hierBootstrap([builds[0]], 50, mulberry32(9))).toEqual(hierBootstrap([builds[0]], 50, mulberry32(9)));
  });
  test("claim-rule verdicts", () => {
    expect(verdict(0.8, [0.75, 0.85], 0.02)).toBe("faster");
    expect(verdict(1.2, [1.15, 1.25], 0.02)).toBe("slower");
    expect(verdict(0.97, [0.96, 0.98], 0.05)).toBe("no measurable difference"); // inside the A/A floor
    expect(verdict(0.9, [0.8, 1.01], 0.01)).toBe("no measurable difference"); // CI spans 1
    expect(verdict(0.5, [0.4, 0.6], null)).toBe("no A/A floor");
  });
});

describe("protocol and config", () => {
  test.each([
    ["MEASURE ns 1.5 ns", { ns: { value: 1.5, unit: "ns" } }, 0],
    ["MEASURE count 3", { count: { value: 3, unit: "" } }, 0],
    ["MEASURE ns 1e-3 s", { ns: { value: 0.001, unit: "s" } }, 0],
    ["MEASURE ns abc ns", {}, 1],
    ["MEASURE ns NaN", {}, 1],
    ["MEASURE ns Infinity", {}, 1],
    ["MEASURE ns 1 ns extra", {}, 1],
    ["MEASURE ns", {}, 1],
    ["MEASURE ns 1\nMEASURE ns 2", { ns: { value: 1, unit: "" } }, 1],
    ["hello MEASURE ns 1\nmeasure ns 2", {}, 0],
  ])("%j", (text, metrics, nErr) => {
    const p = parseProtocol(text);
    expect(p.metrics).toEqual(metrics);
    expect(p.errors.length).toBe(nErr);
  });
  const ok = { variants: [{ name: "a", argv: ["true"] }, { name: "b", argv: ["true"], group: "g" }], invocations: 2, warmup: 0, padMax: 0 };
  test("valid config passes", () => expect(validateConfig({ ...ok, aa: ["a", "g"], baseline: "g" })).toEqual([]));
  test.each([
    [{ ...ok, rounds: 3 }, /unknown config key "rounds"/],
    [{ ...ok, variants: [{ name: "a", argv: ["x"] }, { name: "a", argv: ["y"] }] }, /duplicate variant name/],
    [{ ...ok, variants: [{ name: "a" }] }, /argv must be/],
    [{ ...ok, variants: [{ name: "a", argv: ["x"], extra: 1 }] }, /unknown key "extra"/],
    [{ ...ok, variants: [{ name: "a", argv: ["ssh", "{host}"] }] }, /--host was not given/],
    [{ ...ok, envPrefix: ["ssh", "{host}"] }, /--host was not given/],
    [{ ...ok, aa: ["a", "zz"] }, /aa names unknown group "zz"/],
    [{ ...ok, baseline: "b" }, /baseline names unknown group "b"/],
    [{ ...ok, invocations: "3" }, /invocations must be/],
    [[], /JSON object/],
  ])("rejects %#", (c, re) => expect(validateConfig(c).join("\n")).toMatch(re));
  test("{host} accepted with --host", () => expect(validateConfig({ ...ok, envPrefix: ["ssh", "{host}"] }, { host: "h" })).toEqual([]));
  test("{pad}/{host} substitution", () => {
    expect(substitute(["ssh", "{host}", "-e", "MEASURE_PAD={pad}", "{pad}{pad}"], { pad: "xx", host: "box" })).toEqual(["ssh", "box", "-e", "MEASURE_PAD=xx", "xxxx"]);
    expect(cpusetCpu([{ argv: ["docker", "run", "--cpuset-cpus", "3"] }])).toBe(3);
    expect(cpusetCpu([{ argv: ["--cpuset-cpus=5,6"] }])).toBe(5);
    expect(cpusetCpu([{ argv: ["x"] }])).toBe(null);
  });
  test("probe script survives an ssh-style join (sh -c '<quoted>') and records unavailable fields", () => {
    const r = spawnSync("sh", ["-c", `sh -c ${shQuote(probeScript(999))}`], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/^hostname=.+$/m);
    expect(r.stdout).toMatch(/^loadavg=/m);
    expect(r.stdout).toMatch(/^pinned_cpu_siblings=unavailable$/m);
  });
});

describe("report and CLI", () => {
  const rec = (variant, group, value) => ({ variant, group, warmup: false, metrics: { t: { value, unit: "ns" } } });
  const env = (aa) => ({ seed: 1, config: { variants: [{ name: "fast" }, { name: "base" }, { name: "dup" }], baseline: "base", aa } });
  const recs = [];
  for (let i = 0; i < 30; i++) recs.push(rec("fast", "fast", 5 + (i % 3) * 0.01), rec("base", "base", 10 + (i % 4) * 0.01), rec("dup", "dup", 10 + (i % 5) * 0.01));
  test("report applies the claim rule and is deterministic", () => {
    const md = buildReport(recs, env(["base", "dup"]), { resamples: 500 });
    expect(md).toMatch(/\| fast \| 1 \| 30 \| 5\.01 \|.*\| faster \|/);
    expect(md).toMatch(/\| dup \|.*\| no measurable difference \|/);
    expect(md).toMatch(/A\/A \(base \/ dup\)/);
    expect(buildReport(recs, env(["base", "dup"]), { resamples: 500 })).toBe(md);
    expect(buildReport(recs, env(undefined), { resamples: 500 })).toMatch(/\| fast \|.*\| no A\/A floor \|/);
  });
  test("--help exits 0 on stdout; bad subcommand exits 2", () => {
    const h = cli("--help", "run");
    expect(h.code).toBe(0);
    expect(h.out).toMatch(/^usage: measure\.mjs run/);
    const b = cli("bogus");
    expect(b.code).toBe(2);
    expect(b.err).toMatch(/usage:/);
  });
  const fakeProbe = ["sh", "-c", "printf 'hostname=t\\nloadavg=0\\ncpu_model=test\\n'", "sh"];
  const writeCfg = (variants, extra = {}) => {
    const p = path.join(dir, "c.json");
    fs.writeFileSync(p, JSON.stringify({ variants, invocations: 6, warmup: 1, padMax: 8, envPrefix: fakeProbe, ...extra }));
    return p;
  };
  test("end-to-end run + report twice with the same seed gives byte-identical report.md", () => {
    const cfg = writeCfg([
      { name: "a", argv: ["sh", "-c", "echo noise; echo MEASURE t $((10 + ${#MEASURE_PAD})) ns"] },
      { name: "b1", group: "b", argv: ["sh", "-c", "echo MEASURE t $((20 + ${#1})) ns", "sh", "{pad}"] },
      { name: "b2", group: "b", argv: ["sh", "-c", "echo MEASURE t $((21 + ${#MEASURE_PAD})) ns"] },
    ], { baseline: "b", aa: ["a", "b"] });
    const mds = [1, 2].map((k) => {
      const out = path.join(dir, `o${k}`);
      expect(cli("run", "--config", cfg, "--out", out, "--seed", "5").code).toBe(0);
      const r = cli("report", out, "--resamples", "300");
      expect(r.code).toBe(0);
      const raw = fs.readFileSync(path.join(out, "raw.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
      expect(raw.length).toBe(3 * 7);
      expect(raw.filter((x) => x.warmup).length).toBe(3);
      for (const x of raw) expect(x.metrics.t.value).toBe((x.variant === "a" ? 10 : x.variant === "b1" ? 20 : 21) + x.padLen);
      expect(fs.readFileSync(path.join(out, "log.txt"), "utf8")).toMatch(/noise/);
      const e = JSON.parse(fs.readFileSync(path.join(out, "env.json"), "utf8"));
      expect([e.seed, e.probeHost, e.after.loadavg]).toEqual([5, "t", "0"]);
      return fs.readFileSync(path.join(out, "report.md"), "utf8");
    });
    expect(mds[1]).toBe(mds[0]);
    expect(mds[0]).not.toMatch(/\| t \|/); // probe host never in report
  });
  test.each([
    ["exit 1", "echo MEASURE t 1; exit 1", /exit code 1/],
    ["missing metric", 'if [ -e "$0.seen" ]; then echo none; else : > "$0.seen"; echo MEASURE t 1; fi', /missing metric t/],
    ["protocol error", "echo MEASURE t fast", /protocol error/],
  ])("failing variant (%s) fails loudly and keeps the raw record", (_, body, re) => {
    const marker = path.join(dir, "m");
    const out = path.join(dir, "o");
    const r = cli("run", "--config", writeCfg([{ name: "bad", argv: ["sh", "-c", body, marker] }]), "--out", out, "--seed", "1");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(re);
    const raw = fs.readFileSync(path.join(out, "raw.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    expect(raw.at(-1).errors.join(" ")).toMatch(re);
    expect(fs.existsSync(path.join(out, "env.json"))).toBe(true);
  });
  test("{host} without --host fails validation", () => {
    const r = cli("run", "--config", writeCfg([{ name: "a", argv: ["echo", "{host}"] }]), "--out", path.join(dir, "o"));
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--host was not given/);
  });
});
