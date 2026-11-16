// checks.mjs: the library-neutral oracles of the TypeScript harness.
// A check takes one plain inputs object and throws an Error whose message is JSON
// {tag, inputs, ...detail} when the property fails. Both libraries call the same checks;
// only the generators that build the inputs differ (see hegel/props.mjs and fastcheck/props.mjs).
import { fileURLToPath } from "node:url";

export const DEFAULT_TARGET = fileURLToPath(new URL("../../var/ptlc-ts/measure-stats.mjs", import.meta.url));
export const TARGET = process.env.PTLC_TARGET || DEFAULT_TARGET;
const { clopperPearson, newcombeDiff, percentile } = await import(TARGET);

const EPS = 1e-7;
const fail = (tag, inputs, detail = {}) => {
  throw new Error(JSON.stringify({ tag, inputs, ...detail }));
};

const RAW = {
  // k successes in n trials: bounds, containment, endpoints, no NaN.
  "cp-bounds"(inputs) {
    const { k, n, alpha } = inputs;
    const [lo, hi] = clopperPearson(k, n, alpha);
    if (Number.isNaN(lo) || Number.isNaN(hi)) fail("NaN", inputs, { lo, hi });
    if (!(0 <= lo && lo <= k / n + EPS && k / n - EPS <= hi && hi <= 1)) fail("containment", inputs, { lo, hi });
    if (k === 0 && lo !== 0) fail("k=0 lo", inputs, { lo, hi });
    if (k === n && hi !== 1) fail("k=n hi", inputs, { lo, hi });
  },
  // symmetry CP(k,n) = 1 - CP(n-k,n) reversed
  "cp-symmetry"(inputs) {
    const { k, n, alpha } = inputs;
    const [lo, hi] = clopperPearson(k, n, alpha);
    const [lo2, hi2] = clopperPearson(n - k, n, alpha);
    if (Math.abs(lo - (1 - hi2)) > EPS || Math.abs(hi - (1 - lo2)) > EPS) fail("asymmetry", inputs, { lo, hi, lo2, hi2 });
  },
  // the interval narrows weakly as alpha grows
  "cp-narrowing"(inputs) {
    const { k, n, a1, a2 } = inputs;
    const [small, large] = a1 <= a2 ? [a1, a2] : [a2, a1];
    const [l1, h1] = clopperPearson(k, n, small);
    const [l2, h2] = clopperPearson(k, n, large);
    if (l2 < l1 - EPS || h2 > h1 + EPS) fail("not narrowing", inputs, { l1, h1, l2, h2 });
  },
  // contains the point difference, antisymmetric, within [-1, 1], no NaN
  "nd-props"(inputs) {
    const { k1, n1, k2, n2 } = inputs;
    const r = newcombeDiff(k1, n1, k2, n2);
    const s = newcombeDiff(k2, n2, k1, n1);
    for (const v of [r.d, r.lo, r.hi, s.d, s.lo, s.hi]) if (Number.isNaN(v)) fail("NaN", inputs, { r, s });
    if (!(r.lo <= r.d + EPS && r.d <= r.hi + EPS)) fail("containment", inputs, { r });
    if (!(r.lo >= -1 - EPS && r.hi <= 1 + EPS)) fail("range", inputs, { r });
    if (Math.abs(r.d + s.d) > EPS || Math.abs(r.lo + s.hi) > EPS || Math.abs(r.hi + s.lo) > EPS) fail("antisymmetry", inputs, { r, s });
  },
  // bounded by min and max, exact at the ends
  "pct-bounds"(inputs) {
    const { xs, q } = inputs;
    const v = percentile(xs, q);
    const mn = Math.min(...xs), mx = Math.max(...xs);
    if (Number.isNaN(v) || v < mn || v > mx) fail("bounds", inputs, { v });
    if (percentile(xs, 0) !== mn || percentile(xs, 1) !== mx) fail("ends", inputs, { v });
  },
  // monotone in q (a, b in [0, 1], ordered here)
  "pct-monotone"(inputs) {
    const { xs, a, b } = inputs;
    const [p, q] = a <= b ? [a, b] : [b, a];
    if (percentile(xs, p) > percentile(xs, q)) fail("not monotone", inputs, { p, q });
  },
  // permutation-invariant (ys is a permutation of xs) and leaves its input unmodified
  "pct-perm"(inputs) {
    const { xs, ys, q } = inputs;
    const before = JSON.stringify(xs);
    if (percentile(xs, q) !== percentile(ys, q)) fail("order matters", inputs);
    if (JSON.stringify(xs) !== before) fail("input mutated", inputs);
  },
};


// Each check runs on a private clone (percentile may mutate its argument, defect M2) and reports
// the original inputs on failure, so the recorded counterexample is what the generator produced.
function wrap(fn) {
  return (raw) => {
    try {
      fn(structuredClone(raw));
    } catch (e) {
      let o;
      try { o = JSON.parse(e.message); } catch { throw e; }
      o.inputs = raw;
      throw new Error(JSON.stringify(o));
    }
  };
}
export const CHECKS = Object.fromEntries(Object.entries(RAW).map(([id, fn]) => [id, wrap(fn)]));
export const PROP_IDS = Object.keys(CHECKS);
