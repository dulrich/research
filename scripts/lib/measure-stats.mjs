// measure-stats.mjs — deterministic statistics for scripts/measure.mjs (no dependencies).

/** mulberry32: 32-bit state, period 2^32, returns floats in [0, 1). Same generator drives scheduling and bootstrap. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Uniform integer in [0, n). */
export const randInt = (rng, n) => Math.floor(rng() * n);

/** Fisher-Yates permutation of 0..n-1. */
export function permutation(rng, n) {
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = randInt(rng, i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/** Percentile with linear interpolation between order statistics (R type 7); q in [0, 1]. */
export function percentile(xs, q) {
  if (!xs.length) return NaN;
  const s = Float64Array.from(xs).sort();
  const h = (s.length - 1) * q;
  const lo = Math.floor(h);
  return lo + 1 < s.length ? s[lo] + (h - lo) * (s[lo + 1] - s[lo]) : s[lo];
}

export const median = (xs) => percentile(xs, 0.5);

/**
 * Hierarchical bootstrap replicates of the median. `builds` is an array of value arrays (one per layout build).
 * Per replicate: resample builds with replacement, resample invocations within each chosen build, median of the pool.
 * With one build this is a plain bootstrap of invocations.
 */
export function hierBootstrap(builds, B, rng) {
  const total = builds.reduce((n, b) => n + b.length, 0);
  const pool = new Float64Array(total);
  const out = new Float64Array(B);
  for (let r = 0; r < B; r++) {
    let k = 0;
    for (let i = 0; i < builds.length; i++) {
      const b = builds[randInt(rng, builds.length)];
      for (let j = 0; j < b.length; j++) pool[k++] = b[randInt(rng, b.length)];
    }
    out[r] = median(pool.subarray(0, k));
  }
  return out;
}

/** 95% percentile interval of replicate values. */
export const ci95 = (reps) => [percentile(reps, 0.025), percentile(reps, 0.975)];

/** Ratio replicates (A* over B*) from two independent replicate arrays of equal length. */
export const ratioReps = (a, b) => a.map((x, i) => x / b[i]);

/**
 * Claim rule (lower is better): "faster"/"slower" only when the ratio CI excludes 1 and |ratio - 1| exceeds
 * the A/A ratio CI half-width; otherwise "no measurable difference". Without an A/A floor no claim is made.
 */
export function verdict(ratio, [lo, hi], aaHalf) {
  if (aaHalf == null) return "no A/A floor";
  if ((lo > 1 || hi < 1) && Math.abs(ratio - 1) > aaHalf) return ratio < 1 ? "faster" : "slower";
  return "no measurable difference";
}

/** Direction-neutral claim rule for level metrics with a `metrics` entry: "lower"/"higher" (+ better/worse). */
export function levelVerdict(ratio, ci, aaHalf, better) {
  const v = verdict(ratio, ci, aaHalf);
  if (v !== "faster" && v !== "slower") return v;
  const dir = v === "faster" ? "lower" : "higher";
  return `${dir} (${dir === better ? "better" : "worse"})`;
}

function logChoose(n, k) {
  let s = 0;
  for (let i = 1; i <= k; i++) s += Math.log(n - k + i) - Math.log(i);
  return s;
}

/** P(X <= k) for X ~ Binomial(n, p). */
export function binomCdf(k, n, p) {
  if (k < 0) return 0;
  if (k >= n) return 1;
  if (p <= 0) return 1;
  if (p >= 1) return 0;
  let s = 0;
  for (let i = 0; i <= k; i++) s += Math.exp(logChoose(n, i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
  return Math.min(1, s);
}

function bisect(f, lo, hi) {
  // f is monotone increasing on [lo, hi]; returns the root
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Exact (Clopper-Pearson) two-sided interval for k successes in n trials, level 1 - alpha. */
export function clopperPearson(k, n, alpha = 0.05) {
  if (n <= 0) return [0, 1];
  const a = alpha / 2;
  const lo = k === 0 ? 0 : bisect((p) => 1 - binomCdf(k - 1, n, p) - a, 0, 1);
  const hi = k === n ? 1 : bisect((p) => a - binomCdf(k, n, p), 0, 1);
  return [lo, hi];
}

const Z95 = 1.959963984540054;

/** Wilson score interval (no continuity correction) for k of n, 95%. */
export function wilson(k, n, z = Z95) {
  if (n <= 0) return [0, 1];
  const p = k / n;
  const z2 = z * z;
  const c = (p + z2 / (2 * n)) / (1 + z2 / n);
  const h = (z / (1 + z2 / n)) * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n));
  return [k === 0 ? 0 : Math.max(0, c - h), k === n ? 1 : Math.min(1, c + h)];
}

/**
 * 95% interval for p1 - p2 (k1/n1 minus k2/n2): Newcombe's hybrid score interval from two Wilson intervals
 * (Newcombe 1998, Statistics in Medicine 17:873-890, method 10). Returns { d, lo, hi }.
 */
export function newcombeDiff(k1, n1, k2, n2) {
  const p1 = k1 / n1, p2 = k2 / n2;
  const [l1, u1] = wilson(k1, n1);
  const [l2, u2] = wilson(k2, n2);
  const d = p1 - p2;
  return { d, lo: d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), hi: d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2) };
}

/**
 * Rate claim rule: "higher"/"lower" (+ better/worse when `better` is given) only when the difference interval
 * excludes 0 and |difference| exceeds the A/A difference-interval half-width; without an A/A floor no claim is made.
 */
export function rateVerdict({ d, lo, hi }, aaHalf, better) {
  if (aaHalf == null) return "no A/A floor";
  if ((lo > 0 || hi < 0) && Math.abs(d) > aaHalf) {
    const dir = d > 0 ? "higher" : "lower";
    return better ? `${dir} (${dir === better ? "better" : "worse"})` : dir;
  }
  return "no measurable difference";
}
