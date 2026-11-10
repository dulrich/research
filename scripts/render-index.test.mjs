import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "render-index.mjs");
const SHELL = "# Research\n\nIntro.\n\n<!-- research-index:start -->\n<!-- research-index:end -->\n";
let dir;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(process.env.TMPDIR || "/dev/shm", "ri-"));
  fs.writeFileSync(path.join(dir, "README.md"), SHELL);
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

const run = (...args) => {
  const r = Bun.spawnSync(["bun", script, "--root", dir, ...args]);
  return { code: r.exitCode, out: r.stdout.toString(), err: r.stderr.toString() };
};
const readme = () => fs.readFileSync(path.join(dir, "README.md"), "utf8");
function project(name, { created = "2026-01-01", body = `# ${name}\n\nSummary of ${name}.\n`, notes } = {}) {
  fs.mkdirSync(path.join(dir, name), { recursive: true });
  fs.writeFileSync(path.join(dir, name, "README.md"), body);
  fs.writeFileSync(path.join(dir, name, "notes.md"), notes ?? `---\ncreated: ${created}\n---\n\nnotes\n`);
}

describe("render-index", () => {
  test("zero projects", () => {
    expect(run().code).toBe(0);
    expect(readme()).toContain("<!-- research-index:start -->\n## 0 research projects\n<!-- research-index:end -->");
  });

  test("ordering: date desc, then name asc", () => {
    project("b-old", { created: "2026-01-01" });
    project("z-new", { created: "2026-03-01" });
    project("a-new", { created: "2026-03-01" });
    run();
    const r = readme();
    expect(r).toContain("## 3 research projects");
    const order = ["a-new", "z-new", "b-old"].map((n) => r.indexOf(`](${n}/)`));
    expect(order[0]).toBeGreaterThan(0);
    expect(order[0]).toBeLessThan(order[1]);
    expect(order[1]).toBeLessThan(order[2]);
    expect(r).toContain("### [a-new](a-new/) (2026-03-01)\n\nSummary of a-new.\n\n### [z-new]");
  });

  test("exclusions", () => {
    project("keep");
    project(".hidden");
    project("scripts");
    project("var");
    fs.mkdirSync(path.join(dir, "no-readme"));
    run();
    expect(readme()).toContain("## 1 research projects");
    expect(readme()).not.toContain("hidden");
    expect(readme()).not.toContain("no-readme");
  });

  test("title fallback to folder name", () => {
    project("plain", { body: "Just text without a heading.\n" });
    run();
    expect(readme()).toContain("### [plain](plain/) (2026-01-01)");
  });

  test("summary skips headings, notes block, code; truncates at word boundary", () => {
    const long = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    project("s", {
      body: `# S\n\n<!-- hidden\ncomment -->\n\n> quote\n\n## Sub\n\n\`\`\`\ncode\n\`\`\`\n\n- item\n\n${long.slice(0, 60)}\n${long.slice(61)}\n`,
    });
    run();
    const lines = readme().split("\n");
    const sum = lines[lines.findIndex((l) => l.startsWith("### [S]")) + 2];
    expect(sum.startsWith("word0 word1")).toBe(true);
    expect(sum.endsWith("…")).toBe(true);
    expect([...sum].length).toBeLessThanOrEqual(280);
    expect(sum).not.toContain("quote");
    expect(sum).not.toContain("code");
  });

  test("missing created exits 1 naming the folder", () => {
    project("bad", { notes: "---\ntitle: x\n---\n" });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.err).toContain("render-index: bad:");
    expect(readme()).toBe(SHELL);
  });

  test("malformed calendar date exits 1", () => {
    project("bad", { created: "2026-02-30" });
    const r = run();
    expect(r.code).toBe(1);
    expect(r.err).toContain("bad");
  });

  test("missing notes.md exits 1 in check mode too", () => {
    project("bad");
    fs.rmSync(path.join(dir, "bad", "notes.md"));
    expect(run("--check").code).toBe(1);
  });

  test("write then --check passes", () => {
    project("p");
    expect(run().code).toBe(0);
    expect(run("--check").code).toBe(0);
  });

  test("stale: --check exits 1 and leaves the file unchanged", () => {
    project("p");
    const before = readme();
    const r = run("--check");
    expect(r.code).toBe(1);
    expect(r.err).toContain("stale");
    expect(readme()).toBe(before);
  });

  test("idempotent", () => {
    project("p");
    run();
    const first = fs.readFileSync(path.join(dir, "README.md"));
    run();
    expect(fs.readFileSync(path.join(dir, "README.md")).equals(first)).toBe(true);
  });

  test("--help prints usage and exits 0", () => {
    const r = run("--help");
    expect(r.code).toBe(0);
    expect(r.out).toContain("usage");
  });

  test("unknown argument exits 2", () => {
    expect(run("--bogus").code).toBe(2);
  });

  test("missing or duplicated markers exit 1", () => {
    fs.writeFileSync(path.join(dir, "README.md"), "# Research\n");
    expect(run().code).toBe(1);
    fs.writeFileSync(path.join(dir, "README.md"), SHELL + SHELL);
    expect(run().code).toBe(1);
  });
});
