// hegel/props.mjs: Hegel (@hegeldev/hegel) generators for each property, and a seeded runner.
import * as hegel from "@hegeldev/hegel";
import * as gs from "@hegeldev/hegel/generators";
import { CHECKS } from "../checks.mjs";

// k successes in n trials, 1 <= n <= 200, 0 <= k <= n.
const kn = gs.composite((tc) => {
  const n = tc.draw(gs.integers({ minValue: 1, maxValue: 200 }));
  const k = tc.draw(gs.integers({ minValue: 0, maxValue: n }));
  return { k, n };
});
const alphaGen = gs.floats({ minValue: 0.001, maxValue: 0.5 });
const finite = gs.floats({ minValue: -1e6, maxValue: 1e6, allowNan: false, allowInfinity: false });
const sample = gs.arrays(finite, { minSize: 1, maxSize: 40 });
const q01 = gs.floats({ minValue: 0, maxValue: 1, allowNan: false, allowInfinity: false });

/** property id -> (tc) => inputs object. */
export const GENS = {
  "cp-bounds": (tc) => ({ ...tc.draw(kn), alpha: tc.draw(alphaGen) }),
  "cp-symmetry": (tc) => ({ ...tc.draw(kn), alpha: tc.draw(alphaGen) }),
  "cp-narrowing": (tc) => ({ ...tc.draw(kn), a1: tc.draw(alphaGen), a2: tc.draw(alphaGen) }),
  "nd-props": (tc) => {
    const a = tc.draw(kn);
    const b = tc.draw(kn);
    return { k1: a.k, n1: a.n, k2: b.k, n2: b.n };
  },
  "pct-bounds": (tc) => ({ xs: tc.draw(sample), q: tc.draw(q01) }),
  "pct-monotone": (tc) => ({ xs: tc.draw(sample), a: tc.draw(q01), b: tc.draw(q01) }),
  "pct-perm": (tc) => {
    const xs = tc.draw(sample);
    return { xs, ys: tc.draw(gs.permutations(xs)), q: tc.draw(q01) };
  },
};

export const DEFAULT_CASES = 100; // Hegel's documented default test_cases

/** Runs one property with one seed; resolves to a result row (without library/defect/seed). */
export async function runProp(id, { seed, testCases }) {
  const gen = GENS[id];
  const check = CHECKS[id];
  let calls = 0;
  let firstFail = null;
  const t0 = performance.now();
  let error = null;
  try {
    await hegel.test(
      (tc) => {
        calls++;
        const inputs = gen(tc);
        try {
          check(inputs);
        } catch (e) {
          if (firstFail === null) firstFail = { calls, t: performance.now() };
          throw e;
        }
      },
      { testCases, seed: BigInt(seed), database: hegel.Database.disabled },
    );
  } catch (e) {
    error = e;
  }
  const t1 = performance.now();
  if (error === null) return { detected: 0, cases: "", counterexample: "", inputs: null, shrinkMs: "", totalMs: t1 - t0 };
  let inputs = null;
  try { inputs = JSON.parse(error.message).inputs; } catch { /* not a check failure (engine error) */ }
  return {
    detected: inputs === null ? "error" : 1,
    cases: firstFail ? firstFail.calls : "",
    counterexample: error.message,
    inputs,
    shrinkMs: firstFail ? t1 - firstFail.t : "",
    totalMs: t1 - t0,
  };
}
