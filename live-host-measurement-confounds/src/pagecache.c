/* K4: sequential page-cache read benchmark.
 * usage: pagecache [--evict] <file>...
 * Reads every file once in 1 MiB chunks; prints MEASURE read_mib_s and MEASURE read_ms.
 * --evict first drops only this program's own file pages (posix_fadvise DONTNEED; clean pages only, no root,
 * does not touch other users' cache); the whole-cache variant (drop_caches) is a controller operation done before the
 * process starts. Build: gcc -O2 -o pagecache pagecache.c */
#define _GNU_SOURCE
#include <fcntl.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

int main(int argc, char **argv) {
  int evict = 0, first = 1;
  if (argc > 1 && !strcmp(argv[1], "--help")) {
    puts("usage: pagecache [--evict] <file>...\n  sequential read in 1 MiB chunks; prints MEASURE read_mib_s and read_ms");
    return 0;
  }
  if (argc > 1 && !strcmp(argv[1], "--evict")) { evict = 1; first = 2; }
  if (first >= argc) { fprintf(stderr, "no files\n"); return 2; }
  if (evict)
    for (int i = first; i < argc; i++) {
      int fd = open(argv[i], O_RDONLY);
      if (fd < 0) { perror(argv[i]); return 2; }
      fdatasync(fd);
      posix_fadvise(fd, 0, 0, POSIX_FADV_DONTNEED);
      close(fd);
    }
  static char buf[1 << 20];
  struct timespec a, b;
  double total = 0;
  clock_gettime(CLOCK_MONOTONIC, &a);
  for (int i = first; i < argc; i++) {
    int fd = open(argv[i], O_RDONLY);
    if (fd < 0) { perror(argv[i]); return 2; }
    ssize_t n;
    while ((n = read(fd, buf, sizeof buf)) > 0) total += n;
    if (n < 0) { perror("read"); return 2; }
    close(fd);
  }
  clock_gettime(CLOCK_MONOTONIC, &b);
  double s = (b.tv_sec - a.tv_sec) + (b.tv_nsec - a.tv_nsec) / 1e9;
  printf("MEASURE read_mib_s %.1f MiB/s\nMEASURE read_ms %.2f ms\n", total / 1048576.0 / s, s * 1000);
  return 0;
}
