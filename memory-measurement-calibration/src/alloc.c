/* alloc: allocate and touch a known amount of anonymous memory, optionally while writing a file.
 * usage: alloc --mib N [--file-mib M --file-dir DIR] [--hold S]
 * Allocates N MiB with malloc and writes every page; with --file-mib a second thread concurrently writes
 * M MiB to DIR/calib.dat (buffered, no fsync, so the pages stay in the page cache). Then prints the boundary
 * line "BOUNDARY" on stdout (flushed), holds S seconds (default 1) and prints MEASURE self_vmhwm_mib (the
 * process's own VmHWM) and self_cgroup_peak_mib (memory.peak of its cgroup, when readable). */
#define _GNU_SOURCE
#include <fcntl.h>
#include <pthread.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>

static long file_mib; static const char *file_dir = "/tmp";

static void *writer(void *arg) {
  (void)arg;
  char path[4096]; snprintf(path, sizeof path, "%s/calib.dat", file_dir);
  int fd = open(path, O_WRONLY | O_CREAT | O_TRUNC, 0600);
  if (fd < 0) { perror("open"); exit(1); }
  static char buf[1 << 20]; memset(buf, 0x5a, sizeof buf);
  for (long i = 0; i < file_mib; i++)
    if (write(fd, buf, sizeof buf) != (ssize_t)sizeof buf) { perror("write"); exit(1); }
  close(fd);
  return NULL;
}

static long status_kb(const char *key) {
  FILE *f = fopen("/proc/self/status", "r"); char line[256]; long kb = -1; size_t n = strlen(key);
  while (f && fgets(line, sizeof line, f)) if (!strncmp(line, key, n)) kb = atol(line + n);
  if (f) fclose(f);
  return kb;
}

int main(int argc, char **argv) {
  long mib = -1; int hold = 1;
  for (int i = 1; i < argc; i++) {
    if (!strcmp(argv[i], "--help")) { puts("usage: alloc --mib N [--file-mib M --file-dir DIR] [--hold S]"); return 0; }
    else if (!strcmp(argv[i], "--mib") && i + 1 < argc) mib = atol(argv[++i]);
    else if (!strcmp(argv[i], "--file-mib") && i + 1 < argc) file_mib = atol(argv[++i]);
    else if (!strcmp(argv[i], "--file-dir") && i + 1 < argc) file_dir = argv[++i];
    else if (!strcmp(argv[i], "--hold") && i + 1 < argc) hold = atoi(argv[++i]);
    else { fprintf(stderr, "bad arg %s\n", argv[i]); return 2; }
  }
  if (mib < 0 || file_mib < 0 || hold < 0) { fprintf(stderr, "alloc: --mib required, values non-negative\n"); return 2; }
  pthread_t t; int wt = 0;
  if (file_mib > 0) { pthread_create(&t, NULL, writer, NULL); wt = 1; }
  size_t sz = (size_t)mib << 20;
  char *p = malloc(sz ? sz : 1);
  if (!p) { fprintf(stderr, "alloc: malloc failed\n"); return 1; }
  for (size_t off = 0; off < sz; off += 4096) p[off] = 1;  /* touch every page */
  if (wt) pthread_join(t, NULL);
  puts("BOUNDARY"); fflush(stdout);
  sleep((unsigned)hold);
  p[sz ? sz - 1 : 0] = 2;  /* keep the block live */
  printf("MEASURE self_vmhwm_mib %.2f MiB\n", status_kb("VmHWM:") / 1024.0);
  FILE *f = fopen("/sys/fs/cgroup/memory.peak", "r"); long long pk = -1;
  if (f) { if (fscanf(f, "%lld", &pk) != 1) pk = -1; fclose(f); }
  if (pk >= 0) printf("MEASURE self_cgroup_peak_mib %.2f MiB\n", pk / 1048576.0);
  return 0;
}
