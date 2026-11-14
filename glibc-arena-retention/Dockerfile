# Reproducer image: retain.c is compiled in a builder stage so the toolchain is part of the build.
# Base pinned by digest (debian:trixie-slim as of 2026-11-13, the same digest as memory-measurement-calibration).
FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4 AS build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev && rm -rf /var/lib/apt/lists/*
COPY src/ /src/
RUN gcc --version | head -n 1 > /gcc-version.txt && gcc -O2 -pthread -o /retain /src/retain.c

FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4
COPY --from=build /retain /gcc-version.txt /usr/local/bin/
RUN ldd --version | head -n 1 > /usr/local/bin/glibc-version.txt
