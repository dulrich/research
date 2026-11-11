#!/usr/bin/env python3
"""Round-5 build driver: every candidate of the comparison matrix, 6 layouts each.

Usage: python3 build_r5.py [--only REGEX] [--layouts N] [--jobs N] [--list]

Run from /work inside the image. For each variant and layout k it writes
/work/r5/<variant>-L<k>/parse_number.so (stripped; the unstripped link next to
it as parse_number.unstripped.so), then /work/r5/variants.txt (one
`<variant>-L<k> <path>` line per build, `# excluded ...` lines for matrix cells
that could not be built) and /work/r5/layouts.txt (hot-function address per
build).

Layout method (one method for all four cells, compiler-independent): a
zero-filled executable pad object (SHF_GNU_RETAIN, so --gc-sections keeps it) of 16*k bytes is linked ahead of the code, so
the whole text section, hot function included, shifts by 16*k bytes. The pad sits
in `.text.unlikely`, the first text input section in the default GNU ld order, so it
precedes the hot function even when PGO moves that into `.text.hot`. No
compiler alignment flag is involved.

PGO: each layout build is instrumented at its final path, trained by
pgo_train.py (its own fixed seed, all three dataset kinds), then rebuilt with
the profile (gcc's gcda names are path-mangled, so the rebuild uses the same
output path).
"""
import argparse, concurrent.futures as cf, glob, os, re, shutil, subprocess, sys

WORK = "/work"
OUT = f"{WORK}/r5"
TMP = "/tmp/r5build"
NIGHTLY = "nightly-2026-11-10"
STABLE = "1.99.1"
LLVM = "23"
SRC_C = f"{WORK}/c-fast/parse_number.c"
HOT = "parse_number_func"


def pad_bytes(k):
    return 16 * k


def variants():
    """The matrix. Each: name, kind, and the knobs build() reads."""
    v = []
    for opt, pgo in (("2", False), ("3", False), ("3", True)):
        v.append(dict(name=f"c-gcc-O{opt}" + ("-pgo" if pgo else ""), kind="c", cc="gcc", opt=opt, pgo=pgo))
        v.append(dict(name=f"c-clang-O{opt}" + ("-pgo" if pgo else ""), kind="c", cc=f"clang-{LLVM}", opt=opt, pgo=pgo))
    for crate in ("raw", "safe"):
        for std in ("std", "nostd"):
            def rust(backend, opt, lto, pgo, tc=NIGHTLY):
                name = f"{crate}-{std}-{backend}-o{opt}" + (("-lto" if lto else "-nolto") if backend == "llvm" else "") + ("-pgo" if pgo else "")
                feats = []
                if crate == "raw":
                    feats.append("fast")
                if std == "nostd":
                    feats.append("nostd")
                    if not lto:
                        feats.append("eh-stub")
                return dict(name=name, kind="rust", crate=f"rust-{crate}", backend=backend, opt=opt, lto=lto,
                            pgo=pgo, features=",".join(feats), toolchain=tc, optional_pgo=(backend == "gcc" and pgo))
            for opt, pgo in (("2", False), ("3", False), ("3", True)):
                v.append(rust("gcc", opt, False, pgo))
            v.append(rust("llvm", "2", True, False))
            v.append(rust("llvm", "3", True, False))
            v.append(rust("llvm", "3", False, False))
            v.append(rust("llvm", "3", True, True))
    # Anchor with the uniform layout method: the round-4 stable-toolchain build
    # (raw nostd,fast, opt-level 3 + LTO).
    a = dict(name="raw-nostd-stable-llvm-o3-lto", kind="rust", crate="rust-raw", backend="llvm", opt="3", lto=True,
             pgo=False, features="nostd,fast", toolchain=STABLE, optional_pgo=False)
    v.append(a)
    return v


def run(cmd, env=None, cwd=WORK, check=True):
    p = subprocess.run(cmd, env=env, cwd=cwd, capture_output=True, text=True)
    if check and p.returncode:
        sys.exit(f"FAILED: {' '.join(cmd)}\n{p.stdout[-2000:]}\n{p.stderr[-4000:]}")
    return p


