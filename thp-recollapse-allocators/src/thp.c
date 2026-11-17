/* thp.c - burst-then-release harness: does khugepaged (or MADV_COLLAPSE) re-collapse an allocator's released memory?
 * One program, four builds (-DA_GLIBC, -DA_JEMALLOC, -DA_MIMALLOC, -DA_MUSL). See --help. */
#define _GNU_SOURCE
#include <errno.h>
#include <pthread.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/mman.h>
#include <sys/prctl.h>
#include <time.h>
#include <unistd.h>
#ifndef PR_THP_DISABLE_EXCEPT_ADVISED
#define PR_THP_DISABLE_EXCEPT_ADVISED (1 << 1) /* missing from Debian 13 headers (kernel 6.18+ ABI) */
#endif
#ifndef PR_GET_THP_DISABLE
#define PR_GET_THP_DISABLE 42
#endif
#ifndef MADV_COLLAPSE
#define MADV_COLLAPSE 25
#endif
#if defined(A_GLIBC)
#include <gnu/libc-version.h>
#include <malloc.h>
#define ANAME "glibc"
#define RELEASE() malloc_trim(0)
#elif defined(A_JEMALLOC)
#include <jemalloc/jemalloc.h>
#define ANAME "jemalloc"
#define RELEASE() do { char b_[64]; snprintf(b_, sizeof b_, "arena.%u.purge", MALLCTL_ARENAS_ALL); mallctl(b_, 0, 0, 0, 0); } while (0)
#elif defined(A_MIMALLOC)
#include <mimalloc.h>
#define ANAME "mimalloc"
#define RELEASE() mi_collect(1)
#else
#define ANAME "musl"
#define RELEASE() ((void)0)
#endif

static const char USAGE[] =
"usage: thp [options]\n"
"       thp --help | --version\n"
"\n"
"Burst-then-release allocator harness (build with -DA_GLIBC, -DA_JEMALLOC, -DA_MIMALLOC or -DA_MUSL). Worker\n"
"thread(s) allocate --mib MiB of small objects, free all but one survivor per --stride-kb KiB of allocation, then\n"
"call the allocator's release (glibc malloc_trim(0), jemalloc arena.<all>.purge, mimalloc mi_collect(true), none\n"
"for musl). Output lines: ENV, READ, MAP, SPAN, BOUNDARY, MEASURE (decimal values only).\n"
"\n"
"  --thp on|off|advised   per-process THP control, set before allocator start-up by re-exec (default on):\n"
"                         off = PR_SET_THP_DISABLE; advised = PR_SET_THP_DISABLE + PR_THP_DISABLE_EXCEPT_ADVISED\n"
"  --mode forced|natural|cpu\n"
"      forced   (default) after the release: MAP dump, optional --collapse, BOUNDARY line, --idle seconds, final reading\n"
"      natural  after the release: sample every --sample s until /sys .../khugepaged/full_scans passed its release\n"
"               value by --scan-incs (default 2) or --max-wait seconds; --stop-on-growth-mib stops at the first increment\n"
"               when anon or AnonHugePages grew by at least that many MiB since the release\n"
"      cpu      --reps bursts of alloc + free + release per thread; no readings (run under cpuprobe.sh)\n"
"  --stride-kb N          one survivor per N KiB of allocation; 0 = none (default 128)\n"
"  --shape fixed|mixed    fixed 64 B objects (default) or sizes 16 B..4 KiB (powers of two, fixed seed)\n"
"  --mib N                burst size per thread in MiB (default 64; 0 = zero-work control)\n"
"  --threads N            worker threads (default 1)\n"
"  --collapse             forced mode: madvise(MADV_COLLAPSE) on every 2 MiB-aligned span of each writable anonymous\n"
"                         mapping, then a SPAN line per call with its return, errno and the containing mapping's\n"
"                         post-call AnonHugePages (read from smaps; never infer coverage from the return code)\n"
"  --idle S               forced mode: seconds kept alive after BOUNDARY (default 12)\n"
"  --sample S             natural mode sampling period in seconds (default 10)\n"
"  --max-wait S           natural mode limit in seconds (default 3600)\n"
"  --scan-incs K          natural mode: full_scans increments to wait for (default 2)\n"
"  --stop-on-growth-mib X natural mode early stop, see above\n"
"  --reps N               cpu mode repetitions (default 1)\n"
"THP control env THP_DONE marks the re-exec. Allocator-native controls are passed as environment by the driver\n"
"(MALLOC_CONF, GLIBC_TUNABLES, MIMALLOC_*) and echoed on the ENV line.\n";

