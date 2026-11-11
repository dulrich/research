// measure-channel.mjs — one persistent channel process (e.g. `ssh <host> sh -s`) serving every invocation of a run.
//
// Bootstrap: the driver writes one line to the channel's stdin, `exec sh -c '<LOOP>' measure-channel <nonce>`, and waits
// for `<nonce> ready`. Only then does it send requests, so the bootstrapping shell never buffers request bytes.
// Request:  `<seq> <base64 of a sh script>\n` (one line; the script runs as a fresh `sh` process, stdin </dev/null).
// Response: `<nonce> <seq> <exit> <stdout bytes> <stderr bytes>\n` followed by exactly that many stdout then stderr bytes.
// Framing is length-prefixed, so it never depends on output content; the per-run random nonce and the echoed sequence
// number are checked on every header, and any mismatch, EOF or timeout fails loudly (no retry, no coercion).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { shQuote } from "./measure-run.mjs";

/** The remote side: a POSIX (dash-dialect) sh loop using only coreutils (mktemp, base64, wc, cat, rm). */
export const LOOP = `n=$1
d=$(mktemp -d) || exit 97
trap 'rm -rf "$d"' EXIT
trap 'exit 98' HUP INT TERM
printf '%s ready\\n' "$n"
while IFS= read -r line; do
  s=\${line%% *}; b=\${line#* }
  if [ "$s" = "$line" ] || ! printf '%s\\n' "$b" | base64 -d >"$d/c" 2>/dev/null; then printf '%s badreq\\n' "$n"; exit 96; fi
  sh "$d/c" </dev/null >"$d/o" 2>"$d/e"; st=$?
  printf '%s %s %s %s %s\\n' "$n" "$s" "$st" "$(($(wc -c <"$d/o")))" "$(($(wc -c <"$d/e")))"
  cat "$d/o" "$d/e"
done
`;

export const bootstrapLine = (nonce) => `exec sh -c ${shQuote(LOOP)} measure-channel ${nonce}\n`;

const MAX_HEADER = 256;

export class Channel {
  #child; #buf = Buffer.alloc(0); #closed = false; #exit = null; #stderr = ""; #wake = null; #seq = 0; #timeoutMs; #broken = null;

  constructor(argv, { timeoutMs = 3600_000 } = {}) {
    this.argv = argv;
    this.nonce = randomBytes(16).toString("hex");
    this.#timeoutMs = timeoutMs;
  }

  /** Starts the channel process and completes the ready handshake; throws on failure. */
  async open() {
    try {
      this.#child = spawn(this.argv[0], this.argv.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
    } catch (e) { throw this.#fail(`cannot start ${this.argv[0]}: ${e.message}`); }
    const ping = () => { const w = this.#wake; this.#wake = null; w?.(); };
    this.#child.stdout.on("data", (d) => { this.#buf = Buffer.concat([this.#buf, d]); ping(); });
    this.#child.stderr.on("data", (d) => { this.#stderr = (this.#stderr + d.toString()).slice(-4000); });
    this.#child.on("error", (e) => { this.#exit ??= `error ${e.message}`; this.#closed = true; ping(); });
    this.#child.on("close", (code, sig) => { this.#exit ??= sig ? `signal ${sig}` : `exit ${code}`; this.#closed = true; ping(); });
    this.#child.stdin.on("error", () => {});
    this.#child.stdin.write(bootstrapLine(this.nonce));
    const line = await this.#line(Date.now() + this.#timeoutMs);
    if (line !== `${this.nonce} ready`) throw this.#fail(`bad handshake ${JSON.stringify(line.slice(0, 80))}`);
    return this;
  }

  #fail(msg) {
    const tail = this.#stderr.trim().split("\n").slice(-5).join(" | ");
    this.#broken ??= `channel ${msg}${this.#exit ? ` (channel ${this.#exit})` : ""}${tail ? `; channel stderr: ${tail}` : ""}`;
    return new Error(this.#broken);
  }

  #wait(deadline) {
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.#wake = null; reject(this.#fail(`timeout after ${this.#timeoutMs} ms`)); }, Math.max(0, deadline - Date.now()));
      this.#wake = () => { clearTimeout(t); resolve(); };
    });
  }

  async #line(deadline) {
    for (;;) {
      const i = this.#buf.indexOf(10);
      if (i >= 0 && i <= MAX_HEADER) { const s = this.#buf.subarray(0, i).toString("latin1"); this.#buf = this.#buf.subarray(i + 1); return s; }
      if (i > MAX_HEADER || (i < 0 && this.#buf.length > MAX_HEADER)) throw this.#fail("framing error: oversized header");
      if (this.#closed) throw this.#fail("lost (EOF while waiting for a frame header)");
      await this.#wait(deadline);
    }
  }

  async #bytes(n, deadline) {
    while (this.#buf.length < n) {
      if (this.#closed) throw this.#fail(`lost (EOF after ${this.#buf.length} of ${n} payload bytes)`);
      await this.#wait(deadline);
    }
    const s = this.#buf.subarray(0, n);
    this.#buf = this.#buf.subarray(n);
    return s;
  }

  /** Runs one sh script as a fresh remote process; resolves { stdout, stderr, status } or throws (channel broken for good). */
  async run(script) {
    if (this.#broken) throw new Error(this.#broken);
    if (this.#closed) throw this.#fail("lost before request");
    const seq = ++this.#seq;
    const deadline = Date.now() + this.#timeoutMs;
    this.#child.stdin.write(`${seq} ${Buffer.from(script).toString("base64")}\n`);
    const h = await this.#line(deadline);
    const m = /^([0-9a-f]+) (\d+) (\d+) (\d+) (\d+)$/.exec(h);
    if (!m || m[1] !== this.nonce || Number(m[2]) !== seq) throw this.#fail(`framing error: unexpected header ${JSON.stringify(h.slice(0, 80))} for request ${seq}`);
    const out = await this.#bytes(Number(m[4]), deadline);
    const err = await this.#bytes(Number(m[5]), deadline);
    return { stdout: out.toString("utf8"), stderr: err.toString("utf8"), status: Number(m[3]) };
  }

  invocationScript(argv, pad) { return invocationScript(argv, pad); }

  /** Ends the channel: EOF on stdin ends the remote loop; kills it if it does not exit within 5 s. */
  async close() {
    if (!this.#child) return;
    this.#child.stdin.end();
    const deadline = Date.now() + 5000;
    while (!this.#closed && Date.now() < deadline) await this.#wait(deadline).catch(() => {});
    if (!this.#closed) this.#child.kill("SIGKILL");
  }
}

/** The per-invocation remote script: per-invocation env, then exec of the quoted variant argv. */
export const invocationScript = (argv, pad) => `export MEASURE_PAD=${shQuote(pad)}\nexec ${argv.map(shQuote).join(" ")}\n`;
