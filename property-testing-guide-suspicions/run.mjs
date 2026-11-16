#!/usr/bin/env bun
// run.mjs: clones the pinned targets (setup, host) and runs every suspicion check inside the container (run).
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const USAGE = `usage: run.mjs setup [--src DIR]
       run.mjs run [--out FILE]
       run.mjs --help | --build | --version

setup   host side. Clones each target repo from DIR/<repo> (default: the directory that holds this repository)
        into the gitignored runs/spike/ptgs/<repo> and checks out the pinned commit; creates runs/spike/ptgs-work (cargo
        home, target dir, probe binary) so the container never creates root-owned mount sources.
run     builds nothing itself: runs "docker compose run --rm checks" (as the host user), which executes all nine
        checks inside the image and leaves their rows in runs/spike/ptgs-work/rows.jsonl; then writes the rows to FILE
        (default results/verdicts.jsonl) and the table next to it (verdicts.md beside FILE, only for the
        default FILE). Build the image first with: docker compose -f property-testing-guide-suspicions/compose.yaml build
Run from the repository root. Targets are never edited: the Rust check applies a diff to its clone and reverts it.
`;

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.length === 0) {
  process.stdout.write(USAGE);
  process.exit(0);
}
const FOLDER = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(FOLDER, "..");
if (argv.includes("--build") || argv.includes("--version")) {
  const { handleBuildFlags } = await import("../scripts/lib/build-id.mjs");
  process.exit(handleBuildFlags(argv, { path: import.meta.filename, name: "run" }) ?? 0);
}

const IN_CONTAINER = process.env.PTGS_IN_CONTAINER === "1";
const VAR = IN_CONTAINER ? "/work/runs/spike" : join(ROOT, "runs", "spike");
const CLONES = join(VAR, "ptgs");
const WORK = join(VAR, "ptgs-work");
const PINS = {
  "crucible-dev-env": "26f69da8",
  "crucible-tui": "65366f95",
  research: "af40b1fc",
  scripts: "f1b20d5c",
  semsearch: "17b39b5a",
};
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : dflt;
};
const sh = (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: "utf8", ...o });
const cmd = argv[0];

if (cmd === "setup") {
  const src = resolve(opt("--src", dirname(ROOT)));
  mkdirSync(CLONES, { recursive: true });
  mkdirSync(join(WORK, "home"), { recursive: true });
  for (const [repo, commit] of Object.entries(PINS)) {
    const dest = join(CLONES, repo);
    if (!existsSync(dest)) {
      const c = sh("git", ["clone", "--quiet", join(src, repo), dest]);
      if (c.status !== 0) throw new Error(`clone ${repo} failed: ${c.stderr}`);
    }
    for (const a of [["checkout", "--quiet", "--force", commit], ["clean", "-fdq"]]) {
      const r = sh("git", ["-C", dest, ...a]);
      if (r.status !== 0) throw new Error(`git ${a.join(" ")} in ${repo} failed: ${r.stderr}`);
    }
    console.log(`${repo} @ ${sh("git", ["-C", dest, "rev-parse", "--short=8", "HEAD"]).stdout.trim()}`);
  }
} else if (cmd === "run") {
  const out = resolve(opt("--out", join(FOLDER, "results", "verdicts.jsonl")));
  const rows = join(WORK, "rows.jsonl");
  rmSync(rows, { force: true });
  const env = { ...process.env, PTGS_UID: String(process.getuid()), PTGS_GID: String(process.getgid()) };
  const r = sh("docker", ["compose", "-f", join(FOLDER, "compose.yaml"), "run", "--rm", "checks"], { env, stdio: ["ignore", "inherit", "inherit"] });
  if (r.status !== 0 || !existsSync(rows)) throw new Error(`container run failed (status ${r.status})`);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(rows, out);
  const { table } = await import("./checks/verdicts.mjs");
  const mdPath = join(dirname(out), "verdicts.md");
  if (out === join(FOLDER, "results", "verdicts.jsonl")) {
    const parsed = readFileSync(out, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    writeFileSync(mdPath, table(parsed));
    console.log(`wrote ${relative(ROOT, out)} and ${relative(ROOT, mdPath)}`);
  } else console.log(`wrote ${relative(ROOT, out)}`);
} else if (cmd === "run-inner") {
  if (!IN_CONTAINER) throw new Error("run-inner is the container entrypoint; use `run`");
  const { runAll } = await import("./checks/all.mjs");
  const rows = await runAll({ clones: CLONES, work: WORK, folder: FOLDER });
  writeFileSync(join(WORK, "rows.jsonl"), rows.map((x) => JSON.stringify(x)).join("\n") + "\n");
  for (const x of rows) console.log(`${x.id}\t${x.verdict}\t${x.observed}`);
} else {
  process.stderr.write(USAGE);
  process.exit(2);
}
