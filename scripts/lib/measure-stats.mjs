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
