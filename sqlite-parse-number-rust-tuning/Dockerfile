# Build environment for every extension compared in this investigation:
# the four upstream versions (c, c-fast, rusqlite, sqlite-loadable) from
# simonw/research, pinned by commit, plus the four rust-raw variants here.
FROM rust:1.99.1-slim-trixie

# gcc + libc6-dev: C extensions; libsqlite3-dev: sqlite3ext.h (3.46.1);
# python3: test/fuzz/bench host (its sqlite3 module links the same libsqlite3);
# libclang-dev: bindgen for sqlite-loadable; binutils: size(1);
# git + ca-certificates: fetch the upstream investigation;
# linux-perf: hardware instruction counts for round 4.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc libc6-dev libsqlite3-dev python3 libclang-dev binutils git ca-certificates linux-perf \
 && rm -rf /var/lib/apt/lists/*

ARG UPSTREAM=https://github.com/simonw/research.git
ARG UPSTREAM_COMMIT=aa4e39edad154dad649a1804e32a943cf670a6e4
RUN git clone --no-checkout --filter=blob:none "$UPSTREAM" /up \
 && cd /up \
 && git sparse-checkout set sqlite-parse-number-c-vs-rust \
 && git checkout "$UPSTREAM_COMMIT" \
 && cp -r /up/sqlite-parse-number-c-vs-rust /work \
 && rm -rf /up

WORKDIR /work

# Upstream builds (same commands as upstream build.sh).
RUN gcc -O2 -fPIC -shared -s c/parse_number.c -o c/parse_number.so \
 && gcc -O2 -fPIC -shared -s c-fast/parse_number.c -o c-fast/parse_number.so \
 && (cd rust-rusqlite && cargo build --release --locked) \
 && (cd rust-loadable && cargo build --release --locked)

# This investigation: harness patch (adds the new builds to the upstream
# test/fuzz/bench lists) + every variant. Each line: crate name features rustflags.
COPY harness.patch /work/
COPY rust-raw/Cargo.toml rust-raw/lib.rs /work/rust-raw/
COPY rust-safe/Cargo.toml rust-safe/lib.rs rust-safe/parse.rs /work/rust-safe/
ENV ALIGN="-C llvm-args=-align-all-functions=6 -C llvm-args=-align-loops=64"
RUN git apply harness.patch \
 && printf '%s\n' \
      'rust-raw std - -' \
      'rust-raw nostd nostd -' \
      'rust-raw fast fast -' \
      'rust-raw nostd-fast nostd,fast -' \
      'rust-raw nostd-fast-strtod nostd,strtod -' \
      'rust-raw fast-align64 fast align' \
      'rust-raw nostd-fast-align64 nostd,fast align' \
      'rust-safe std - -' \
      'rust-safe nostd nostd -' \
    | while read -r crate n f fl; do \
      [ "$f" = - ] && f=; \
      if [ "$fl" = align ]; then fl="$ALIGN"; else fl=; fi; \
      (cd "$crate" && RUSTFLAGS="$fl" CARGO_TARGET_DIR="target/$n" cargo build --release ${f:+--features "$f"} \
        && mkdir -p "$n" && cp "target/$n/release/libparse_number.so" "$n/") || exit 1; \
    done

# Round 4: layout-perturbed copies of the compared variants (code placement
# is a random factor). Suffix -a16/-a32/-a64 is the loop alignment in bytes.
# Rust: -align-all-functions=4/5/6 (log2: 16/32/64 B) with -align-loops=16/32/64;
# C: -falign-functions=N -falign-loops=N. Each build sits in its own directory
# under its original file name, because SQLite derives the init symbol from it.
RUN mkdir -p /work/layouts \
 && for a in 16 32 64; do \
      mkdir -p "layouts/c-fast-a$a" && gcc -O2 -fPIC -shared -s -falign-functions=$a -falign-loops=$a c-fast/parse_number.c -o "layouts/c-fast-a$a/parse_number.so" || exit 1; \
    done \
 && printf '%s\n' \
      'rust-raw raw-fast fast' \
      'rust-raw raw-nostd-fast nostd,fast' \
      'rust-raw raw-nostd-fast-strtod nostd,strtod' \
      'rust-safe safe-std -' \
      'rust-safe safe-nostd nostd' \
    | while read -r crate n f; do \
      [ "$f" = - ] && f=; \
      for pair in 16:4 32:5 64:6; do \
        a=${pair%:*}; fa=${pair#*:}; \
        (cd "$crate" && RUSTFLAGS="-C llvm-args=-align-all-functions=$fa -C llvm-args=-align-loops=$a" CARGO_TARGET_DIR="target/lay-$n-$a" \
          cargo build --release ${f:+--features "$f"} \
          && mkdir -p "/work/layouts/$n-a$a" && cp "target/lay-$n-$a/release/libparse_number.so" "/work/layouts/$n-a$a/") || exit 1; \
      done; \
    done

CMD ["python3", "test.py"]

# Round 3: size-only builds of c-fast and rust-raw nostd,strtod under
# matched linkers and size flags (never benchmarked; see README round 3).
# LLD is the linker rustc already uses; gcc reaches it with -B.
ENV LLD_DIR=/usr/local/rustup/toolchains/1.99.1-x86_64-unknown-linux-gnu/lib/rustlib/x86_64-unknown-linux-gnu/bin/gcc-ld
ENV SZ_LINK="-Wl,-z,noseparate-code -Wl,--build-id=none -Wl,-z,norelro -Wl,--hash-style=gnu"
ENV SZ_CC="-fno-asynchronous-unwind-tables -fno-unwind-tables -ffunction-sections -fdata-sections -Wl,--gc-sections"
RUN mkdir -p /work/sizes \
 && c() { n=$1; shift; gcc -fPIC -shared -s "$@" c-fast/parse_number.c -o "sizes/c-fast-$n.so"; } \
 && c O2-gnuld          -O2 \
 && c O2-lld            -O2 -B"$LLD_DIR" -fuse-ld=lld \
 && c O2-gnuld-nosep    -O2 -Wl,-z,noseparate-code \
 && c O2-gnuld-all      -O2 $SZ_LINK $SZ_CC \
 && c Os-gnuld-all      -Os $SZ_LINK $SZ_CC \
 && c O2-lld-all        -O2 -B"$LLD_DIR" -fuse-ld=lld -Wl,--build-id=none -Wl,-z,norelro $SZ_CC \
 && cp rust-raw/nostd-fast-strtod/libparse_number.so sizes/rust-nostd-strtod-lld.so \
 && (cd rust-raw && RUSTFLAGS="$(printf -- '-C link-arg=%s ' $SZ_LINK)" CARGO_TARGET_DIR=target/sz \
      cargo build --release --features nostd,strtod) \
 && cp rust-raw/target/sz/release/libparse_number.so sizes/rust-nostd-strtod-lld-all.so \
 && for f in sizes/*-all.so; do strip -R .comment -R .note.gnu.property "$f"; done
