/* work: fixed-work CPU loop with no syscalls and no memory traffic.
   work lat N   one dependent LCG chain: latency-bound (one multiply-add per iteration, each waits for the last)
   work thr N   four independent LCG chains: throughput-bound (the multiplier port is the limit, so a sibling
                hardware thread that also multiplies halves the rate)
   N is the iteration count; N = 0 is the zero-work control (process start-up and exit only). */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <errno.h>
#define A 6364136223846793005UL
#define B 1442695040888963407UL
int main(int c, char **v) {
  if (c != 3 || (strcmp(v[1], "lat") && strcmp(v[1], "thr"))) { fprintf(stderr, "usage: work lat|thr N\n"); return 2; }
  char *end; errno = 0;
  unsigned long n = strtoul(v[2], &end, 10);
  if (errno || end == v[2] || *end || v[2][0] == '-') { fprintf(stderr, "work: N must be a non-negative whole number\n"); return 2; }
  unsigned long x = 1, y = 2, z = 3, w = 4;
  if (v[1][0] == 't') {
    for (unsigned long i = 0; i < n; i++) { x = x * A + B; y = y * A + B; z = z * A + B; w = w * A + B; }
  } else {
    for (unsigned long i = 0; i < n; i++) x = x * A + B;
  }
  if ((x ^ y ^ z ^ w) == 42) puts("x"); /* keeps the loops live */
  return 0;
}
