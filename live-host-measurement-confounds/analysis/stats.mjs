// stats.mjs - statistics helpers for analyze.mjs (no dependencies): seeded bootstrap, Clopper-Pearson, classification.
import { mulberry32, hierBootstrap, percentile, median, ci95, ratioReps } from "../../scripts/lib/measure-stats.mjs";

export { mulberry32, hierBootstrap, percentile, median, ci95, ratioReps };

export const B = 10000; // bootstrap resamples (methods/timing.md R6: at least 10,000)
export const BASE_SEED = 20261113;

/** FNV-1a 32-bit hash of a string; per-quantity seeds make every replicate array independent and reproducible. */
export function fnv1a(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Bootstrap replicates of the median for `builds` (array of value arrays), seeded from `key`. */
export function bootMedian(builds, key, b = B) {
  return hierBootstrap(builds, b, mulberry32((fnv1a(key) ^ BASE_SEED) >>> 0));
}

/** Relative interquartile range (IQR / median) of a value list. */
export function relIqr(xs) {
  const m = median(xs);
  return m === 0 ? 0 : (percentile(xs, 0.75) - percentile(xs, 0.25)) / Math.abs(m);
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
  // lower: P(X >= k | p) = a  <=>  1 - cdf(k-1, p) = a ; increasing in p
  const lo = k === 0 ? 0 : bisect((p) => 1 - binomCdf(k - 1, n, p) - a, 0, 1);
  // upper: P(X <= k | p) = a ; decreasing in p, so negate
  const hi = k === n ? 1 : bisect((p) => a - binomCdf(k, n, p), 0, 1);
  return [lo, hi];
}

/**
 * Classify one contrast (ratio r with 95% CI [lo, hi]) against a noise floor and the effect size that matters.
 *  - "bias": CI excludes 1 and |r - 1| exceeds the floor (methods/timing.md R8 applied to a load or control effect);
 *  - "noise only": no bias, but the within-cell relative IQR grew by at least `dispFactor` against the reference
 *    and is itself at least half the size that matters (`disp`, so a doubling of a negligible spread is not noise);
 *  - "no measurable effect": no bias and the whole CI lies within +/- `matters` of 1;
 *  - "unresolved at measured resolution": otherwise (the CI cannot exclude an effect of the size that matters).
 */
export function classify({ r, lo, hi, floor, matters, dispRatio, disp = Infinity, dispFactor = 2 }) {
  if ((lo > 1 || hi < 1) && Math.abs(r - 1) > floor) return "bias";
  if (dispRatio >= dispFactor && disp >= matters / 2) return "noise only";
  if (Math.max(Math.abs(lo - 1), Math.abs(hi - 1)) <= matters) return "no measurable effect";
  return "unresolved at measured resolution";
}