static const char *thp_mode = "on", *mode = "forced", *shape = "fixed";
static long stride_kb = 128, mib = 64, threads = 1, idle_s = 12, sample_s = 10, max_wait = 3600, scan_incs = 2, reps = 1;
static double stop_growth = -1;
static int do_collapse;

static double now(void) { struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t); return t.tv_sec + t.tv_nsec / 1e9; }
static long sysfs_long(const char *p) { FILE *f = fopen(p, "r"); long v = -1; if (f) { if (fscanf(f, "%ld", &v) != 1) v = -1; fclose(f); } return v; }
static long full_scans(void) { return sysfs_long("/sys/kernel/mm/transparent_hugepage/khugepaged/full_scans"); }
static long pages_collapsed(void) { return sysfs_long("/sys/kernel/mm/transparent_hugepage/khugepaged/pages_collapsed"); }
static void rd(long *anon, long *ahp, long *rss) {
  FILE *f = fopen("/proc/self/smaps_rollup", "r"); char l[256]; *anon = *ahp = *rss = 0;
  while (f && fgets(l, sizeof l, f)) {
    if (!strncmp(l, "Anonymous:", 10)) sscanf(l + 10, "%ld", anon);
    else if (!strncmp(l, "AnonHugePages:", 14)) sscanf(l + 14, "%ld", ahp);
    else if (!strncmp(l, "Rss:", 4)) sscanf(l + 4, "%ld", rss);
  }
  if (f) fclose(f);
}
static void sysfs_line(const char *key, const char *path) {
  FILE *f = fopen(path, "r"); char l[128] = "?"; if (f) { if (!fgets(l, sizeof l, f)) strcpy(l, "?"); fclose(f); }
  l[strcspn(l, "\n")] = 0; for (char *q = l; *q; q++) if (*q == ' ') *q = ','; printf(" %s=%s", key, l);
}
static void env_line(void) {
  printf("ENV alloc=" ANAME " thp=%s mode=%s stride_kb=%ld shape=%s mib=%ld threads=%ld collapse=%d", thp_mode, mode, stride_kb, shape, mib, threads, do_collapse);
#if defined(A_GLIBC)
  printf(" version=%s", gnu_get_libc_version());
#elif defined(A_JEMALLOC)
  { const char *v = 0; size_t n = sizeof v; if (!mallctl("version", &v, &n, 0, 0)) printf(" version=%s", v); }
#elif defined(A_MIMALLOC)
  printf(" version=%d", mi_version());
#endif
  printf(" prctl_thp_disable=%d", prctl(PR_GET_THP_DISABLE, 0, 0, 0, 0));
  { FILE *f = fopen("/proc/self/status", "r"); char l[256]; while (f && fgets(l, sizeof l, f)) { if (!strncmp(l, "THP_enabled:", 12)) printf(" status_THP_enabled=%d", atoi(l + 12)); if (!strncmp(l, "Cpus_allowed_list:", 18)) { char *p = l + 18; while (*p == ' ' || *p == '\t') p++; p[strcspn(p, "\n")] = 0; printf(" cpus_allowed=%s", p); } } if (f) fclose(f); }
  printf(" MALLOC_CONF=%s GLIBC_TUNABLES=%s", getenv("MALLOC_CONF") ? getenv("MALLOC_CONF") : "-", getenv("GLIBC_TUNABLES") ? getenv("GLIBC_TUNABLES") : "-");
  { extern char **environ; for (char **e = environ; *e; e++) if (!strncmp(*e, "MIMALLOC_", 9)) printf(" %s", *e); }
  sysfs_line("thp_enabled", "/sys/kernel/mm/transparent_hugepage/enabled");
  sysfs_line("thp_defrag", "/sys/kernel/mm/transparent_hugepage/defrag");
  sysfs_line("max_ptes_none", "/sys/kernel/mm/transparent_hugepage/khugepaged/max_ptes_none");
  sysfs_line("pages_to_scan", "/sys/kernel/mm/transparent_hugepage/khugepaged/pages_to_scan");
  sysfs_line("scan_sleep_ms", "/sys/kernel/mm/transparent_hugepage/khugepaged/scan_sleep_millisecs");
  { FILE *f = fopen("/proc/uptime", "r"); double u = 0; if (f) { if (fscanf(f, "%lf", &u) != 1) u = 0; fclose(f); } printf(" uptime_s=%.0f", u); }
  printf(" full_scans=%ld pages_collapsed=%ld\n", full_scans(), pages_collapsed());
  fflush(stdout);
}
static void read_line(const char *phase, double t0) {
  long an, ah, rss; rd(&an, &ah, &rss);
  printf("READ t=%s elapsed_s=%.1f anon_kb=%ld ahp_kb=%ld rss_kb=%ld full_scans=%ld pages_collapsed=%ld\n", phase, now() - t0, an, ah, rss, full_scans(), pages_collapsed());
  fflush(stdout);
}

