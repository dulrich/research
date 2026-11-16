FROM oven/bun:1.4.4 AS bun
FROM rust:1.99.1-trixie
RUN apt-get update && apt-get install -y --no-install-recommends \
    pkg-config libwayland-dev libwayland-bin wayland-protocols \
    libinput-dev libgbm-dev libdrm-dev libseat-dev \
    libxkbcommon-dev libudev-dev libpixman-1-dev \
    libegl1-mesa-dev libgles2-mesa-dev libdisplay-info-dev libffi-dev patch \
 && rm -rf /var/lib/apt/lists/*
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
