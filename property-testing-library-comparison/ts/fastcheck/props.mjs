// fastcheck/props.mjs: fast-check generators for each property, and a seeded runner.
import fc from "fast-check";
import { CHECKS } from "../checks.mjs";

// k successes in n trials, 1 <= n <= 200, 0 <= k <= n.
const kn = fc.integer({ min: 1, max: 200 }).chain((n) => fc.integer({ min: 0, max: n }).map((k) => ({ k, n })));
const alphaGen = fc.double({ min: 0.001, max: 0.5, noNaN: true });
const finite = fc.double({ min: -1e6, max: 1e6, noNaN: true });
const sample = fc.array(finite, { minLength: 1, maxLength: 40 });
const q01 = fc.double({ min: 0, max: 1, noNaN: true });

/** property id -> arbitrary of inputs objects. */
export const ARBS = {
  "cp-bounds": fc.record({ kn, alpha: alphaGen }).map(({ kn: v, alpha }) => ({ ...v, alpha })),
  "cp-symmetry": fc.record({ kn, alpha: alphaGen }).map(({ kn: v, alpha }) => ({ ...v, alpha })),
  "cp-narrowing": fc.record({ kn, a1: alphaGen, a2: alphaGen }).map(({ kn: v, a1, a2 }) => ({ ...v, a1, a2 })),
  "nd-props": fc.record({ a: kn, b: kn }).map(({ a, b }) => ({ k1: a.k, n1: a.n, k2: b.k, n2: b.n })),
  "pct-bounds": fc.record({ xs: sample, q: q01 }),
  "pct-monotone": fc.record({ xs: sample, a: q01, b: q01 }),
  "pct-perm": sample.chain((xs) =>
    fc.record({ xs: fc.constant(xs), ys: fc.shuffledSubarray(xs, { minLength: xs.length, maxLength: xs.length }), q: q01 }),
  ),
};

export const DEFAULT_CASES = 100; // fast-check's default numRuns

/** Runs one property with one seed; returns a result row (without library/defect/seed). */
export async function runProp(id, { seed, testCases }) {
  const check = CHECKS[id];
  let firstFail = null;
  const t0 = performance.now();
  const res = fc.check(
    fc.property(ARBS[id], (inputs) => {
      try {
        check(inputs);
      } catch (e) {
        if (firstFail === null) firstFail = performance.now();
        throw e;
      }
    }),
    { seed, numRuns: testCases },
  );
  const t1 = performance.now();
  if (!res.failed) return { detected: 0, cases: "", counterexample: "", inputs: null, shrinkMs: "", totalMs: t1 - t0 };
  return {
    detected: 1,
    cases: res.numRuns,
    counterexample: fc.stringify(res.counterexample[0]),
    inputs: res.counterexample[0],
    shrinkMs: firstFail === null ? "" : t1 - firstFail,
    totalMs: t1 - t0,
  };
}