/* One smaps mapping: only writable, non-file, non-stack/vvar/vdso/vsyscall mappings are kept. */
struct map { unsigned long a, b; char perms[8], name[64]; long rss, anon, ahp; int eligible; char flags[160]; };
/* The smaps tables live in one mmap region marked MADV_NOHUGEPAGE and are skipped by load_maps, so the harness's own
 * bookkeeping never contributes AnonHugePages (a static table put the 3.4 MiB data/bss mapping over the 2 MiB threshold). */
#define MAXMAPS 4096
static struct map *tabs; static unsigned long tab_lo, tab_hi;
static struct map *tab(int k) { /* k = 0..2 */
  if (!tabs) {
    size_t sz = 3 * MAXMAPS * sizeof(struct map);
    tabs = mmap(0, sz, PROT_READ | PROT_WRITE, MAP_PRIVATE | MAP_ANONYMOUS, -1, 0);
    if (tabs == MAP_FAILED) { perror("mmap tables"); exit(1); }
    madvise(tabs, sz, MADV_NOHUGEPAGE);
    tab_lo = (unsigned long)tabs; tab_hi = tab_lo + sz;
  }
  return tabs + (size_t)k * MAXMAPS;
}
static int load_maps(struct map *m, int max) {
  FILE *f = fopen("/proc/self/smaps", "r"); char l[512]; int n = 0, keep = 0;
  while (f && fgets(l, sizeof l, f)) {
    unsigned long a, b; char p[8], rest[256] = "";
    if (sscanf(l, "%lx-%lx %7s %*s %*s %*s %255[^\n]", &a, &b, p, rest) >= 3) { /* key lines never match: no dash after the hex run */
      const char *name = rest; while (*name == ' ') name++;
      keep = p[0] == 'r' && p[1] == 'w' && !strchr(name, '/') && strncmp(name, "[stack", 6) && strncmp(name, "[v", 2) && !(tab_hi && a < tab_hi && b > tab_lo);
      if (keep && n < max) { memset(&m[n], 0, sizeof m[n]); m[n].a = a; m[n].b = b; strcpy(m[n].perms, p); snprintf(m[n].name, sizeof m[n].name, "%s", *name ? name : "anon"); n++; }
      else keep = 0;
      continue;
    }
    if (!keep) continue;
    struct map *c = &m[n - 1];
    if (!strncmp(l, "Rss:", 4)) sscanf(l + 4, "%ld", &c->rss);
    else if (!strncmp(l, "Anonymous:", 10)) sscanf(l + 10, "%ld", &c->anon);
    else if (!strncmp(l, "AnonHugePages:", 14)) sscanf(l + 14, "%ld", &c->ahp);
    else if (!strncmp(l, "THPeligible:", 12)) c->eligible = atoi(l + 12);
    else if (!strncmp(l, "VmFlags:", 8)) { snprintf(c->flags, sizeof c->flags, "%s", l + 9); c->flags[strcspn(c->flags, "\n")] = 0; for (char *q = c->flags; *q; q++) if (*q == ' ') *q = ','; }
  }
  if (f) fclose(f);
  return n;
}
static void dump_maps(const char *phase) {
  struct map *m = tab(0); int n = load_maps(m, MAXMAPS);
  long orss = 0, oahp = 0; int on = 0; unsigned long omax = 0;
  for (int i = 0; i < n; i++) {
    if (m[i].rss < 512 && m[i].ahp == 0) { if (m[i].rss > 0) { on++; orss += m[i].rss; oahp += m[i].ahp; if (m[i].b - m[i].a > omax) omax = m[i].b - m[i].a; } continue; }
    printf("MAP phase=%s range=%lx-%lx size_kb=%lu name=%s rss_kb=%ld anon_kb=%ld ahp_kb=%ld thp_eligible=%d flags=%s\n", phase, m[i].a, m[i].b, (m[i].b - m[i].a) / 1024, m[i].name, m[i].rss, m[i].anon, m[i].ahp, m[i].eligible, m[i].flags);
  }
  printf("MAPS_OTHER phase=%s count=%d rss_kb=%ld ahp_kb=%ld max_size_kb=%lu\n", phase, on, orss, oahp, omax / 1024); /* mappings with Rss < 512 KiB and no AnonHugePages */
  fflush(stdout);
}
/* madvise(MADV_COLLAPSE) on each mapping's 2 MiB-aligned span; then join each call with the post-call smaps. */
static void collapse(void) {
  struct map *m = tab(1), *after = tab(2); static unsigned long sa[4096], sb[4096]; static int ret[4096], err[4096]; static long pre[4096];
  int n = load_maps(m, MAXMAPS), ns = 0;
  for (int i = 0; i < n; i++) {
    unsigned long s = (m[i].a + 0x1fffff) & ~0x1fffffUL, e = m[i].b & ~0x1fffffUL;
    if (e <= s) continue;
    errno = 0; ret[ns] = madvise((void *)s, e - s, MADV_COLLAPSE); err[ns] = ret[ns] ? errno : 0; sa[ns] = s; sb[ns] = e; pre[ns] = m[i].ahp; ns++;
  }
  int na = load_maps(after, MAXMAPS);
  for (int i = 0; i < ns; i++) for (int j = 0; j < na; j++) if (sa[i] >= after[j].a && sa[i] < after[j].b)
    printf("SPAN range=%lx-%lx span_kb=%lu ret=%d errno=%d map_ahp_before_kb=%ld map_ahp_after_kb=%ld map_anon_after_kb=%ld map_size_kb=%lu\n", sa[i], sb[i], (sb[i] - sa[i]) / 1024, ret[i], err[i], pre[i], after[j].ahp, after[j].anon, (after[j].b - after[j].a) / 1024);
  printf("SPANS total=%d fail=%d\n", ns, ({ int f = 0; for (int i = 0; i < ns; i++) f += ret[i] != 0; f; }));
  fflush(stdout);
}

