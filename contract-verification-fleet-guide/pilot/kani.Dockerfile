# The Kani image for the greeter pilot. Pins: the base image by digest (the same one the Verus
# image uses), the kani-verifier crate version; `cargo kani setup` then fetches the Kani release
# bundle of that version and the nightly Rust toolchain that release is built against.
FROM rust:1.99.1-slim-trixie@sha256:f6c4a35d21dbb3c89d7a8d056c193e94fc09037f2b58dd858b09c39a47dd02d7

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl git make gcc libc6-dev \
 && rm -rf /var/lib/apt/lists/*

ARG KANI_VERSION=0.68.0
RUN cargo install --locked kani-verifier --version ${KANI_VERSION} \
 && cargo kani setup \
 && rm -rf /usr/local/cargo/registry

WORKDIR /pilot
