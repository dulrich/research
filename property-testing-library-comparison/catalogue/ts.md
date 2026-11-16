# TypeScript defect catalogue

Target: `scripts/lib/measure-stats.mjs` at commit `0384852` (`clopperPearson`, `newcombeDiff`, `percentile`), copied unchanged into a gitignored `var/` directory. The target has no known real defect, so every defect below is a seeded one-line mutant, stored as a `git diff`-style file under `mutants/ts/` and applied (with `patch`) to a per-defect copy of the target. The original is never edited.

This catalogue, with each defect's hand-derived minimal counterexample and size measure, was written before the first comparison run (the time is logged in the TypeScript section of `notes.md`). Each defect names the one designated property that the comparison run exercises (the library-neutral oracle is `ts/checks.mjs`; the Hegel and fast-check generators are in `ts/hegel/props.mjs` and `ts/fastcheck/props.mjs`).

Size measure for arrays: `arrSize(xs) = len + (number of non-zero elements) + (number of non-integer elements)`. For percentile defects a drawn `q` adds 1 when `q != 0`. For binomial defects the size is `k + n`; for the two-sample defect `k1 + n1 + k2 + n2`. "Exactly minimal" means the final counterexample's key fields equal one of the listed minimal inputs; "size-minimal" means its size equals the minimum size. Fields not listed as key (for example `alpha`, or `q` where the defect does not depend on it) are not compared, and are reported verbatim in the results.

| id | mutation (one line of `measure-stats.mjs`) | designated property | minimal counterexample (key fields) | min size | difficulty expectation |
|---|---|---|---|---|---|
| M1-pct-len | `percentile`: `h = (s.length - 1) * q` becomes `h = s.length * q` | pct-bounds (bounded by min and max, exact at the ends) | `xs = [0]`, `q = 0` | 1 | easy: every input with at least one element fails |
| M2-pct-mutates | `percentile`: `Float64Array.from(xs).sort()` becomes `xs.sort((a, b) => a - b)` (sorts the caller's array in place) | pct-perm (permutation-invariant, input unmodified) | `xs = [1, 0]` or `[0, -1]`, `q = 0` (any unsorted pair; `ys` is a permutation of `xs`) | 3 | medium: needs an unsorted array of two or more elements |
| M3-cp-k0lo | `clopperPearson`: lower bound for `k = 0` is `1e-3` instead of `0` | cp-bounds (bounds, containment, endpoints, no NaN) | `k = 0`, `n = 1` (any `alpha`) | 1 | needs `k = 0`, which is rare under a uniform draw of `k` in `0..n` |
| M4-nd-swap | `newcombeDiff`: the lower bound uses `(p2 - l2)` where it must use `(u2 - p2)` | nd-props (containment, range, antisymmetry, no NaN) | `k1 = 0, n1 = 1, k2 = 0, n2 = 1` | 2 | easy: any pair with an asymmetric Wilson interval fails |
| M5-pct-overshoot | `percentile`: interpolation term multiplied by `1.01` | pct-bounds | `xs` is a permutation of `[0, 1]` or of `[-1, 0]` (two elements, a gap, `q` above `1/1.01 = 0.990099`; `q` is not minimal-able, the infimum is not attained) | 3 | hard: the result exceeds the maximum only for `q` within about `0.01 / (len - 1)` of 1 |
| M6-cp-lo-alpha | `clopperPearson`: lower bisection uses `alpha` where it must use `alpha / 2` | cp-symmetry (CP(k,n) = 1 minus the reversed CP(n-k,n)) | `k = 0, n = 1` (any `alpha`) | 1 | easy: any interior `k` fails |

## Derivation notes

- M1: for `xs = [x]` and `q = 1`, `h = 1`, `lo = 1`, the else branch reads `s[1]`, which is `undefined`, so the ends check fails. A single element is the smallest array, `0` is the simplest value, `q = 0` the simplest quantile.
- M2: in-place sorting changes the caller's array exactly when it is not already ascending. The smallest unsorted array has two elements; `[1, 0]` and `[0, -1]` have size 3 (two elements, one non-zero, all integers). Other unsorted integer pairs such as `[2, 0]` also have size 3 and are size-minimal but not exactly minimal.
- M3: the lower bound is wrong only when `k = 0`; the smallest `n` is 1. The first failing check is "containment", the same property.
- M4: for `(k1, n1) = (k2, n2) = (0, 1)` the mutated `r.lo` is `0` while the reversed call's `s.hi` is the Wilson upper bound of one trial in zero successes, so `r.lo + s.hi` is not 0.
- M5: with two elements `lo = 0` and the interpolation is `s[0] + 1.01 * q * gap`, which exceeds `s[1]` when `q > 1/1.01`. With three or more elements the overshoot only matters in the last interval, so two is minimal. The two permutations of the pair are the same input to `percentile`, hence both are listed.
- M6: `k = 0, n = 1`: `CP(0,1)` has `hi = 1 - alpha/2` while `CP(1,1)` has the mutated `lo = alpha`, so `hi` and `1 - lo2` differ by `alpha / 2 >= 0.0005`, far above the `1e-7` tolerance.

The minimal counterexamples above were derived by hand and then confirmed by exhausting a small input domain against each mutant with `ts/verify-minimal.mjs` (no library involved): the smallest failing inputs it found had the sizes in the table. One hand error was corrected before this file was finalised: for M5 and M2 the minimal set had listed only one ordering of the pair.

## Default case budgets (recorded, not run)

Hegel (`@hegeldev/hegel` 0.5.7): 100 test cases per run. fast-check 4.10.2: 100 runs per property. The comparison runs both at 1,000.
