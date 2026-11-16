# Identity check for round 6: only the toolchain layers of the investigation's
# Dockerfile (same base, same apt packages, same source path /work/rust-safe,
# same build command for `rust-safe nostd-bigdec nostd,bigdec -`).
FROM rust:1.99.1-slim-trixie
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      gcc libc6-dev libsqlite3-dev python3 libclang-dev binutils git ca-certificates linux-perf \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY rust-safe/Cargo.toml rust-safe/lib.rs rust-safe/parse.rs rust-safe/bigdec.rs /work/rust-safe/
RUN cd rust-safe && RUSTFLAGS= CARGO_TARGET_DIR=target/nostd-bigdec cargo build --release --features nostd,bigdec \
 && mkdir -p nostd-bigdec && cp target/nostd-bigdec/release/libparse_number.so nostd-bigdec/
CMD ["sh","-c","cd /work/rust-safe/nostd-bigdec && sha256sum libparse_number.so && stat -c %s libparse_number.so"]
