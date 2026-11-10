# Build environment for every extension compared in this investigation:
# the four upstream versions (c, c-fast, rusqlite, sqlite-loadable) from
# simonw/research, pinned by commit, plus the four rust-raw variants here.
FROM rust:1.99.1-slim-trixie

# gcc + libc6-dev: C extensions; libsqlite3-dev: sqlite3ext.h (3.46.1);
# python3: test/fuzz/bench host (its sqlite3 module links the same libsqlite3);
# libclang-dev: bindgen for sqlite-loadable; binutils: size(1);
# git + ca-certificates: fetch the upstream investigation.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc libc6-dev libsqlite3-dev python3 libclang-dev binutils git ca-certificates \
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

# This investigation: harness patch (adds the rust-raw variants) + four builds.
COPY harness.patch /work/
COPY rust-raw/Cargo.toml rust-raw/lib.rs /work/rust-raw/
RUN git apply harness.patch \
 && cd rust-raw \
 && for v in std: nostd:nostd fast:fast nostd-fast:nostd,fast; do \
      n="${v%%:*}"; f="${v#*:}"; \
      CARGO_TARGET_DIR="target/$n" cargo build --release ${f:+--features "$f"} \
      && mkdir -p "$n" && cp "target/$n/release/libparse_number.so" "$n/" || exit 1; \
    done

CMD ["python3", "test.py"]
