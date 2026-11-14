// Property tests for scripts/lib/measure-stats.mjs, using Hegel for TypeScript under bun test.
import { test, expect } from "bun:test";
import * as hegel from "@hegeldev/hegel";
import * as gs from "@hegeldev/hegel/generators";
import { clopperPearson, newcombeDiff, percentile } from "../../../scripts/lib/measure-stats.mjs";

const CASES = 500;
const TIMEOUT_MS = 60000; // bun test defaults to 5 s per test; clopperPearson bisects 200 times per bound
const EPS = 1e-7;
const run = (body, testCases = CASES) => hegel.test(body, { testCases });

// k successes in n trials, 1 <= n <= 200, 0 <= k <= n.
const kn = gs.composite((tc) => {
  const n = tc.draw(gs.integers({ minValue: 1, maxValue: 200 }));
  const k = tc.draw(gs.integers({ minValue: 0, maxValue: n }));
  return [k, n];
});
const alphaGen = gs.floats({ minValue: 0.001, maxValue: 0.5 });
const finite = gs.floats({ minValue: -1e6, maxValue: 1e6, allowNan: false, allowInfinity: false });

test("clopperPearson: bounds, containment, endpoints, no NaN", () =>
  run((tc) => {
    const [k, n] = tc.draw(kn);
    const alpha = tc.draw(alphaGen);
    const [lo, hi] = clopperPearson(k, n, alpha);
    const ctx = JSON.stringify({ k, n, alpha, lo, hi });
    if (Number.isNaN(lo) || Number.isNaN(hi)) throw new Error("NaN " + ctx);
    if (!(0 <= lo && lo <= k / n + EPS && k / n - EPS <= hi && hi <= 1)) throw new Error("containment " + ctx);
    if (k === 0 && lo !== 0) throw new Error("k=0 lo " + ctx);
    if (k === n && hi !== 1) throw new Error("k=n hi " + ctx);
  }), TIMEOUT_MS);

test("clopperPearson: symmetry CP(k,n) = 1 - CP(n-k,n) reversed", () =>
  run((tc) => {
    const [k, n] = tc.draw(kn);
    const alpha = tc.draw(alphaGen);
    const [lo, hi] = clopperPearson(k, n, alpha);
    const [lo2, hi2] = clopperPearson(n - k, n, alpha);
    const ctx = JSON.stringify({ k, n, alpha, lo, hi, lo2, hi2 });
    if (Math.abs(lo - (1 - hi2)) > EPS || Math.abs(hi - (1 - lo2)) > EPS) throw new Error("asymmetry " + ctx);
  }), TIMEOUT_MS);

test("clopperPearson: interval narrows weakly as alpha grows", () =>
  run((tc) => {
    const [k, n] = tc.draw(kn);
    const a1 = tc.draw(alphaGen);
    const a2 = tc.draw(alphaGen);
    const [small, large] = a1 <= a2 ? [a1, a2] : [a2, a1];
    const [l1, h1] = clopperPearson(k, n, small);
    const [l2, h2] = clopperPearson(k, n, large);
    const ctx = JSON.stringify({ k, n, small, large, l1, h1, l2, h2 });
    if (l2 < l1 - EPS || h2 > h1 + EPS) throw new Error("not narrowing " + ctx);
  }), TIMEOUT_MS);

test("clopperPearson: n = 0 returns the vacuous interval [0, 1] (documented guard)", () => {
  expect(clopperPearson(0, 0)).toEqual([0, 1]);
});

test("newcombeDiff: contains the point difference, antisymmetric, within [-1, 1], no NaN", () =>
  run((tc) => {
    const [k1, n1] = tc.draw(kn);
    const [k2, n2] = tc.draw(kn);
    const r = newcombeDiff(k1, n1, k2, n2);
    const s = newcombeDiff(k2, n2, k1, n1);
    const ctx = JSON.stringify({ k1, n1, k2, n2, r, s });
    for (const v of [r.d, r.lo, r.hi, s.d, s.lo, s.hi]) if (Number.isNaN(v)) throw new Error("NaN " + ctx);
    if (!(r.lo <= r.d + EPS && r.d <= r.hi + EPS)) throw new Error("containment " + ctx);
    if (!(r.lo >= -1 - EPS && r.hi <= 1 + EPS)) throw new Error("range " + ctx);
    if (Math.abs(r.d + s.d) > EPS || Math.abs(r.lo + s.hi) > EPS || Math.abs(r.hi + s.lo) > EPS) throw new Error("antisymmetry " + ctx);
  }), TIMEOUT_MS);

test("newcombeDiff: n = 0 yields NaN (probe; no guard unlike clopperPearson)", () => {
  const r = newcombeDiff(0, 0, 1, 2);
  expect([r.d, r.lo, r.hi].some(Number.isNaN)).toBe(true);
  const w = newcombeDiff(1, 2, 0, 0);
  expect([w.d, w.lo, w.hi].some(Number.isNaN)).toBe(true);
});

const sample = gs.arrays(finite, { minSize: 1, maxSize: 40 });
const q01 = gs.floats({ minValue: 0, maxValue: 1, allowNan: false, allowInfinity: false });

test("percentile: bounded by min and max, exact at the ends", () =>
  run((tc) => {
    const xs = tc.draw(sample);
    const q = tc.draw(q01);
    const v = percentile(xs, q);
    const mn = Math.min(...xs), mx = Math.max(...xs);
    const ctx = JSON.stringify({ xs, q, v });
    if (Number.isNaN(v) || v < mn || v > mx) throw new Error("bounds " + ctx);
    if (percentile(xs, 0) !== mn || percentile(xs, 1) !== mx) throw new Error("ends " + ctx);
  }), TIMEOUT_MS);

test("percentile: monotone in q", () =>
  run((tc) => {
    const xs = tc.draw(sample);
    const a = tc.draw(q01), b = tc.draw(q01);
    const [p, q] = a <= b ? [a, b] : [b, a];
    if (percentile(xs, p) > percentile(xs, q)) throw new Error("not monotone " + JSON.stringify({ xs, p, q }));
  }), TIMEOUT_MS);

test("percentile: permutation-invariant and leaves its input unmodified", () =>
  run((tc) => {
    const xs = tc.draw(sample);
    const ys = tc.draw(gs.permutations(xs));
    const q = tc.draw(q01);
    const before = [...xs];
    if (percentile(xs, q) !== percentile(ys, q)) throw new Error("order matters " + JSON.stringify({ xs, ys, q }));
    if (JSON.stringify(xs) !== JSON.stringify(before)) throw new Error("input mutated");
  }), TIMEOUT_MS);

test("percentile: empty input is NaN (documented guard)", () => {
  expect(Number.isNaN(percentile([], 0.5))).toBe(true);
});