def make_pads(n):
    os.makedirs(f"{OUT}/pad", exist_ok=True)
    for k in range(n):
        s = f"{OUT}/pad/pad-{pad_bytes(k)}.s"
        with open(s, "w") as f:
            f.write(f'.section .text.unlikely,"axR",@progbits,unique,1\n.skip {pad_bytes(k)}\n.section .note.GNU-stack,"",@progbits\n')
        run(["gcc", "-c", s, "-o", f"{OUT}/pad/pad-{pad_bytes(k)}.o"])


def train(so, env_extra=None):
    env = dict(os.environ, **(env_extra or {}))
    run(["python3", f"{WORK}/pgo_train.py", so], env=env)


def build_c(v, k, out):
    d = os.path.dirname(out)
    pad = f"{OUT}/pad/pad-{pad_bytes(k)}.o"
    base = [v["cc"], f"-O{v['opt']}", "-fPIC", "-shared"]
    if not v["pgo"]:
        run(base + [pad, SRC_C, "-o", out])
        return
    prof = f"{TMP}/pgo/{v['name']}-L{k}"
    shutil.rmtree(prof, ignore_errors=True)
    os.makedirs(prof)
    if v["cc"] == "gcc":
        run(base + ["-fprofile-generate=" + prof, pad, SRC_C, "-o", out])
        train(out)
        if not glob.glob(prof + "/**/*.gcda", recursive=True):
            sys.exit(f"no gcda written for {v['name']}-L{k}")
        run(base + ["-fprofile-use=" + prof, "-Werror=missing-profile", pad, SRC_C, "-o", out])
    else:
        run(base + ["-fprofile-instr-generate", pad, SRC_C, "-o", out])
        train(out, {"LLVM_PROFILE_FILE": prof + "/%p.profraw"})
        run([f"llvm-profdata-{LLVM}", "merge", "-o", prof + "/p.profdata"] + glob.glob(prof + "/*.profraw"))
        run(base + ["-fprofile-instr-use=" + prof + "/p.profdata", pad, SRC_C, "-o", out])


def cargo(v, k, rustflags, tdir, out):
    env = dict(os.environ,
               RUSTUP_TOOLCHAIN=v["toolchain"], CARGO_TARGET_DIR=tdir, RUSTFLAGS=rustflags,
               CARGO_PROFILE_RELEASE_OPT_LEVEL=v["opt"], CARGO_PROFILE_RELEASE_LTO="true" if v["lto"] else "false",
               CARGO_PROFILE_RELEASE_STRIP="none", RUSTC_BOOTSTRAP="1")  # RUSTC_BOOTSTRAP: -Z flags on the stable anchor
    cmd = ["cargo", "build", "--release", "--locked"]
    if v["features"]:
        cmd += ["--features", v["features"]]
    run(cmd, env=env, cwd=f"{WORK}/{v['crate']}")
    shutil.copy(f"{tdir}/release/libparse_number.so", out)


class Excluded(Exception):
    pass


def build_rust(v, k, out):
    pad = f"{OUT}/pad/pad-{pad_bytes(k)}.o"
    # -Zpre-link-arg puts the pad ahead of the crate's own object on the link line
    # (lld orders input sections by command-line position; a plain -C link-arg lands after them).
    flags = [f"-Zpre-link-arg={pad}"]
    if v["backend"] == "gcc":
        flags.append("-Zcodegen-backend=gcc")
    tbase = f"{TMP}/cargo/{v['name']}-L{k}"
    if not v["pgo"]:
        cargo(v, k, " ".join(flags), tbase, out)
        return
    prof = f"{TMP}/pgo/{v['name']}-L{k}"
    shutil.rmtree(prof, ignore_errors=True)
    os.makedirs(prof)
    try:
        # The profile runtime needs atexit/fopen from libc; a no_std cdylib links no libc
        # (and atexit lives in libc_nonshared.a), so the instrumented build adds -lc.
        # The profile-use build, which ships, does not.
        cargo(v, k, " ".join(flags + ["-C link-arg=-lc", f"-Cprofile-generate={prof}"]), tbase + "-gen", out)
        train(out)
    except SystemExit as e:
        if v["optional_pgo"]:
            raise Excluded("instrumented build or its training run failed (the backend links the profiler runtime but emits no counters): "
                           + " ".join(str(e).split())[-200:])
        raise
    raws = glob.glob(prof + "/*.profraw")
    if not raws:
        if v["optional_pgo"]:
            raise Excluded("rustc_codegen_gcc accepts -Cprofile-generate and links the profiler runtime, but emits no counters, so the instrumented build writes no profile")
        sys.exit(f"no profraw for {v['name']}-L{k}")
    tool = glob.glob(f"/usr/local/rustup/toolchains/{v['toolchain']}-*/lib/rustlib/*/bin/llvm-profdata")[0]
    run([tool, "merge", "-o", prof + "/p.profdata"] + raws)
    cargo(v, k, " ".join(flags + [f"-Cprofile-use={prof}/p.profdata"]), tbase, out)


