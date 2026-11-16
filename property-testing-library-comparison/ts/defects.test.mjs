import { test, expect } from "bun:test";
import { DEFECTS, DEFECT_IDS, MIN_SIZE, arrSize } from "./defects.mjs";

test("every defect has a property, a mutant file and a minimum size", () => {
  for (const id of DEFECT_IDS) {
    expect(typeof DEFECTS[id].property).toBe("string");
    expect(DEFECTS[id].mutant).toBe(`${id}.diff`);
    expect(typeof MIN_SIZE[id]).toBe("number");
  }
  expect(DEFECT_IDS.length).toBeGreaterThanOrEqual(5);
});

test("arrSize: length plus non-zero plus non-integer", () => {
  expect(arrSize([0])).toBe(1);
  expect(arrSize([1, 0])).toBe(3);
  expect(arrSize([0.5, 0])).toBe(4);
});

test("a minimal counterexample has the minimum size", () => {
  expect(DEFECTS["M1-pct-len"].size({ xs: [0], q: 0 })).toBe(MIN_SIZE["M1-pct-len"]);
  expect(DEFECTS["M2-pct-mutates"].size({ xs: [1, 0], q: 0 })).toBe(MIN_SIZE["M2-pct-mutates"]);
  expect(DEFECTS["M3-cp-k0lo"].size({ k: 0, n: 1 })).toBe(MIN_SIZE["M3-cp-k0lo"]);
  expect(DEFECTS["M4-nd-swap"].size({ k1: 0, n1: 1, k2: 0, n2: 1 })).toBe(MIN_SIZE["M4-nd-swap"]);
  expect(DEFECTS["M5-pct-overshoot"].size({ xs: [0, 1] })).toBe(MIN_SIZE["M5-pct-overshoot"]);
  expect(DEFECTS["M6-cp-lo-alpha"].size({ k: 0, n: 1 })).toBe(MIN_SIZE["M6-cp-lo-alpha"]);
});

test("isMinimal accepts the listed sets and rejects near misses", () => {
  expect(DEFECTS["M1-pct-len"].isMinimal({ xs: [0], q: 0 })).toBe(true);
  expect(DEFECTS["M1-pct-len"].isMinimal({ xs: [1], q: 0 })).toBe(false);
  expect(DEFECTS["M2-pct-mutates"].isMinimal({ xs: [0, -1], q: 0 })).toBe(true);
  expect(DEFECTS["M2-pct-mutates"].isMinimal({ xs: [0, -2], q: 0 })).toBe(false);
  expect(DEFECTS["M5-pct-overshoot"].isMinimal({ xs: [1, 0] })).toBe(true);
  expect(DEFECTS["M5-pct-overshoot"].isMinimal({ xs: [0, 0.5] })).toBe(false);
  expect(DEFECTS["M4-nd-swap"].isMinimal({ k1: 0, n1: 1, k2: 1, n2: 1 })).toBe(false);
});
