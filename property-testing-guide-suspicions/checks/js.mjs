// js.mjs <crucible-tui clone> <research clone>: imports the two JS/TS targets from their pinned clones and
// prints one JSON object with what they return for the probe inputs.
import { join } from "node:path";
const [tui, research] = process.argv.slice(2);
const { parseWidths } = await import(join(tui, "scripts", "sweep-options.ts"));
const { parseProtocol } = await import(join(research, "scripts", "lib", "measure-run.mjs"));
const out = { parseWidths: {}, parseProtocol: {} };
for (const v of ["80", "1.5", "1e2", "0x50", "80.0", "Infinity", "0", "-5"]) {
  try { out.parseWidths[v] = parseWidths(v); } catch (e) { out.parseWidths[v] = `throws: ${e.message}`; }
}
for (const v of ["10", "0x10", "0b11", "0o17", "1e3", "abc", "NaN"]) {
  const r = parseProtocol(`MEASURE m ${v} ms`);
  out.parseProtocol[v] = r.errors.length ? "error" : r.metrics.m.value;
}
console.log(JSON.stringify(out));
