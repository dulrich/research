# Antagonist image: stress-ng in a Debian container (nothing is installed on the host).
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends stress-ng && rm -rf /var/lib/apt/lists/*
