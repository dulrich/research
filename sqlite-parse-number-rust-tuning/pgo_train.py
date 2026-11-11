"""PGO training run: one extension, all three dataset kinds, in one process.

Usage: python3 pgo_train.py EXTENSION.so [ROWS]

Builds the mixed / int / real datasets (same value shapes as measure_one.py,
but its own fixed seed, SEED below, so the profile is never trained on the
rows that are timed), then runs `select sum(parse_number(v)) from t` over
each a few times. Profile data (gcda / profraw) is written by the
instrumented extension when the process exits; the build driver collects it.
"""
import random, sqlite3, sys

SEED = 20261111
REPEAT = 5


def gen(rnd, kind):
    n = rnd.uniform(-1e6, 1e6)
    if kind == "int":
        return f"${int(n):,}"
    if kind == "real":
        return f"${n:,.2f}"
    r = rnd.random()
    if r < 0.25: return f"${n:,.2f}"
    if r < 0.45: return f"£{int(n):,}"
    if r < 0.60: return f"{n/1e4:.1f}%"
    if r < 0.80: return str(int(n))
    if r < 0.90: return f"{n:,.3f}"
    return rnd.choice(["n/a", "", "TBD", "-", "12abc"])


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0 if len(sys.argv) > 1 else 2)
    ext = sys.argv[1]
    rows = int(sys.argv[2]) if len(sys.argv) > 2 else 100_000
    rnd = random.Random(SEED)
    db = sqlite3.connect(":memory:")
    db.enable_load_extension(True)
    db.load_extension(ext)
    for kind in ("mixed", "int", "real"):
        db.execute("drop table if exists t")
        db.execute("create table t(v text)")
        db.executemany("insert into t values (?)", ((gen(rnd, kind),) for _ in range(rows)))
        for _ in range(REPEAT):
            db.execute("select sum(parse_number(v)) from t").fetchone()
    db.close()


main()
