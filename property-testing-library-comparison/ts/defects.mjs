// defects.mjs: the defect catalogue as data (documented in catalogue/ts.md) and the pure
// size / minimality functions the analysis uses. Pure module: no I/O.

/** Array size measure: length + number of non-zero elements + number of non-integer elements. */
export const arrSize = (xs) => xs.length + xs.filter((x) => x !== 0).length + xs.filter((x) => !Number.isInteger(x)).length;

const sameArr = (a, b) => a.length === b.length && a.every((x, i) => Object.is(x, b[i]) || x === b[i]);

/** defect id -> { property, mutant, size(inputs), minimalSet, isMinimal(inputs) }. */
export const DEFECTS = {
  "M1-pct-len": {
    property: "pct-bounds",
    mutant: "M1-pct-len.diff",
    size: ({ xs, q }) => arrSize(xs) + (q === 0 ? 0 : 1),
    isMinimal: ({ xs, q }) => sameArr(xs, [0]) && q === 0,
  },
  "M2-pct-mutates": {
    property: "pct-perm",
    mutant: "M2-pct-mutates.diff",
    size: ({ xs, q }) => arrSize(xs) + (q === 0 ? 0 : 1),
    isMinimal: ({ xs, q }) => q === 0 && (sameArr(xs, [1, 0]) || sameArr(xs, [0, -1])),
  },
  "M3-cp-k0lo": {
    property: "cp-bounds",
    mutant: "M3-cp-k0lo.diff",
    size: ({ k, n }) => k + n,
    isMinimal: ({ k, n }) => k === 0 && n === 1,
  },
  "M4-nd-swap": {
    property: "nd-props",
    mutant: "M4-nd-swap.diff",
    size: ({ k1, n1, k2, n2 }) => k1 + n1 + k2 + n2,
    isMinimal: ({ k1, n1, k2, n2 }) => k1 === 0 && n1 === 1 && k2 === 0 && n2 === 1,
  },
  "M5-pct-overshoot": {
    property: "pct-bounds",
    mutant: "M5-pct-overshoot.diff",
    size: ({ xs }) => arrSize(xs),
    isMinimal: ({ xs }) => [[0, 1], [1, 0], [-1, 0], [0, -1]].some((m) => sameArr(xs, m)),
  },
  "M6-cp-lo-alpha": {
    property: "cp-symmetry",
    mutant: "M6-cp-lo-alpha.diff",
    size: ({ k, n }) => k + n,
    isMinimal: ({ k, n }) => k === 0 && n === 1,
  },
};
export const DEFECT_IDS = Object.keys(DEFECTS);

/** Minimum size per defect (catalogue/ts.md). */
export const MIN_SIZE = { "M1-pct-len": 1, "M2-pct-mutates": 3, "M3-cp-k0lo": 1, "M4-nd-swap": 2, "M5-pct-overshoot": 3, "M6-cp-lo-alpha": 1 };
