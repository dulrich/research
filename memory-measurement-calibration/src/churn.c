/* churn: multithreaded allocator churn (after the K3s program of the live-host investigation), then idle.
 * usage: churn [--threads N] [--seconds S] [--idle S]
 * N workers allocate and free mixed-size blocks for S seconds (a small live set stays), then are joined. The
 * program prints the boundary line "BOUNDARY" on stdout (flushed) and stays alive and idle for --idle seconds
 * so that an external probe can sample settled memory at offsets from the boundary. At the end it prints
 * MEASURE self_rssanon_mib (its own RssAnon) and MEASURE arenas (malloc_info heap count).
 * Build: gcc -O2 -pthread -o churn churn.c */
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
    for (int i = 1; i < SLOTS; i += 2) { free(slot[i]); slot[i] = NULL; }
  }
  for (int i = 0; i < SLOTS; i++) if (i % 16) free(slot[i]);  /* every 16th block stays live */
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

static double rssanon_mib(void) {
  FILE *f = fopen("/proc/self/status", "r"); char line[256]; long kb = 0;
  while (f && fgets(line, sizeof line, f)) if (!strncmp(line, "RssAnon:", 8)) kb = atol(line + 8);
  if (f) fclose(f);
  return kb / 1024.0;
}

int main(int argc, char **argv) {
  int nthreads = 12, seconds = 5, idle = 126;
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--help")) { puts("usage: churn [--threads N] [--seconds S] [--idle S]"); return 0; }
    else if (!strcmp(argv[i], "--threads") && i + 1 < argc) nthreads = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--seconds") && i + 1 < argc) seconds = atoi(argv[++i]);
    else if (!strcmp(argv[i], "--idle") && i + 1 < argc) idle = atoi(argv[++i]);
    else { fprintf(stderr, "bad arg %s\n", argv[i]); return 2; }
  }
  if (nthreads < 1 || nthreads > 256 || seconds < 1 || idle < 0) { fprintf(stderr, "bad value\n"); return 2; }
  pthread_t t[256];
  for (int i = 0; i < nthreads; i++) pthread_create(&t[i], NULL, worker, (void *)(uintptr_t)(i + 1));
  struct timespec ts = {seconds, 0};
  nanosleep(&ts, NULL);
  stop = 1;
  for (int i = 0; i < nthreads; i++) pthread_join(t[i], NULL);
  int arenas = count_arenas();
  puts("BOUNDARY"); fflush(stdout);
  sleep((unsigned)idle);
  printf("MEASURE self_rssanon_mib %.2f MiB\nMEASURE arenas %d\n", rssanon_mib(), arenas);
  return 0;
}