def hot_address(unstripped):
    syms = run(["nm", unstripped]).stdout.splitlines()
    c = []
    for line in syms:
        p = line.split()
        if len(p) == 3 and HOT in p[2] and p[1] in "tT" and ".cold" not in p[2]:
            c.append((int(p[0], 16), p[2]))
    if not c:
        sys.exit(f"hot function {HOT} not found in {unstripped}")
    return min(c)


def loads(so):
    return [l.split()[:6] for l in run(["readelf", "-lW", so]).stdout.splitlines() if l.strip().startswith("LOAD")]


def build_one(v, k):
    d = f"{OUT}/{v['name']}-L{k}"
    os.makedirs(d, exist_ok=True)
    unstripped = f"{d}/parse_number.unstripped.so"
    final = f"{d}/parse_number.so"
    (build_c if v["kind"] == "c" else build_rust)(v, k, unstripped)
    addr, sym = hot_address(unstripped)
    run(["strip", "--strip-all", "-o", final, unstripped])
    if loads(unstripped) != loads(final):
        sys.exit(f"strip moved a loaded segment in {d}")
    shutil.rmtree(f"{TMP}/cargo/{v['name']}-L{k}", ignore_errors=True)
    shutil.rmtree(f"{TMP}/cargo/{v['name']}-L{k}-gen", ignore_errors=True)
    return v["name"], k, final, addr


def build_variant(v, nl):
    """All layouts of one variant. PGO exclusions are decided on layout 0."""
    rows = []
    for k in range(nl):
        try:
            rows.append(build_one(v, k))
        except Excluded as e:
            return v, [], str(e)
    return v, rows, None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", default=".", help="regex: build only matching variant names")
    ap.add_argument("--layouts", type=int, default=6)
    ap.add_argument("--jobs", type=int, default=3)
    ap.add_argument("--list", action="store_true", help="print the variant names and exit")
    if "--help" not in sys.argv[1:] and "-h" not in sys.argv[1:]:
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        from build_id import handle_build_flags
        rc = handle_build_flags(sys.argv[1:], __file__, name="build_r5", semver=None)
        if rc is not None:
            sys.exit(rc)
    a = ap.parse_args()
    vs = [v for v in variants() if re.search(a.only, v["name"])]
    if a.list:
        print("\n".join(v["name"] for v in vs))
        return
    os.makedirs(OUT, exist_ok=True)
    make_pads(a.layouts)
    with cf.ThreadPoolExecutor(a.jobs) as ex:
        results = list(ex.map(lambda v: build_variant(v, a.layouts), vs))
    with open(f"{OUT}/variants.txt", "w") as vf, open(f"{OUT}/layouts.txt", "w") as lf:
        lf.write("variant layout pad_bytes hot_function_addr addr_mod_64\n")
        for v, rows, excl in results:
            if excl:
                vf.write(f"# excluded {v['name']}: {excl}\n")
                print(f"EXCLUDED {v['name']}: {excl}")
                continue
            for name, k, final, addr in rows:
                vf.write(f"{name}-L{k} {final}\n")
                lf.write(f"{name} L{k} {pad_bytes(k)} 0x{addr:x} {addr % 64}\n")
            mods = {r[3] % 64 for r in rows}
            print(f"built {v['name']}: {len(rows)} layouts, {len(mods)} distinct addr mod 64")
            if len(mods) < 4:
                sys.exit(f"{v['name']}: fewer than 4 distinct addr mod 64 ({sorted(mods)})")


if __name__ == "__main__":
    main()
