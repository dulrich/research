# Investigation image: the fleet's build base (rust 1.99.1 on alpine 3.24, musl, cargo-auditable) plus the
# attribution tools. Build context = one corpus crate directory; the driver (size-cal.sh) passes the build args.
#   base      toolchain + tools (FLAVOR=musl, the fleet recipe) or a Debian toolchain (FLAVOR=gnu, class C target contrast)
#   build     cargo auditable release build; BUILD_ENVS carries the one-setting change as CARGO_PROFILE_RELEASE_* vars
#   out       the binary only (docker build --output)
#   attrib    cargo-bloat and bloaty reports on the same build (musl flavor only)
ARG FLAVOR=musl

FROM rust:1.99.1-alpine3.24 AS base-musl
RUN apk add --no-cache musl-dev binutils bloaty cargo-bloat \
 && cargo install cargo-auditable --locked --version 0.7.7

FROM rust:1.99.1-trixie AS base-gnu
RUN cargo install cargo-auditable --locked --version 0.7.7

FROM base-${FLAVOR} AS base
WORKDIR /src
COPY . .
RUN cargo fetch --locked

FROM base AS build
# Source id forwarded to build.rs (the fleet Dockerfiles forward the same variable).
ARG GIT_SHA=unknown
ENV GIT_SHA=${GIT_SHA}
# Space-separated NAME=VALUE pairs exported before the build (empty = the fleet profile unchanged).
ARG BUILD_ENVS=""
ARG PKG_ARGS="--bin inference-router"
ARG BIN=inference-router
RUN if [ -n "$BUILD_ENVS" ]; then export $BUILD_ENVS; fi \
 && cargo auditable build --release --locked $PKG_ARGS \
 && mkdir /out && cp target/release/$BIN /out/$BIN

FROM scratch AS out
COPY --from=build /out/ /

FROM build AS attrib
RUN mkdir /attr && if [ -n "$BUILD_ENVS" ]; then export $BUILD_ENVS; fi \
 && B=/src/target/release/$BIN \
 && { echo "file_bytes $(stat -c %s $B)"; } > /attr/file.txt \
 && bloaty -d sections -n 0 $B > /attr/bloaty-sections.txt \
 && bloaty -d symbols -n 40 $B > /attr/bloaty-symbols.txt \
 && { bloaty -d compileunits -n 60 $B > /attr/bloaty-compileunits.txt 2>&1 || echo "bloaty compileunits failed" >> /attr/bloaty-compileunits.txt; } \
 && cargo bloat --release --locked $PKG_ARGS --crates -n 0 > /attr/cargo-bloat-crates.txt 2>&1 \
 && cargo bloat --release --locked $PKG_ARGS -n 40 > /attr/cargo-bloat-symbols.txt 2>&1 \
 && bloaty --csv -d sections -n 0 $B > /attr/bloaty-sections.csv \
 && { bloaty --csv -d compileunits -n 0 $B > /attr/bloaty-compileunits.csv 2>&1 || true; } \
 && cargo bloat --release --locked $PKG_ARGS --crates -n 0 --message-format json > /attr/cargo-bloat-crates.json 2>/dev/null \
 && stat -c %s target/release/$BIN >> /attr/file.txt

FROM scratch AS attrout
COPY --from=attrib /attr/ /
