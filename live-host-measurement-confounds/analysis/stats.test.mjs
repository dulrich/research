import { test, expect } from "bun:test";
import { bootMedian, clopperPearson, binomCdf, classify, relIqr, fnv1a, ci95 } from "./stats.mjs";

test("Clopper-Pearson matches reference values", () => {
  // reference: R binom.test(k, n)$conf.int
  const [a, b] = clopperPearson(0, 20);
  expect(a).toBe(0);
  expect(b).toBeCloseTo(0.16843, 4);
  const [c, d] = clopperPearson(3, 20);
  expect(c).toBeCloseTo(0.03207, 4);
  expect(d).toBeCloseTo(0.37893, 4);
  const [e, f] = clopperPearson(20, 20);
  expect(e).toBeCloseTo(0.83157, 4);
  expect(f).toBe(1);
});

test("binomial cdf", () => {
  expect(binomCdf(0, 1, 0.5)).toBeCloseTo(0.5, 12);
  expect(binomCdf(2, 4, 0.5)).toBeCloseTo(11 / 16, 12);
});

test("bootstrap is deterministic per key and covers the median", () => {
  const xs = Array.from({ length: 30 }, (_, i) => 100 + (i % 7));
  const r1 = bootMedian([xs], "k");
  const r2 = bootMedian([xs], "k");
  expect(Array.from(r1)).toEqual(Array.from(r2));
  expect(Array.from(bootMedian([xs], "other"))).not.toEqual(Array.from(r1));
  const [lo, hi] = ci95(r1);
  expect(lo).toBeLessThanOrEqual(103);
  expect(hi).toBeGreaterThanOrEqual(103);
  expect(fnv1a("a")).toBe(0xe40c292c);
});

test("relative IQR", () => {
  expect(relIqr([1, 1, 1])).toBe(0);
  expect(relIqr([0, 1, 2, 3, 4])).toBeCloseTo(1, 12);
});

test("classification", () => {
  const base = { floor: 0.01, matters: 0.05, dispRatio: 1 };
  expect(classify({ ...base, r: 1.1, lo: 1.08, hi: 1.12 })).toBe("bias");
  expect(classify({ ...base, r: 1.005, lo: 1.002, hi: 1.008 })).toBe("no measurable effect");
  expect(classify({ ...base, r: 1.0, lo: 0.9, hi: 1.1 })).toBe("unresolved at measured resolution");
  expect(classify({ ...base, r: 1.0, lo: 0.99, hi: 1.01, dispRatio: 3 })).toBe("noise only");
});