static pthread_barrier_t bar;
static unsigned long long rng_state = 88172645463325252ULL;
static inline unsigned long long xr(unsigned long long *s) { *s ^= *s << 13; *s ^= *s >> 7; *s ^= *s << 17; return *s; }
static size_t obj_size(unsigned long long *s) { return !strcmp(shape, "mixed") ? (size_t)16 << (xr(s) % 9) : 64; }
static void *burst(void *arg) {
  long id = (long)arg; unsigned long long rs = rng_state + 1000003ULL * (unsigned long long)(id + 1);
  size_t total = (size_t)mib * 1024 * 1024, cap = total / 16 + 2, stride = (size_t)stride_kb * 1024;
  int cpu = !strcmp(mode, "cpu"); long nreps = cpu ? reps : 1;
  pthread_barrier_wait(&bar);
  for (long r = 0; r < nreps && mib > 0; r++) {
    void **a = malloc(cap * sizeof *a); unsigned char *pin = calloc(cap, 1);
    size_t n = 0, cum = 0, next = stride / 2;
    while (cum < total) { /* the first object at or past stride/2 + k*stride of cumulative size survives (never in cpu mode) */
      size_t sz = obj_size(&rs); a[n] = malloc(sz); memset(a[n], 1, sz); cum += sz;
      if (stride && !cpu && cum >= next) { pin[n] = 1; next += stride; }
      n++;
    }
    for (size_t i = 0; i < n; i++) if (!pin[i]) free(a[i]); /* survivors stay allocated for the process lifetime */
    free(pin); free(a); RELEASE();
  }
  if (mib == 0) RELEASE();
  return 0;
}

