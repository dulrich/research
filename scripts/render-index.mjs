#!/usr/bin/env bun
// render-index.mjs — regenerate (or --check) the research index block in the root README.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleBuildFlags } from "./lib/build-id.mjs";

const START = "<!-- research-index:start -->";
const END = "<!-- research-index:end -->";
const EXCLUDED = new Set(["scripts", "plans", "references", "runs", "reviews", "node_modules", "var", "methods"]);
const USAGE = `usage: render-index.mjs [--check] [--root <dir>]

Regenerates the research index block between the research-index markers in README.md.
  --check        write nothing; exit 0 if the index is current, 1 if stale
  --root <dir>   repository root (default: parent of scripts/)
  --help         show this usage
  --build        print the tool build id
  --version      print the tool build id
`;

class Fail extends Error {}

export function validDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** `created` from notes.md frontmatter; throws Fail with a reason. */
export function parseCreated(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== "---") throw new Fail("notes.md has no frontmatter");
  const close = lines.indexOf("---", 1);
  if (close < 0) throw new Fail("notes.md frontmatter is not closed");
  for (const line of lines.slice(1, close)) {
    const m = /^created:\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const v = m[1].replace(/^(["'])(.*)\1$/, "$2");
    if (!validDate(v)) throw new Fail(`notes.md created is not a valid YYYY-MM-DD date: ${m[1]}`);
    return v;
  }
  throw new Fail("notes.md frontmatter has no created key");
}

export function parseTitle(readme, fallback) {
  for (const line of readme.split(/\r?\n/)) if (line.startsWith("# ")) return line.slice(2).trim() || fallback;
  return fallback;
}

export function truncate(s, max = 280) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > 0 ? cut.slice(0, sp) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

export function parseSummary(readme) {
  const lines = readme.split(/\r?\n/);
  let i = lines.findIndex((l) => l.startsWith("# ")) + 1;
  const para = [];
  let fence = null;
  let comment = false;
  for (; i < lines.length; i++) {
    const t = lines[i].trim();
    if (comment) {
      if (t.includes("-->")) comment = false;
      continue;
    }
    if (fence) {
      if (t.startsWith(fence)) fence = null;
      continue;
    }
    const f = /^(```+|~~~+)/.exec(t);
    const skip = t === "" || f || /^(#|<|>|\||!\[|\[!\[)/.test(t) || /^([-*+]|\d+[.)])\s/.test(t);
    if (!skip) {
      para.push(t);
      continue;
    }
    if (para.length) break;
    if (f) fence = f[1];
    else if (t.startsWith("<!--") && !t.includes("-->")) comment = true;
  }
  return truncate(para.join(" "));
}

export function collectProjects(root) {
  const out = [];
  for (const ent of fs.readdirSync(root, { withFileTypes: true })) {
    const name = ent.name;
    if (!ent.isDirectory() || name.startsWith(".") || EXCLUDED.has(name)) continue;
    const readmePath = path.join(root, name, "README.md");
    if (!fs.existsSync(readmePath)) continue;
    const notes = path.join(root, name, "notes.md");
    let date;
    try {
      if (!fs.existsSync(notes)) throw new Fail("missing notes.md");
      date = parseCreated(fs.readFileSync(notes, "utf8"));
    } catch (e) {
      if (e instanceof Fail) throw new Fail(`${name}: ${e.message}`);
      throw e;
    }
    const readme = fs.readFileSync(readmePath, "utf8");
    out.push({ name, date, title: parseTitle(readme, name), summary: parseSummary(readme) });
  }
  out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return out;
}

export function renderBlock(projects) {
  const parts = [START, `## ${projects.length} research projects`];
  for (const p of projects) {
    parts.push("", `### [${p.title}](${p.name}/) (${p.date})`);
    if (p.summary) parts.push("", p.summary);
  }
  parts.push(END);
  return parts.join("\n");
}

/** Replace the marker region of `readme`; throws Fail if markers are missing or duplicated. */
export function replaceRegion(readme, block) {
  const count = (s) => readme.split(s).length - 1;
  if (count(START) !== 1 || count(END) !== 1) throw new Fail("README.md must contain exactly one start and one end research-index marker");
  const a = readme.indexOf(START);
  const b = readme.indexOf(END);
  if (b < a) throw new Fail("README.md research-index markers are out of order");
  return readme.slice(0, a) + block + readme.slice(b + END.length);
}

function main(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(USAGE);
    return 0;
  }
  const rc = handleBuildFlags(argv, { path: fileURLToPath(import.meta.url), name: "render-index" });
  if (rc !== null) return rc;
  let check = false;
  let root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--check") check = true;
    else if (argv[i] === "--root" && i + 1 < argv.length) root = path.resolve(argv[++i]);
    else {
      process.stderr.write(`render-index: unknown argument: ${argv[i]}\n${USAGE}`);
      return 2;
    }
  }
  try {
    const block = renderBlock(collectProjects(root));
    const readmePath = path.join(root, "README.md");
    const cur = fs.readFileSync(readmePath, "utf8");
    const next = replaceRegion(cur, block);
    if (check) {
      if (next === cur) return 0;
      process.stderr.write("render-index: README.md index is stale — run: bun scripts/render-index.mjs\n");
      return 1;
    }
    if (next !== cur) fs.writeFileSync(readmePath, next);
    return 0;
  } catch (e) {
    if (e instanceof Fail || e?.code === "ENOENT") {
      process.stderr.write(`render-index: ${e.message}\n`);
      return 1;
    }
    throw e;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
