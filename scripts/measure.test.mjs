import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildReport } from "./lib/measure-report.mjs";
import { Channel, invocationScript } from "./lib/measure-channel.mjs";
import { cpusetCpu, parseProtocol, probeScript, runProbe, runProbeChannel, schedule, shQuote, substitute, validateConfig } from "./lib/measure-run.mjs";
import { ci95, clopperPearson, hierBootstrap, levelVerdict, median, mulberry32, newcombeDiff, percentile, permutation, rateVerdict, verdict, wilson } from "./lib/measure-stats.mjs";

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
  test("a rate metric value other than 0/1 fails the run", () => {
    const out = path.join(dir, "o");
    const r = cli("run", "--config", writeCfg([{ name: "r", argv: ["sh", "-c", "echo MEASURE bad 2"] }], { metrics: { bad: { kind: "rate", better: "lower" } } }), "--out", out, "--seed", "1");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/rate metric bad must be 0 or 1, got 2/);
  });
  test("{host} without --host fails validation", () => {
    const r = cli("run", "--config", writeCfg([{ name: "a", argv: ["echo", "{host}"] }]), "--out", path.join(dir, "o"));
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/--host was not given/);
  });
});

describe("persistent channel", () => {
  const local = ["sh", "-s"];
  const open = (opts) => new Channel(local, opts).open();
  test("frames multi-line, no-trailing-newline and delimiter-like output with exit status", async () => {
    const ch = await open();
    try {
      const fake = `${ch.nonce} 1 0 0 0`;
      const r1 = await ch.run(`printf 'a\\nb\\n\\nc'; printf '%s\\n${fake}\\n' err >&2; exit 3`);
      expect(r1).toEqual({ stdout: "a\nb\n\nc", stderr: `err\n${fake}\n`, status: 3 });
      const r2 = await ch.run(`printf '${fake}\\nMEASURE t 7\\n'`);
      expect(r2).toEqual({ stdout: `${fake}\nMEASURE t 7\n`, stderr: "", status: 0 });
      const r3 = await ch.run("head -c 300000 /dev/zero");
      expect([r3.stdout.length, r3.status]).toEqual([300000, 0]);
    } finally { await ch.close(); }
  });
  test("each invocation is a fresh process with its own MEASURE_PAD; quoting survives", async () => {
    const ch = await open();
    try {
      const a = await ch.run(invocationScript(["sh", "-c", 'echo "$$ ${#MEASURE_PAD} $1"', "sh", "it's \"q\" $x\nnl"], "xxx"));
      const b = await ch.run(invocationScript(["sh", "-c", 'echo "$$ ${#MEASURE_PAD}"'], ""));
      const [pa, la, ...rest] = a.stdout.trim().split(" ");
      expect([la, rest.join(" ")]).toEqual(["3", "it's \"q\" $x\nnl"]);
      expect(b.stdout.trim().split(" ")[1]).toBe("0");
      expect(b.stdout.split(" ")[0]).not.toBe(pa);
    } finally { await ch.close(); }
  });
  const fakeLoop = 'while IFS= read -r l; do case $l in *measure-channel*) n=${l##* }; break;; esac; done; echo "$n ready"; read -r r; echo "$n 9 0 0 0"';
  test("channel death mid-run and malformed frames fail loudly, and stay failed", async () => {
    const ch = await open();
    await expect(ch.run("kill -9 $PPID")).rejects.toThrow(/channel lost/);
    await expect(ch.run("true")).rejects.toThrow(/channel lost/);
    const bad = new Channel(["sh", "-c", fakeLoop]);
    await bad.open();
    await expect(bad.run("true")).rejects.toThrow(/framing error/);
    await bad.close();
    const noReady = new Channel(["sh", "-c", "echo hello"]);
    await expect(noReady.open()).rejects.toThrow(/handshake/);
  });
  test("timeout fails loudly", async () => {
    const ch = await open({ timeoutMs: 200 });
    await expect(ch.run("sleep 3")).rejects.toThrow(/timeout/);
    await ch.close();
  });
  test("probe via channel honours probe.cpu and records a failed container inspect", async () => {
    const ch = await open();
    try {
      const p = await runProbeChannel({ variants: [{ name: "a", argv: ["true"] }], probe: { cpu: 0, container: "no-such-ctr-r5" } }, ch);
      expect(p.hostname).toBeTruthy();
      expect(p.probe_error).toBeUndefined();
      expect(p).toHaveProperty("pinned_cpu_siblings");
      expect(p.container_image).toBe("unavailable");
      expect(p.container_probe_error).toMatch(/docker inspect no-such-ctr-r5 failed/);
    } finally { await ch.close(); }
    expect(probeScript(null, undefined)).toBe(probeScript(null));
    expect(runProbe({ variants: [{ name: "a", argv: ["x"] }], probe: { cpu: 999 } }).pinned_cpu_siblings).toBe("unavailable");
  });
  const ok = { variants: [{ name: "a", argv: ["docker", "exec", "c", "x"] }], invocations: 1, warmup: 0, padMax: 0 };
  test.each([
    [{ ...ok, channel: { argv: [] } }, /channel.argv must be a non-empty array/],
    [{ ...ok, channel: { argv: "ssh h" } }, /channel.argv must be/],
    [{ ...ok, channel: ["sh"] }, /channel must be an object/],
    [{ ...ok, channel: { argv: ["sh"], x: 1 } }, /channel: unknown key "x"/],
    [{ ...ok, channel: { argv: ["ssh", "{host}", "sh", "-s"] } }, /--host was not given/],
    [{ ...ok, probe: { cpu: -1 } }, /probe.cpu must be/],
    [{ ...ok, probe: { container: "a b" } }, /probe.container must be/],
    [{ ...ok, variants: [{ name: "a", argv: ["--cpuset-cpus", "2"] }], probe: { cpu: 1 } }, /disagrees/],
  ])("channel/probe config rejected %#", (c, re) => expect(validateConfig(c).join("\n")).toMatch(re));
  test("channel/probe config accepted", () => {
    expect(validateConfig({ ...ok, channel: { argv: ["ssh", "{host}", "sh", "-s"], timeoutSec: 60 }, probe: { cpu: 2, container: "r5probe" } }, { host: "h" })).toEqual([]);
    expect(validateConfig({ ...ok, variants: [{ name: "a", argv: ["--cpuset-cpus", "2"] }], probe: { cpu: 2 } })).toEqual([]);
  });
  const cfg = (variants, extra = {}) => {
    const p = path.join(dir, "c.json");
    fs.writeFileSync(p, JSON.stringify({ variants, invocations: 4, warmup: 1, padMax: 8, channel: { argv: ["sh", "-s"] }, probe: { cpu: 0 }, ...extra }));
    return p;
  };
  test("end-to-end run through a channel attributes metrics per invocation", () => {
    const c = cfg([
      { name: "a", argv: ["sh", "-c", "printf 'noise\\nMEASURE t %s ns' $((10 + ${#MEASURE_PAD}))"] },
      { name: "b", argv: ["sh", "-c", "echo MEASURE t $((20 + ${#1})) ns; echo MEASURE u 1 >&2", "sh", "{pad}"] },
    ]);
    const out = path.join(dir, "o");
    const r = cli("run", "--config", c, "--out", out, "--seed", "3");
    expect(r.err).toMatch(/wrote/);
    expect(r.code).toBe(0);
    const raw = fs.readFileSync(path.join(out, "raw.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    expect(raw.length).toBe(10);
    for (const x of raw) expect(x.metrics).toEqual({ t: { value: (x.variant === "a" ? 10 : 20) + x.padLen, unit: "ns" } });
    const e = JSON.parse(fs.readFileSync(path.join(out, "env.json"), "utf8"));
    expect(e.before.hostname).toBeTruthy();
    expect(e.after).toHaveProperty("pinned_cpu_siblings");
    expect(e.before.probe_error).toBeUndefined();
  });
  test.each([
    ["non-zero exit", "echo MEASURE t 1; exit 4", /exit code 4/],
    ["channel death", "echo MEASURE t 1; kill -9 $PPID", /channel lost/],
  ])("%s fails the channel run loudly", (_, body, re) => {
    const out = path.join(dir, "o");
    const r = cli("run", "--config", cfg([{ name: "bad", argv: ["sh", "-c", body] }]), "--out", out, "--seed", "1");
    expect(r.code).toBe(1);
    expect(r.err).toMatch(re);
    const raw = fs.readFileSync(path.join(out, "raw.jsonl"), "utf8").trim().split("\n").map(JSON.parse);
    expect(raw.at(-1).errors.join(" ")).toMatch(re);
    expect(JSON.parse(fs.readFileSync(path.join(out, "env.json"), "utf8")).failed).toBe(true);
  });
});

describe("metrics: level and rate", () => {
  test("Clopper-Pearson known values", () => {
    const [lo, hi] = clopperPearson(7, 20);
    expect(lo).toBeCloseTo(0.1539, 4);
    expect(hi).toBeCloseTo(0.5922, 4);
    expect(clopperPearson(0, 20)[0]).toBe(0);
    expect(clopperPearson(20, 20)[1]).toBe(1);
  });
  test("Newcombe hybrid score difference interval reproduces the published worked examples", () => {
    // Newcombe RG (1998) "Interval estimation for the difference between independent proportions",
    // Statistics in Medicine 17:873-890, Table II, method 10 (score, no continuity correction).
    const cases = [
      [[56, 70, 48, 80], 0.0524, 0.3339],
      [[9, 10, 3, 10], 0.1705, 0.809],
      [[6, 7, 2, 7], 0.0582, 0.8062],
      [[5, 56, 0, 29], -0.0381, 0.1926],
      [[0, 10, 0, 20], -0.1611, 0.2775], // 0/n vs 0/n
      [[10, 10, 0, 10], 0.6075, 1], // n/n vs 0/n
    ];
    for (const [a, lo, hi] of cases) {
      const d = newcombeDiff(...a);
      expect(d.lo).toBeCloseTo(lo, 4);
      expect(d.hi).toBeCloseTo(hi, 4);
    }
    expect(newcombeDiff(10, 10, 10, 10).d).toBe(0);
    expect(newcombeDiff(10, 10, 10, 10).hi).toBeCloseTo(-newcombeDiff(10, 10, 10, 10).lo, 12);
    expect(wilson(0, 10)[0]).toBe(0);
    expect(wilson(10, 10)[1]).toBe(1);
  });
  test("rate and level verdicts", () => {
    expect(rateVerdict({ d: 0.4, lo: 0.1, hi: 0.6 }, 0.2, "lower")).toBe("higher (worse)");
    expect(rateVerdict({ d: -0.4, lo: -0.6, hi: -0.1 }, 0.2, "lower")).toBe("lower (better)");
    expect(rateVerdict({ d: 0.15, lo: 0.05, hi: 0.3 }, 0.2, "lower")).toBe("no measurable difference"); // inside floor
    expect(rateVerdict({ d: 0.4, lo: -0.01, hi: 0.6 }, 0.1, "lower")).toBe("no measurable difference"); // spans 0
    expect(rateVerdict({ d: 0.4, lo: 0.1, hi: 0.6 }, null, "lower")).toBe("no A/A floor");
    expect(levelVerdict(0.8, [0.75, 0.85], 0.02, "lower")).toBe("lower (better)");
    expect(levelVerdict(0.8, [0.75, 0.85], 0.02, "higher")).toBe("lower (worse)");
    expect(levelVerdict(1.2, [1.15, 1.25], 0.02, "lower")).toBe("higher (worse)");
    expect(levelVerdict(0.97, [0.96, 0.98], 0.05, "lower")).toBe("no measurable difference");
  });
  const ok = { variants: [{ name: "a", argv: ["true"] }], invocations: 1, warmup: 0, padMax: 0 };
  test("metrics config accepted", () => expect(validateConfig({ ...ok, metrics: { rss: { kind: "level", better: "lower" }, bad_mode: { kind: "rate", better: "lower" } } })).toEqual([]));
  test.each([
    [[], /metrics must be an object/],
    [{ rss: "level" }, /metrics\.rss must be an object/],
    [{ rss: { kind: "peak", better: "lower" } }, /metrics\.rss\.kind must be "level" or "rate"/],
    [{ rss: { kind: "level" } }, /metrics\.rss\.better must be "lower" or "higher"/],
    [{ rss: { kind: "level", better: "lower", unit: "B" } }, /metrics\.rss: unknown key "unit"/],
    [{ "a b": { kind: "level", better: "lower" } }, /without whitespace/],
  ])("bad metrics %j rejected", (metrics, re) => expect(validateConfig({ ...ok, metrics }).join("\n")).toMatch(re));

  const rec = (variant, group, m, value) => ({ variant, group, warmup: false, metrics: { [m]: { value, unit: m === "rss" ? "B" : "" } } });
  const variants = [{ name: "base" }, { name: "dup" }, { name: "x1", group: "x" }, { name: "x2", group: "x" }];
  const recs = [];
  for (let i = 0; i < 40; i++) {
    recs.push(rec("base", "base", "bad", i % 10 === 0 ? 1 : 0), rec("dup", "dup", "bad", i % 10 === 5 ? 1 : 0), rec(i < 20 ? "x1" : "x2", "x", "bad", i % 5 === 0 ? 0 : 1));
    recs.push(rec("base", "base", "rss", 100 + (i % 4)), rec("dup", "dup", "rss", 100 + (i % 5)), rec(i < 20 ? "x1" : "x2", "x", "rss", 150 + (i % 3)));
  }
  const env = (metrics, aa = ["base", "dup"]) => ({ seed: 3, config: { variants, baseline: "base", aa, metrics } });
  test("rate metric renders k/n, Clopper-Pearson, Newcombe difference and verdict; level uses neutral wording", () => {
    const md = buildReport(recs, env({ bad: { kind: "rate", better: "lower" }, rss: { kind: "level", better: "lower" } }), { resamples: 300 });
    expect(md).toMatch(/## bad — rate/);
    expect(md).toMatch(/\| base \| 1 \| 4\/40 \(0\.1\) \| \[0\.02793, 0\.2366\] \| 0 \| n\/a \| baseline \|/);
    expect(md).toMatch(/\| x \| 2 \| 32\/40 \(0\.8\) \|.*\| 0\.7 \|.*\| higher \(worse\) \|/); // pooled over builds
    expect(md).toMatch(/\| dup \|.*\| no measurable difference \|/);
    expect(md).toMatch(/A\/A \(base - dup\): difference 0,/);
    expect(md).toMatch(/\| x \| x1 \| 16\/20 \(0\.8\) \|/);
    expect(md).toMatch(/\| x \|.*\| higher \(worse\) \|\n\n.*\n\n.*\n\n\| group \| build \| k\/n/);
    expect(md).toMatch(/## rss \(B\)[\s\S]*\| x \| 2 \| 40 \| 151 \|.*\| higher \(worse\) \|/);
    expect(md).not.toMatch(/\| (faster|slower) \|/);
    expect(buildReport(recs, env({ bad: { kind: "rate", better: "lower" } }, null), { resamples: 300 })).toMatch(/\| x \|.*\| no A\/A floor \|/);
    // a metric without an entry keeps time wording
    expect(buildReport(recs, env({ bad: { kind: "rate", better: "lower" } }), { resamples: 300 })).toMatch(/## rss \(B\)[\s\S]*\| x \|.*\| slower \|/);
  });
  test("golden: a committed time-only report regenerates byte-identical", () => {
    const d = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "sqlite-parse-number-rust-tuning", "results", "round4", "pilot");
    const records = fs.readFileSync(path.join(d, "raw.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const e = JSON.parse(fs.readFileSync(path.join(d, "env.json"), "utf8"));
    expect(buildReport(records, e)).toBe(fs.readFileSync(path.join(d, "report.md"), "utf8"));
  });
});
