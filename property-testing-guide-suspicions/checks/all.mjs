// all.mjs: runs the nine checks inside the container and returns one verdict row each.
import { spawnSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import * as J from "./judge.mjs";

const run = (cmd, args, o = {}) => {
  const r = spawnSync(cmd, args, { encoding: "utf8", maxBuffer: 1 << 26, ...o });
  return { status: r.status, out: (r.stdout ?? "") + (r.stderr ?? ""), stdout: r.stdout ?? "" };
};
const need = (r, what) => {
  if (r.status !== 0) throw new Error(`${what} failed (status ${r.status}):\n${r.out}`);
  return r;
};
const kv = (line) => Object.fromEntries([...line.matchAll(/(\w+)=("(?:[^"\\]|\\.)*"|\S+)/g)].map((m) => [m[1], m[2]]));
const lines = (out, tag) => out.split("\n").filter((l) => l.includes(`${tag} `)).map((l) => l.slice(l.indexOf(`${tag} `)));
const lineNo = (text, needle) => text.split("\n").findIndex((l) => l.includes(needle)) + 1;

export async function runAll({ clones, work, folder }) {
  const cde = join(clones, "crucible-dev-env");
  const tui = join(clones, "crucible-tui");
  const res = join(clones, "research");
  const scr = join(clones, "scripts");
  const sem = join(clones, "semsearch");
  mkdirSync(join(work, "home"), { recursive: true });
  const rows = [];
  const row = (id, repo, anchor, contract, r, extra = {}) => rows.push({ id, repo, anchor, verdict: r.verdict, observed: r.observed, contract, ...extra });

  // 1 and 2: the Rust test module, applied to the clone and reverted afterwards.
  const ipcPath = join(cde, "crates/crucible-compositor/src/ipc.rs");
  const ipcSrc = readFileSync(ipcPath, "utf8");
  need(run("git", ["-C", cde, "apply", join(folder, "checks", "ipc.diff")]), "git apply ipc.diff");
  let cargo;
  try {
    cargo = run("cargo", ["test", "-q", "-p", "crucible-compositor", "--lib", "ptgs_", "--", "--nocapture", "--test-threads=1"], { cwd: cde });
  } finally {
    need(run("git", ["-C", cde, "checkout", "--", "."]), "git checkout (revert ipc.diff)");
  }
  need(cargo, "cargo test");
    const sent = lines(cargo.out, "PTGS").find((l) => l.startsWith("PTGS sentinel"));
  const sk = kv(sent.replace("parsed=", "parsed_text="));
  const parsedText = /parsed=(.*) roundtrip_equal=/.exec(sent)[1];
  row("1", "crucible-dev-env", "crates/crucible-compositor/src/ipc.rs:207 (parse), :233 (to_line)",
    "Module doc (ipc.rs:22): `root <path>` / `root -` sets / clears the root; the codec (`encode_field`, crucible-persist field.rs:8) escapes only %, :, TAB, LF, CR, so a path named `-` has no distinct wire form.",
    J.judgeSentinel({ line: sk.line, roundtripEqual: sk.roundtrip_equal === "true", parsed: parsedText }));
  const verbs = lines(cargo.out, "PTGS").filter((l) => l.startsWith("PTGS nonutf8")).map((l) => {
    const k = kv(l);
    return { verb: k.verb, line: k.line, roundtripEqual: k.roundtrip_equal === "true" };
  });
  const docSaysUtf8 = /Paths must be UTF-8 \(lossy otherwise\)/.test(ipcSrc.replace(/\n\s*\/\/\/\s*/g, " "));
  row("2", "crucible-dev-env", "crates/crucible-compositor/src/ipc.rs:228-238 (to_line, doc at :217)",
    "`Request::to_line` doc (ipc.rs:217): \"Paths must be UTF-8 (lossy otherwise).\"",
    J.judgeNonUtf8({ verbs, docSaysUtf8 }));

  // 3 and 4: JS/TS imported from the clones.
  const js = JSON.parse(need(run("bun", [join(folder, "checks", "js.mjs"), tui, res]), "js.mjs").stdout.trim().split("\n").pop());
  row("3", "crucible-tui", "scripts/sweep-options.ts:42 (parseWidths)",
    "Doc (sweep-options.ts:31): a `--widths` value is a comma list (`80,100,160`), an inclusive range (`40-360`), or a mix; the range form accepts digits only, and widths are terminal columns.",
    J.judgeParseWidths(js.parseWidths));
  row("4", "research", "scripts/lib/measure-run.mjs:79 (parseProtocol)",
    "`measure.mjs --help` and methods/timing.md:108: the experiment prints `MEASURE <metric> <number> [unit]`; the text does not name a radix or exponent form.",
    J.judgeParseProtocol(js.parseProtocol));

  // 5 and 6: Perl against the clone's module.
  const inc = `-I${join(scr, "util/cache-prune/perl")}`;
  const hb = need(run("perl", [inc, join(folder, "checks", "hbytes.pl")]), "hbytes.pl").stdout;
  const big = Object.fromEntries(/^BIG (.*)$/m.exec(hb)[1].split(" ").map((p) => p.split("=")));
  const en = kv(/^ENUM (.*)$/m.exec(hb)[1].replace(/first=(.*)$/, (_, f) => `first="${f}"`));
  const h = J.judgeHbytes({ big, total: Number(en.total), oneLow: Number(en.one_low), other: Number(en.other_mismatch_or_undef), first: en.first.replaceAll('"', "") });
  row("5", "scripts", "util/cache-prune/perl/CachePrune/DockerResidue.pm:58 (hbytes)",
    "Comment (DockerResidue.pm:53): hbytes is \"a decimal human size ... -> integer bytes\"; the suspicion is a loss above 2^53. The decimal-input finding is judged against the same sentence: the integer of the decimal size.",
    { verdict: h.verdict, observed: h.observed }, h.found ? { found_by_check: h.found } : {});
  const tsOut = need(run("perl", [inc, join(folder, "checks", "ts.pl")]), "ts.pl").stdout;
  const t = Object.fromEntries(lines(tsOut, "TS").map((l) => { const [, d, v] = l.split(" "); return [d, v === "error" || v === "undef" ? v : Number(v)]; }));
  row("6", "scripts", "util/cache-prune/perl/CachePrune/DockerResidue.pm:106 (ts)",
    "Comment (DockerResidue.pm:104-105): \"A shape that matches but is no calendar time is an error, as in jq.\"",
    J.judgeTs(t));

  // 7 and 8: the C probe against the clone's single translation unit.
  const bin = join(work, "probe");
  need(run("gcc", ["-O0", "-w", `-DBUILD_C="${join(scr, "tools/build_system/_build.c")}"`, join(folder, "checks", "probe.c"), "-o", bin, "-lutil"]), "gcc probe.c");
  const pr = need(run(bin, []), "probe").stdout;
  const pj = kv(lines(pr, "PROBE").find((l) => l.startsWith("PROBE path_join_null")));
  const pjSrc = readFileSync(join(scr, "tools/build_system/parts/string.c"), "utf8");
  const sc = kv(lines(pr, "PROBE").find((l) => l.startsWith("PROBE strncache same_pointer")));
  const gccSrc = readFileSync(join(scr, "tools/build_system/parts/gcc.c"), "utf8");
  row("7", "scripts", `tools/build_system/parts/string.c:${lineNo(pjSrc, "char* path_join_(size_t nargs, ...) {")} (path_join_)`,
    "The first loop guards `if(s)` before `strlen(s)`, so a NULL argument is tolerated there; the second loop calls `strlen(s)` before its own `if (s)` check. No doc states NULL is forbidden.",
    J.judgePathJoin({ signal: pj.signal ? Number(pj.signal) : 0, exit: pj.exit }),
    { reachability_from_reading: "No caller found that passes NULL: _build.c:196 (source_dir is a literal, sources[i] is non-NULL by the loop condition), init.c:58 and :61 (literal and calloc'd strings), gcc.c:94-95 (dir_name and base_name return strcache results, never NULL), fs.c:260 and :276 (a dirent name). Latent, not reachable from the callers read." });
  row("8", "scripts", `tools/build_system/parts/strcache.c:117 (strncache); lookup at :49-:58`,
    "Signature `strncache(char* in, size_t n)` interns the first n bytes of `in`; `string_cache_find_bucket` compares the full `in` with `strcmp` against the stored n-byte copy, so a key longer than n never matches.",
    J.judgeStrncache({ samePointer: sc.same_pointer === "1", fillFirst: Number(sc.fill_after_first), fillSecond: Number(sc.fill_after_second) }),
    { reachability_from_reading: `Reachable: gcc.c:${lineNo(gccSrc, "strncache(s, dlen)")} calls strncache(s, dlen) where s points into the remaining dependency text and dlen is the length of one path (span_path), so for every path that is not the last on the text the key is a longer string than n and never hits the cache; each such path adds a bucket and strndup'd copy (the cache grows, and equal paths are not shared).` });

  // 9: reading check on the semsearch source.
  const vec = readFileSync(join(sem, "crates/semsearch/src/vector.rs"), "utf8");
  const start = vec.indexOf("pub fn nearest(");
  const body = vec.slice(start, vec.indexOf("\n    }\n", start));
  const search = readFileSync(join(sem, "crates/semsearch/src/search.rs"), "utf8");
  const callIdx = search.indexOf("self.vectors.nearest(");
  const after = search.slice(callIdx, callIdx + 200);
  row("9", "semsearch", `crates/semsearch/src/vector.rs:${lineNo(vec, "pub fn nearest(")} (Codes::nearest); caller search.rs:${lineNo(search, "self.vectors.nearest(")}-${lineNo(search, "candidates.sort_unstable()")}`,
    "Doc: \"The `pool` nearest rowids by Hamming distance (ties: lower rowid first)\" names which rowids are selected, not an output order; the only caller sorts before use. Reading check, not a run.",
    J.judgeNearest({ selectsThenTruncates: /select_nth_unstable\(/.test(body) && /truncate\(/.test(body), sortsInside: /\.sort/.test(body.replace("select_nth_unstable", "")), callerSorts: /candidates\.sort_unstable\(\)/.test(after) }),
    { method: "reading" });
  return rows;
}
