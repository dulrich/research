"""Cross-build equivalence: every build against the c-fast reference build.

Usage: python3 equivalence.py VARIANTS_FILE [ROWS]

VARIANTS_FILE has `<name> <path-to-.so>` lines (`#` lines ignored), as written
by build_r5.py. Generates ROWS (default 250,000) input strings from a fixed
seed: a fixed list of edge strings (empty, whitespace, signs, hex, huge
exponents, NaN/inf text, overlong digit runs, non-ASCII, int64 limits) plus
random junk, decimals of 1-25 significant digits and near-halfway doubles.
Each build must return bitwise-identical values *and* SQL types for every row
(-0.0 and integer-versus-real are distinguished). Prints one line per build and
a summary; exit status 1 on any mismatch.
"""
import random, sqlite3, struct, sys

EDGES = [
    "", " ", "\t\n\r ", "  42  ", "+5", "-5", "--5", "5-", "+-5", "-+5", "-", "+", ".", "-.", ".5", "5.", "-.5e", "0", "-0", "-0.0",
    "000", "007", "0x1F", "0X10", "0b101", "0o17", "1e5", "1E5", "1e-5", "1e999", "-1e999", "1e-999", "1e+308", "1.7976931348623157e308",
    "9" * 400, "1" + "0" * 400, "0." + "0" * 400 + "1", "1" * 100 + ".5", "." + "9" * 300, "9" * 300 + ".",
    "nan", "NaN", "inf", "-inf", "Infinity", "-Infinity", "NULL", "null", "TRUE",
    "9223372036854775807", "9223372036854775808", "-9223372036854775808", "-9223372036854775809", "18446744073709551616",
    "9007199254740993", "9007199254740992.5", "0.1", "0.30000000000000004", "123456789012345678901234567890",
    "$1,234.50", "£1,000,000", "12.5%", "$-5", "-$5", "$$5", "1,2,3", ",,,", "$", "%", "£", "1 000", "1.2.3", "12abc",
    "€5", "Â", "é", "１２３", "٣", "5 ", " 5", "🙂", "1\x00", "\x001", "1\x0b", "\x0c1", "1_000",
    "0.0000000000000000000000001", "1" * 17, "1" * 18 + "." + "1" * 18, "4.35", "2.5%", "99.99%",
]


def reference_free_gen(rnd):
    r = rnd.random()
    if r < 0.4:
        return "".join(rnd.choice("0123456789.-,$%£ x+eE\t") for _ in range(rnd.randint(0, 14)))
    if r < 0.8:
        digits = "".join(rnd.choice("0123456789") for _ in range(rnd.randint(1, 25)))
        p = rnd.randint(0, len(digits))
        s = digits[:p] + "." + digits[p:]
        if rnd.random() < 0.3:
            s = "0." + "0" * rnd.randint(0, 25) + digits
        return rnd.choice(["", "-", "$", "-$", "£", "+", " "]) + s + rnd.choice(["", "%", "  ", ".", "e3"])
    m = rnd.randint(2**52, 2**54)
    k = rnd.randint(0, 25)
    s = str(m).rjust(k + 1, "0")
    return s[:-k] + "." + s[-k:] if k else s


def key(v):
    if isinstance(v, float):
        return ("f", struct.pack("<d", v))
    return (type(v).__name__, v)


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if len(sys.argv) > 1 else 2)
    builds = [tuple(l.split()) for l in open(sys.argv[1]) if l.strip() and not l.startswith("#")]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 250_000
    rnd = random.Random(20261112)
    inputs = list(EDGES) + [reference_free_gen(rnd) for _ in range(n - len(EDGES))]
    ref_path = "/work/c-fast/parse_number.so"

    def outputs(path):
        db = sqlite3.connect(":memory:")
        db.enable_load_extension(True)
        db.load_extension(path)
        db.execute("create table t(i integer primary key, v text)")
        db.executemany("insert into t(v) values (?)", ((s,) for s in inputs))
        out = [key(r[0]) for r in db.execute("select parse_number(v) from t order by i")]
        db.close()
        return out

    want = outputs(ref_path)
    nulls = sum(1 for w in want if w == ("NoneType", None))
    print(f"reference c-fast: {len(inputs)} rows ({len(EDGES)} edge strings), {nulls} NULL, {len(inputs) - nulls} numeric")
    total = 0
    for name, path in builds:
        got = outputs(path)
        bad = [i for i in range(len(inputs)) if got[i] != want[i]]
        total += len(bad)
        print(f"{name:44} {len(inputs) - len(bad)}/{len(inputs)} match", *[f"\n   {inputs[i]!r}: want {want[i]} got {got[i]}" for i in bad[:3]])
    print(f"SUMMARY builds={len(builds)} rows={len(inputs)} mismatches={total}")
    sys.exit(1 if total else 0)


main()
