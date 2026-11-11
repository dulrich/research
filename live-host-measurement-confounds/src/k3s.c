/* K3s: multithreaded allocator churn reproducing glibc arena growth.
 * usage: k3s [--threads N] [--seconds S] [--idle S]
 * Each worker thread repeatedly allocates and frees blocks of mixed sizes (a small working set
 * kept alive, the rest freed in random order), which makes glibc create per-thread arenas (cap
 * 8 x cores). After the churn the program idles and samples RSS. Prints MEASURE lines:
 *   peak_rss_mib, settled_rss_mib (mean of the last 10 samples of the idle phase),
 *   arenas (count of "arena" mappings from malloc_info), threads.
 * Build: gcc -O2 -pthread -o k3s k3s.c  (host toolchain, Debian 13 gcc; runs in a debian:trixie container). */
#define _GNU_SOURCE
#include <malloc.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

static volatile int stop;
static int nthreads = 12;

static double rss_mib(void) {
  FILE *f = fopen("/proc/self/status", "r");
  char line[256];
  long kb = 0;
  while (f && fgets(line, sizeof line, f))
    if (!strncmp(line, "RssAnon:", 8)) kb = atol(line + 8);
  if (f) fclose(f);
  return kb / 1024.0;
}

static uint64_t rng(uint64_t *s) { *s ^= *s << 13; *s ^= *s >> 7; *s ^= *s << 17; return *s; }

static void *worker(void *arg) {
  uint64_t s = 0x9e3779b97f4a7c15ULL ^ (uint64_t)(uintptr_t)arg;
  enum { SLOTS = 4096 };
  void *slot[SLOTS];
  memset(slot, 0, sizeof slot);
  while (!stop) {
    for (int i = 0; i < 2000 && !stop; i++) {
      size_t k = rng(&s) % SLOTS, sz = 64 + rng(&s) % 24000;
      free(slot[k]);
      slot[k] = malloc(sz);
      if (slot[k]) memset(slot[k], 1, sz < 256 ? sz : 256);
    }
    for (int i = 1; i < SLOTS; i += 2) { free(slot[i]); slot[i] = NULL; }  /* partial release */
  }
  for (int i = 0; i < SLOTS; i++) if (i % 16) free(slot[i]);  /* every 16th block stays live (retained data) */
  return NULL;
}

static int count_arenas(void) {
  char *buf = NULL; size_t len = 0;
  FILE *m = open_memstream(&buf, &len);
  malloc_info(0, m); fclose(m);
  int n = 0;
  for (char *p = buf; (p = strstr(p, "<heap nr=")); p++) n++;
  free(buf);
  return n;
}

int main(int argc, char **argv) {
  int seconds = 5, idle = 12;
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--help")) {
      puts("usage: k3s [--threads N] [--seconds S] [--idle S]\n  allocator churn; prints MEASURE peak_rss_mib / settled_rss_mib / arenas / threads");
      return 0;
    } else if (!strcmp(argv[i], "--threads") && i + 1 < argc) nthreads = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--seconds") && i + 1 < argc) seconds = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--idle") && i + 1 < argc) idle = atoi(argv[++i]);
    else { fprintf(stderr, "bad arg %s\n", argv[i]); return 2; }
  }
  if (nthreads < 1 || nthreads > 256 || seconds < 1 || idle < 10) { fprintf(stderr, "bad value\n"); return 2; }
  pthread_t t[256];
  for (int i = 0; i < nthreads; i++) pthread_create(&t[i], NULL, worker, (void *)(uintptr_t)(i + 1));
  double peak = 0;
  struct timespec ts = {0, 100 * 1000 * 1000};
  for (int i = 0; i < seconds * 10; i++) { double r = rss_mib(); if (r > peak) peak = r; nanosleep(&ts, NULL); }
  stop = 1;
  for (int i = 0; i < nthreads; i++) pthread_join(t[i], NULL);
  int arenas = count_arenas();
  double last[10]; int n = 0;
  for (int i = 0; i < idle; i++) { sleep(1); double r = rss_mib(); if (r > peak) peak = r; last[n++ % 10] = r; }
  double sum = 0; for (int i = 0; i < 10; i++) sum += last[i];
  printf("MEASURE peak_rss_mib %.2f MiB\nMEASURE settled_rss_mib %.2f MiB\nMEASURE arenas %d\nMEASURE threads %d\n", peak, sum / 10, arenas, nthreads);
  return 0;
}
