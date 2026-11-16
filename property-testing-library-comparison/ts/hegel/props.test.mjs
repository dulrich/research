// Green baseline: with no mutant applied (default PTLC_TARGET) every property passes at 200 cases.
import { test, expect } from "bun:test";
import { runProp } from "./props.mjs";
import { PROP_IDS } from "../checks.mjs";

const TIMEOUT_MS = 60000; // bun test defaults to 5 s per test; clopperPearson bisects 200 times per bound
for (const id of PROP_IDS) {
  test(`baseline: ${id} passes`, async () => {
    const r = await runProp(id, { seed: 0, testCases: 200 });
    expect(r.counterexample).toBe("");
    expect(r.detected).toBe(0);
  }, TIMEOUT_MS);
}
