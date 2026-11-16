import { expect, test } from "bun:test";
import { parseTail, schedule, scanTrace, summarize, violatedNames } from "./run.mjs";

test("parseTail reads reason, exit code and throughput", () => {
  expect(parseTail("\nExited after time limit hit\nThroughput (state samples/sec): 88.7\n")).toMatchObject({ reason: "time-limit", code: null, throughput: 88.7 });
  expect(parseTail("Exited as process terminated with exit code 0\n")).toMatchObject({ reason: "program-exit", code: 0 });
  expect(parseTail("Exited as process terminated with exit code 2\n").code).toBe(2);
  expect(parseTail("Exited due to violation\n").reason).toBe("violation");
  expect(parseTail("garbage").reason).toBe("unknown");
});

test("violatedNames skips clean lines and names violations", () => {
  expect(violatedNames('{"timestamp":1,"violations":[]}')).toEqual([]);
  expect(violatedNames('{"timestamp":1,"violations":[{"name":"a"},{"name":"b"}]}')).toEqual(["a", "b"]);
});

test("scanTrace finds first violation and span", async () => {
  const lines = ['{"timestamp":1000000,"violations":[]}', '{"timestamp":2000000,"violations":[{"name":"p"}]}', '{"timestamp":4000000,"violations":[{"name":"p"}]}'];
  async function* gen() { yield* lines; }
  const r = await scanTrace(gen());
  expect(r.states).toBe(3);
  expect(r.spanS).toBe(3);
  expect(r.first.p).toEqual({ index: 1, s: 1 });
  expect(r.count.p).toBe(2);
});

test("summarize counts runs per property", () => {
  const rows = [0, 1, 2].map((i) => ({ arm: "x", exit_reason: "time-limit", duration_s: 10, states: 5, throughput: 1, first_violation_s: i === 0 ? { noReplacementChars: 2 } : {} }));
  const [a] = summarize(rows);
  const p = a.perProp.find((q) => q.property === "noReplacementChars");
  expect([p.k, p.n, p.medianS]).toEqual([1, 3, 2]);
  expect(a.perProp.find((q) => q.property === "exitSuccess").k).toBe(0);
});

test("schedule covers every arm once per round, deterministically", () => {
  const a = schedule(["a", "b", "c"], 4, 7);
  expect(a.length).toBe(12);
  for (let r = 0; r < 4; r++) expect(a.filter((j) => j.round === r).map((j) => j.arm).sort()).toEqual(["a", "b", "c"]);
  expect(schedule(["a", "b", "c"], 4, 7)).toEqual(a);
});
