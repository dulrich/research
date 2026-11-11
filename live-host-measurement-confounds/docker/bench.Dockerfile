# Bench image for the cv blocks (K2/K3): Debian 13 userland + full perl (client.pl needs Time::HiRes and JSON::PP) and CA certificates (the daemon builds its HTTP client from the system roots).
FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends perl ca-certificates && rm -rf /var/lib/apt/lists/*
