# Harness image: src/thp.c built four times, once per allocator, from the distro packages of the base release.
# Base pinned by digest (debian:trixie-slim as of 2026-11-13, the same digest as glibc-arena-retention).
# linux-perf is for scripts/cpuprobe.sh (Question C); libc6/jemalloc/mimalloc/musl versions are recorded in /versions.txt.
FROM debian:trixie-slim@sha256:f6b08b09a05725f9431502d3b5714f5c4576e82c1a84fa1debe0c24a7e0c3ec4
RUN apt-get update && apt-get install -y --no-install-recommends gcc libc6-dev libjemalloc-dev libmimalloc-dev musl-tools linux-perf \
 && rm -rf /var/lib/apt/lists/*
COPY src/ /src/
RUN gcc -O2 -pthread -DA_GLIBC -o /usr/local/bin/thp-glibc /src/thp.c \
 && gcc -O2 -pthread -DA_JEMALLOC -o /usr/local/bin/thp-jemalloc /src/thp.c -ljemalloc \
 && gcc -O2 -pthread -DA_MIMALLOC -o /usr/local/bin/thp-mimalloc /src/thp.c -lmimalloc \
 && musl-gcc -O2 -static -pthread -DA_MUSL -o /usr/local/bin/thp-musl /src/thp.c \
 && dpkg-query -W libc6 libjemalloc2 libmimalloc3 musl gcc-14 linux-perf > /versions.txt \
 && perf --version >> /versions.txt
