// judge.mjs: pure verdict functions. Each takes the facts a check observed (and, where the contract is source
// text, that text) and returns { verdict, observed }. The vocabulary is fixed in verdicts.mjs; no function
// here knows what any earlier run produced.

const isInt = (v) => Array.isArray(v) && v.length === 1 && Number.isInteger(v[0]);

/** #1: Request::SetRoot(Some("-")) must survive to_line then parse. */
export function judgeSentinel({ line, roundtripEqual, parsed }) {
  const observed = `SetRoot(Some("-")).to_line() = ${line}; parse gives ${parsed}`;
  return { verdict: roundtripEqual ? "refuted" : "confirmed defect", observed };
}

/** #2: non-UTF-8 paths. `docSaysUtf8` is whether the to_line doc comment states the UTF-8 requirement. */
export function judgeNonUtf8({ verbs, docSaysUtf8 }) {
  const lossy = verbs.filter((v) => !v.roundtripEqual);
  const observed = verbs.map((v) => `${v.verb}: ${v.line} roundtrip_equal=${v.roundtripEqual}`).join("; ");
  if (lossy.length === 0) return { verdict: "refuted", observed };
  return { verdict: docSaysUtf8 ? "confirmed, out of contract" : "confirmed defect", observed };
}

/** #3: parseWidths. A width is a terminal column count; the range form accepts digits only. */
export function judgeParseWidths(w) {
  const accepted = ["1.5", "0x50", "1e2"].filter((k) => Array.isArray(w[k]));
  const observed = ["1.5", "0x50", "1e2", "80.0"].map((k) => `${k} -> ${JSON.stringify(w[k])}`).join("; ");
  const nonInteger = Array.isArray(w["1.5"]) && !isInt(w["1.5"]);
  return { verdict: accepted.length > 0 || nonInteger ? "confirmed defect" : "refuted", observed };
}

/** #4: parseProtocol. The contract says `<number>` without naming a radix, so acceptance is an owner decision. */
export function judgeParseProtocol(p) {
  const accepted = ["0x10", "0b11", "0o17"].filter((k) => typeof p[k] === "number");
  const observed = ["0x10", "0b11", "0o17", "1e3"].map((k) => `${k} -> ${p[k]}`).join("; ");
  return { verdict: accepted.length > 0 ? "needs owner decision" : "refuted", observed };
}

/** #5: hbytes. Suspicion: above 2^53 the float multiply loses integers. Also reports the decimal-input defect. */
export function judgeHbytes({ big, total, oneLow, other, first }) {
  const exact = big["9007199254740993B"] === "9007199254740993" && big["9007199254740993kB"] === "9007199254740993000";
  const observed = `9007199254740993B -> ${big["9007199254740993B"]}; 9007199254740993kB -> ${big["9007199254740993kB"]}`;
  const found = oneLow > 0 || other > 0
    ? { verdict: "confirmed defect", observed: `${oneLow} of ${total} w.fffU inputs (w 0..99, fff 000..999, U in kB MB GB) are one byte low, ${other} other mismatches; first ${first}` }
    : null;
  return { verdict: exact ? "refuted" : "confirmed defect", observed, found };
}

/** #6: ts on impossible calendar dates, against the comment that such a shape is an error. */
export function judgeTs(t) {
  const same = (a, b) => typeof t[a] === "number" && t[a] === t[b];
  const rolled = [["2023-02-29", "2023-03-01"], ["2023-02-30", "2023-03-02"], ["2023-04-31", "2023-05-01"]].filter(([a, b]) => same(a, b));
  const observed = rolled.map(([a, b]) => `${a} == ${b} (${t[a]})`).join("; ") || "all impossible dates rejected";
  return { verdict: rolled.length > 0 ? "confirmed defect" : "refuted", observed };
}

/** #7: path_join with a NULL argument. */
export function judgePathJoin({ signal, exit }) {
  const observed = signal ? `path_join("a", NULL): child killed by signal ${signal} (SIGSEGV is 11)` : `path_join("a", NULL): child exited ${exit}`;
  return { verdict: signal === 11 ? "confirmed defect" : "refuted", observed };
}

/** #8: strncache with an n shorter than the input. */
export function judgeStrncache({ samePointer, fillFirst, fillSecond }) {
  const observed = `two strncache("abcdef", 3) calls: same pointer ${samePointer}; fill ${fillFirst} then ${fillSecond}`;
  return { verdict: !samePointer && fillSecond > fillFirst ? "confirmed defect" : "refuted", observed };
}

/** #9: Codes::nearest. Read from source: no sort inside, and every caller sorts before use. */
export function judgeNearest({ selectsThenTruncates, sortsInside, callerSorts }) {
  const observed = `nearest ${selectsThenTruncates ? "uses select_nth_unstable then truncate" : "does not use select_nth_unstable"}; ${sortsInside ? "sorts inside" : "returns unsorted"}; its caller ${callerSorts ? "sort_unstable()s the result before use" : "does not sort the result"}`;
  const unsortedHarmful = selectsThenTruncates && !sortsInside && !callerSorts;
  return { verdict: unsortedHarmful ? "confirmed defect" : "refuted", observed };
}
