# Calibration image: the C programs are compiled in a builder stage so the toolchain is part of the build.
# Base pinned by digest (debian:trixie-slim as of 2026-11-13).
FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4 AS build
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev && rm -rf /var/lib/apt/lists/*
COPY src/ /src/
RUN gcc --version | head -n 1 > /gcc-version.txt && gcc -O2 -pthread -o /alloc /src/alloc.c && gcc -O2 -pthread -o /churn /src/churn.c

FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4
COPY --from=build /alloc /churn /gcc-version.txt /usr/local/bin/
