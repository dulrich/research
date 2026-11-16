// Deterministic guard examples ported from the pilot (documented n = 0 and empty-input behaviour).
import { test, expect } from "bun:test";
const { clopperPearson, newcombeDiff, percentile } = await import(process.env.PTLC_TARGET || new URL("../../var/ptlc-ts/measure-stats.mjs", import.meta.url).pathname);

test("clopperPearson: n = 0 returns the vacuous interval [0, 1] (documented guard)", () => {
  expect(clopperPearson(0, 0)).toEqual([0, 1]);
});
test("newcombeDiff: n = 0 yields NaN (probe; no guard unlike clopperPearson)", () => {
  const r = newcombeDiff(0, 0, 1, 2);
  expect([r.d, r.lo, r.hi].some(Number.isNaN)).toBe(true);
});
test("percentile: empty input is NaN (documented guard)", () => {
  expect(Number.isNaN(percentile([], 0.5))).toBe(true);
});
