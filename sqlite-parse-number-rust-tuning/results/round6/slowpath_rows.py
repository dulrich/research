"""How many rows of the upstream benchmark datasets (and of the upstream fuzz
generator) reach the slow path of rust-safe's parse_number?

A port of the decision logic of rust-safe/parse.rs: the same scan (digit,
',' '$' '%' and the two bytes of '£' skipped, one '.', a leading '-'), then
  - no '.', at most 19 significant digits, value fits i64  -> integer, no slow path
  - '.', at most 19 significant digits, significand <= 2^53, <= 22 fraction digits
                                                           -> one exact division
  - everything else                                        -> slow path (parse_slow)
The dataset generators are copied verbatim from the upstream bench.py (seed 1,
2,000,000 rows) and fuzz.py (seeds 0-3, 500,000 inputs).

Usage: python3 slowpath_rows.py
"""
import argparse
import os
import random
import sys

def classify(s):
    b = s.encode().strip(b" \t\n\r")
    mant = nsig = ndigits = frac = 0
    seen_dot = neg = emitted = False
    i = 0
    while i < len(b):
        c = b[i]; i += 1
        if 48 <= c <= 57:
            ndigits += 1
            frac += seen_dot
            if mant or c != 48:
                if nsig < 19:
                    mant = mant * 10 + (c - 48)
                nsig += 1
            emitted = True
        elif c in b",$%":
            pass
        elif c == 0xC2 and i < len(b) and b[i] == 0xA3:
            i += 1
        elif c == 0x2E and not seen_dot:
            seen_dot = emitted = True
        elif c == 0x2D and not emitted:
            neg = emitted = True
        else:
            return "invalid"
    if ndigits == 0:
        return "invalid"
    if not seen_dot:
        if nsig <= 19 and (mant < 2**63 or (neg and mant == 2**63)):
            return "int"
    elif nsig <= 19 and mant <= 2**53 and frac <= 22:
        return "fast"
    return "slow"

def bench_gen(kind):
    def gen():
        n = random.uniform(-1e6, 1e6)
        if kind == "int":
            return f"${int(n):,}"
        if kind == "real":
            return f"${n:,.2f}"
        r = random.random()
        if r < 0.25: return f"${n:,.2f}"
        if r < 0.45: return f"£{int(n):,}"
        if r < 0.60: return f"{n/1e4:.1f}%"
        if r < 0.80: return str(int(n))
        if r < 0.90: return f"{n:,.3f}"
        return random.choice(["n/a", "", "TBD", "-", "12abc"])
    return gen

def fuzz_gen(seed):
    rnd = random.Random(seed)
    def gen():
        r = rnd.random()
        if r < 0.4:
            return "".join(rnd.choice("0123456789.-,$%£ x") for _ in range(rnd.randint(0, 12)))
        if r < 0.8:
            digits = "".join(rnd.choice("0123456789") for _ in range(rnd.randint(1, 25)))
            p = rnd.randint(0, len(digits))
            s = digits[:p] + "." + digits[p:]
            if rnd.random() < 0.3: s = "0." + "0" * rnd.randint(0, 25) + digits
            return rnd.choice(["", "-", "$", "-$", "£"]) + s + rnd.choice(["", "%", "  "])
        m = rnd.randint(2**52, 2**54)
        k = rnd.randint(0, 25)
        s = str(m).rjust(k + 1, "0")
        return s[:-k] + "." + s[-k:] if k else s
    return gen

def tally(gen, n):
    t = {"int": 0, "fast": 0, "slow": 0, "invalid": 0}
    for _ in range(n):
        t[classify(gen())] += 1
    return t

def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    if "--help" not in sys.argv[1:] and "-h" not in sys.argv[1:]:
        sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
        from build_id import handle_build_flags
        rc = handle_build_flags(sys.argv[1:], __file__, name="slowpath_rows", semver=None)
        if rc is not None:
            sys.exit(rc)
    ap.parse_args()
    print("# rows reaching parse_slow (rust-safe parse.rs decision logic, replicated)")
    for kind in ("mixed", "int", "real"):
        random.seed(1)
        t = tally(bench_gen(kind), 2_000_000)
        print(f"bench {kind:5} rows=2000000 slow={t['slow']} (integer-path={t['int']} exact-division={t['fast']} invalid={t['invalid']})")
    for seed in range(4):
        t = tally(fuzz_gen(seed), 500_000)
        print(f"fuzz seed {seed} inputs=500000 slow={t['slow']} (integer-path={t['int']} exact-division={t['fast']} invalid/NULL={t['invalid']})")

if __name__ == "__main__":
    main()