static void reexec_for_thp(char **argv) {
  if (!strcmp(thp_mode, "on") || getenv("THP_DONE")) return;
  if (!strcmp(thp_mode, "off")) prctl(PR_SET_THP_DISABLE, 1, 0, 0, 0);
  else if (prctl(PR_SET_THP_DISABLE, 1, PR_THP_DISABLE_EXCEPT_ADVISED, 0, 0)) { perror("prctl advised"); exit(1); }
  setenv("THP_DONE", "1", 1);
  execv("/proc/self/exe", argv);
  perror("exec"); exit(1);
}
static long num(const char *flag, const char *v, long min) {
  char *e; errno = 0; long x = strtol(v, &e, 10);
  if (errno || *e || e == v || x < min) { fprintf(stderr, "thp: %s '%s' is not an integer >= %ld\n", flag, v, min); exit(2); }
  return x;
}
int main(int argc, char **argv) {
  for (int i = 1; i < argc; i++) if (!strcmp(argv[i], "--help")) { fputs(USAGE, stdout); return 0; }
  for (int i = 1; i < argc; i++) if (!strcmp(argv[i], "--version") || !strcmp(argv[i], "--build")) { puts("thp-harness 2 " ANAME); return 0; }
  for (int i = 1; i < argc; i++) {
    const char *k = argv[i], *v = i + 1 < argc ? argv[i + 1] : 0;
    if (!strcmp(k, "--collapse")) { do_collapse = 1; continue; }
    if (!v) { fprintf(stderr, "thp: missing value for %s\n%s", k, USAGE); return 2; }
    if (!strcmp(k, "--thp")) { thp_mode = v; if (strcmp(v, "on") && strcmp(v, "off") && strcmp(v, "advised")) { fprintf(stderr, "thp: --thp '%s'\n", v); return 2; } }
    else if (!strcmp(k, "--mode")) { mode = v; if (strcmp(v, "forced") && strcmp(v, "natural") && strcmp(v, "cpu")) { fprintf(stderr, "thp: --mode '%s'\n", v); return 2; } }
    else if (!strcmp(k, "--shape")) { shape = v; if (strcmp(v, "fixed") && strcmp(v, "mixed")) { fprintf(stderr, "thp: --shape '%s'\n", v); return 2; } }
    else if (!strcmp(k, "--stride-kb")) stride_kb = num(k, v, 0);
    else if (!strcmp(k, "--mib")) mib = num(k, v, 0);
    else if (!strcmp(k, "--threads")) threads = num(k, v, 1);
    else if (!strcmp(k, "--idle")) idle_s = num(k, v, 0);
    else if (!strcmp(k, "--sample")) sample_s = num(k, v, 1);
    else if (!strcmp(k, "--max-wait")) max_wait = num(k, v, 1);
    else if (!strcmp(k, "--scan-incs")) scan_incs = num(k, v, 1);
    else if (!strcmp(k, "--reps")) reps = num(k, v, 1);
    else if (!strcmp(k, "--stop-on-growth-mib")) stop_growth = (double)num(k, v, 0);
    else { fprintf(stderr, "thp: unknown option %s\n%s", k, USAGE); return 2; }
    i++;
  }
  if (threads > 64) { fprintf(stderr, "thp: --threads > 64\n"); return 2; }
  reexec_for_thp(argv);
  env_line();
  double t0 = now();
  if (!strcmp(mode, "forced") || !strcmp(mode, "natural")) read_line("pre", t0);
  pthread_t th[64]; pthread_barrier_init(&bar, 0, (unsigned)threads);
  for (long i = 0; i < threads; i++) pthread_create(&th[i], 0, burst, (void *)i);
  for (long i = 0; i < threads; i++) pthread_join(th[i], 0);
  if (!strcmp(mode, "cpu")) { printf("MEASURE burst_done 1\n"); return 0; }
  double trel = now();
  read_line("rel", trel); dump_maps("rel");
  long fs0 = full_scans(), anon0, ahp0, rss0; rd(&anon0, &ahp0, &rss0);
  if (!strcmp(mode, "forced")) {
    if (do_collapse) { collapse(); read_line("0", trel); dump_maps("post"); }
    printf("BOUNDARY\n"); fflush(stdout);
    for (long s = 0; s < idle_s; s++) sleep(1);
    long an, ah, rs; rd(&an, &ah, &rs); read_line("final", trel); dump_maps("final");
    printf("MEASURE ahp_rel_mib %.2f\nMEASURE anon_rel_mib %.2f\nMEASURE ahp_final_mib %.2f\nMEASURE anon_final_mib %.2f\n", ahp0 / 1024.0, anon0 / 1024.0, ah / 1024.0, an / 1024.0);
    return 0;
  }
  /* natural: sample until full_scans advanced by scan_incs past the release value */
  long inc1_anon = -1, inc1_ahp = -1; double inc1_t = -1; int stopped = 0; long fs = fs0;
  for (;;) {
    sleep((unsigned)sample_s);
    fs = full_scans(); long an, ah, rs; rd(&an, &ah, &rs);
    double t = now() - trel; read_line("s", trel);
    if (fs >= fs0 + 1 && inc1_t < 0) { inc1_t = t; inc1_anon = an; inc1_ahp = ah; printf("INC1 elapsed_s=%.1f full_scans=%ld anon_kb=%ld ahp_kb=%ld\n", t, fs, an, ah); fflush(stdout);
      if (stop_growth >= 0 && ((an - anon0) / 1024.0 >= stop_growth || (ah - ahp0) / 1024.0 >= stop_growth)) { stopped = 1; break; } }
    if (fs >= fs0 + scan_incs) break;
    if (t >= max_wait) { stopped = 2; break; }
  }
  { long an, ah, rs; rd(&an, &ah, &rs); dump_maps("final");
    printf("NATURAL full_scans_rel=%ld full_scans_read=%ld elapsed_s=%.1f stop=%s anon_rel_kb=%ld ahp_rel_kb=%ld anon_inc1_kb=%ld ahp_inc1_kb=%ld inc1_elapsed_s=%.1f anon_final_kb=%ld ahp_final_kb=%ld\n",
      fs0, fs, now() - trel, stopped == 1 ? "growth-at-inc1" : stopped == 2 ? "max-wait" : "scan-incs", anon0, ahp0, inc1_anon, inc1_ahp, inc1_t, an, ah);
    printf("MEASURE ahp_rel_mib %.2f\nMEASURE ahp_final_mib %.2f\nMEASURE anon_final_mib %.2f\nMEASURE full_scans_advanced %ld\n", ahp0 / 1024.0, ah / 1024.0, an / 1024.0, fs - fs0); }
  return 0;
}
