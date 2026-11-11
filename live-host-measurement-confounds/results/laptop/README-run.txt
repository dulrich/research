Laptop quiet baseline (K2, K3, K3-120, K3s), run from the workstation over ssh.

Hardware: Intel Core i7-5600U, 2 cores / 4 threads (2C/4T), 11.7 GiB RAM, Debian 13 (kernel 6.12).
Tuning (restored afterwards, read-backs in tuning-readbacks.txt): governor performance, intel_pstate no_turbo=1, CPU 3 offline,
perf_event_paranoid=2, unattended-upgrades/smartmontools/cron/iwd stopped (the default route and the ssh session used the wired interface).
Placement: measured containers pinned with --cpuset-cpus 1-2 (LHMC_PIN=1-2); CPU 3 offline; CPU 0 left to housekeeping.
Channel: persistent ssh channel (channel.argv ssh {host} sh -s, probe cpu 1), run with --host. Configs under configs/ are the frozen
configs/{k2,k3,k3-120,k3s}.json with the argv rewritten to the laptop copy of runk.sh and the channel added; invocation, warm-up, A/A and
variant counts are unchanged. Seeds are those of the workstation's I0-L0-full cell (k2 791012050, k3 774234431, k3-120 1901456219, k3s 70681656).
Counts: k2, k3, k3-120: 2 variants x (1 warm-up + 10) = 22 invocations; k3s: 2 variants x (3 warm-up + 10) = 26.
Walls: k3 1124 s, k2 2001 s, k3-120 3100 s, k3s 467 s. K1 is not run (earlier round data is reused).
Overlap with the workstation day cells (live user activity): k3, k2 and k3-120 ran while the workstation day cells ran
(I0-Llive-day 13:34-14:27, I2-Llive-day 14:27-15:20, local time); k3s ran afterwards. The laptop driver adds only an ssh client on the workstation.
Cleanup: the scratch directory on the laptop (copy of the scratch vault, binaries) and the loaded bench image were deleted at the end.
