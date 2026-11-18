# The Verus image for the greeter pilot. Pins: the base image by digest, the Verus release zip by
# SHA-256, and the Rust toolchain that release requires.
FROM rust:1.99.1-slim-trixie@sha256:f6c4a35d21dbb3c89d7a8d056c193e94fc09037f2b58dd858b09c39a47dd02d7

RUN apt-get update \
 && apt-get install -y --no-install-recommends curl unzip ca-certificates git make \
 && rm -rf /var/lib/apt/lists/*

ARG VERUS_RELEASE=0.2026.10.04.426d8b0
ARG VERUS_SHA256=624018662868563a7bec0dd07be5e4dd0c3d61124b4b55105765884bf2d4d1a0
RUN curl -fsSL -o /tmp/verus.zip \
      "https://github.com/verus-lang/verus/releases/download/release/${VERUS_RELEASE}/verus-${VERUS_RELEASE}-x86-linux.zip" \
 && echo "${VERUS_SHA256}  /tmp/verus.zip" | sha256sum -c - \
 && unzip -q /tmp/verus.zip -d /opt \
 && rm /tmp/verus.zip
ENV PATH=/opt/verus-x86-linux:$PATH

# The toolchain this Verus release is built against.
RUN rustup toolchain install 1.98.1-x86_64-unknown-linux-gnu --profile minimal

WORKDIR /pilot
