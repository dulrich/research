/* retain: reproducer for glibc non-main-arena retention after a burst of small allocations.
 *
 * A burst (default: on a worker thread, which owns a non-main arena) allocates --mib MiB of small
 * nodes, frees them all, optionally calls malloc_trim(0), then prints BOUNDARY and stays alive for
 * --idle seconds. Whether the burst is retained is set by the experimenter:
 *   - no pin live in the arena: the freed memory is the arena's top chunk, and malloc_trim does
 *     not shrink a non-main arena's top (bad mode, retained);
 *   - one live 48 B chunk near the end of the burst: everything below it sits in bins and
 *     malloc_trim madvises it (good mode, released).
 * An optional late free (a >= 64 KiB malloc+free in the same arena at a random delay after the
 * boundary) runs heap_trim and releases the top chunk, so the retention ends at a known time.
 * Ground truth is printed as MEASURE lines after the idle period. Single translation unit, no deps. */
#define _GNU_SOURCE
#include <errno.h>
#include <malloc.h>
#include <pthread.h>
#include <stdatomic.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <unistd.h>

#define USAGE \
  "usage: retain [--main] [--mib M] [--fast-pct P] [--pin-at F | --bad-p p] [--trim] [--trim-threshold BYTES]\n" \
  "              [--late-max D] [--idle S] [--seed N]\n" \
  "       retain --pool W --requests R [--pool-q Q] [--trim] [--trim-threshold BYTES] [--idle S] [--seed N]\n" \
  "       retain --help\n" \
  "Burst: M MiB (default 25) of small nodes, P%% fastbin-sized (default 70), on a worker thread (default) or the\n" \
  "main thread (--main), then freed in allocation order. Pin: --pin-at F keeps one live 48 B chunk at fraction\n" \
  "F of the burst; --bad-p p is the bad-mode probability: with probability p no pin (retained), else a pin at\n" \
  "0.99 (released by trim). No pin option means no pin (bad mode). --trim calls malloc_trim(0) before the\n" \
  "boundary. --trim-threshold sets mallopt(M_TRIM_THRESHOLD). --late-max D schedules a 100000 B malloc+free\n" \
  "in the burst's arena at a delay uniform in [0, D] s after the boundary (needs --idle > D; 0 disables).\n" \
  "Pool: W persistent workers serve R requests of random 8-27 MiB bursts, each keeping a 64 B pin with\n" \
  "probability Q (default 0.3); trim and boundary follow once all requests finish.\n" \
  "Prints BOUNDARY, idles S seconds (default 3), then MEASURE bad_drawn (1 = no pin, 0 = pin, -1 pool),\n" \
  "release_delay_s (late-free delay when the late free applies to a bad-mode burst, else -1),\n" \
  "release_actual_s (measured, -1 if none), self_rssanon_boundary_mib, self_rssanon_mib.\n" \
  "The seed is drawn from /dev/urandom unless --seed N (printed on stderr). Exit 2 on bad arguments.\n"

static uint64_t S;
static uint64_t rng(void) { S ^= S << 13; S ^= S >> 7; S ^= S << 17; return S; }
static double urand(void) { return (rng() >> 11) * (1.0 / 9007199254740992.0); } /* [0,1) */

static double now_s(void) {
  struct timespec t; clock_gettime(CLOCK_MONOTONIC, &t);
  return t.tv_sec + t.tv_nsec * 1e-9;
}
static void sleep_until(double abs_s) {
  struct timespec t; t.tv_sec = (time_t)abs_s; t.tv_nsec = (long)((abs_s - (double)t.tv_sec) * 1e9);
  while (clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &t, NULL) == EINTR) {}
}
static double rssanon_mib(void) {
  FILE *f = fopen("/proc/self/status", "r"); char l[256]; long kb = -1;
  if (!f) return -1;
  while (fgets(l, sizeof l, f)) if (!strncmp(l, "RssAnon:", 8)) kb = atol(l + 8);
  fclose(f); return kb < 0 ? -1 : kb / 1024.0;
}
static int die(const char *m, const char *a) { fprintf(stderr, "retain: %s%s%s\n", m, a ? ": " : "", a ? a : ""); return 2; }

/* ---- configuration ---- */
static long mib = 25, fast_pct = 70, pool_w = 0, pool_r = 0;
static double pin_at = -1, bad_p = -1, late_max = 0, idle_s = 3, pool_q = 0.3;
static int use_main = 0, do_trim = 0;
static int bad_drawn = 1;           /* decided before the burst: no pin placed */
static double late_delay = -1;      /* drawn delay (s), -1 when no late free */

/* ---- thread-mode hand-off: worker <-> main ---- */
static pthread_mutex_t mu = PTHREAD_MUTEX_INITIALIZER;
static pthread_cond_t cv = PTHREAD_COND_INITIALIZER;
static int phase;                   /* 0 burst running, 1 burst done, 2 boundary t0 set, 3 stop */
static double t0;                   /* boundary time (monotonic) */
static double late_actual = -1;
static void *keep_pin;              /* the live chunk, never freed */

static size_t pick(void) {
  if ((long)(rng() % 100) < fast_pct) return 16 + rng() % 100; /* nodes, short strings: fastbin range */
  if (rng() % 30 < 25) return 128 + rng() % 900;               /* vecs, maps */
  return 1024 + rng() % 8000;                                  /* larger vec growth */
}

static void burst(void) {
  size_t cap = 1 << 20, n = 0, bytes = 0, target = (size_t)mib << 20;
  void **v = malloc(cap * sizeof *v);
  double at = pin_at >= 0 ? pin_at : (bad_drawn ? -1 : 0.99);
  int pinned = 0;
  while (bytes < target) {
    size_t sz = pick(); void *p = malloc(sz); memset(p, 1, sz); bytes += sz;
    if (n == cap) { cap *= 2; v = realloc(v, cap * sizeof *v); }
    v[n++] = p;
    if (at >= 0 && !pinned && bytes >= at * target) { keep_pin = malloc(48); memset(keep_pin, 1, 48); pinned = 1; }
  }
  for (size_t i = 0; i < n; i++) free(v[i]);
  free(v);
}

/* A >= 64 KiB non-mmapped malloc+free in the calling thread's arena; the volatile stops GCC eliding the pair. */
static void late_free(void) { void *volatile k = malloc(100000); memset(k, 1, 100000); free(k); }

static void *worker(void *a) {
  (void)a;
  burst();
  pthread_mutex_lock(&mu); phase = 1; pthread_cond_broadcast(&cv);
  while (phase < 2) pthread_cond_wait(&cv, &mu);
  pthread_mutex_unlock(&mu);
  if (late_delay >= 0) { sleep_until(t0 + late_delay); late_free(); late_actual = now_s() - t0; }
  pthread_mutex_lock(&mu);
  while (phase < 3) pthread_cond_wait(&cv, &mu);   /* stay alive (own arena stays attached) until the end */
  pthread_mutex_unlock(&mu);
  return NULL;
}

/* ---- pool mode ---- */
static atomic_int next_req, done_req, stop_pool;
static atomic_int pool_seed_ctr;
static void *pool_worker(void *a) {
  uint64_t s = S ^ ((uint64_t)(uintptr_t)a + 1) * 0x2545F4914F6CDD1DULL; if (!s) s = 1;
#define R64 (s ^= s << 13, s ^= s >> 7, s ^= s << 17, s)
  void **v = malloc(sizeof(void *) * 600000);
  for (;;) {
    int r = atomic_fetch_add(&next_req, 1); if (r >= pool_r) break;
    size_t target = (size_t)(8 + R64 % 20) << 20, bytes = 0, n = 0; void *keep = NULL;
    double at = (R64 % 1000) / 1000.0; int pin = (R64 % 1000) < pool_q * 1000;
    while (bytes < target && n < 600000) {
      uint64_t k = R64 % 100; size_t sz = k < 70 ? 16 + R64 % 100 : k < 95 ? 128 + R64 % 900 : 1024 + R64 % 8000;
      void *p = malloc(sz); memset(p, 1, sz); v[n++] = p; bytes += sz;
      if (pin && !keep && bytes >= at * target) keep = malloc(64);
    }
    for (size_t i = 0; i < n; i++) free(v[i]);
    usleep(R64 % 20000);
    atomic_fetch_add(&done_req, 1);
  }
  while (!atomic_load(&stop_pool)) usleep(10000);
  return NULL;
}

static int parse_long(const char *s, long lo, long *out) {
  char *e; errno = 0; long x = strtol(s, &e, 10);
  if (errno || *s == 0 || *e || x < lo) return 0; *out = x; return 1;
}
static int parse_dbl(const char *s, double lo, double hi, double *out) {
  char *e; errno = 0; double x = strtod(s, &e);
  if (errno || *s == 0 || *e || !(x >= lo) || !(x <= hi)) return 0; *out = x; return 1;
}

int main(int c, char **v) {
  long seed = 0, thr = -1; int have_seed = 0, pool = 0;
  for (int i = 1; i < c; i++) {
    const char *k = v[i]; const char *val = (i + 1 < c) ? v[i + 1] : NULL;
    if (!strcmp(k, "--help")) { printf(USAGE); return 0; }
    else if (!strcmp(k, "--main")) use_main = 1;
    else if (!strcmp(k, "--trim")) do_trim = 1;
    else if (!val) return die("missing value for", k);
    else if (!strcmp(k, "--mib")) { if (!parse_long(val, 1, &mib)) return die("bad --mib", val); i++; }
    else if (!strcmp(k, "--fast-pct")) { if (!parse_long(val, 0, &fast_pct) || fast_pct > 100) return die("bad --fast-pct", val); i++; }
    else if (!strcmp(k, "--pin-at")) { if (!parse_dbl(val, 0, 1, &pin_at)) return die("bad --pin-at", val); i++; }
    else if (!strcmp(k, "--bad-p")) { if (!parse_dbl(val, 0, 1, &bad_p)) return die("bad --bad-p", val); i++; }
    else if (!strcmp(k, "--trim-threshold")) { if (!parse_long(val, 0, &thr) || thr > 2147483647L) return die("bad --trim-threshold", val); i++; }
    else if (!strcmp(k, "--late-max")) { if (!parse_dbl(val, 0, 1e6, &late_max)) return die("bad --late-max", val); i++; }
    else if (!strcmp(k, "--idle")) { if (!parse_dbl(val, 0, 1e6, &idle_s)) return die("bad --idle", val); i++; }
    else if (!strcmp(k, "--pool")) { if (!parse_long(val, 1, &pool_w) || pool_w > 64) return die("bad --pool", val); pool = 1; i++; }
    else if (!strcmp(k, "--requests")) { if (!parse_long(val, 1, &pool_r)) return die("bad --requests", val); i++; }
    else if (!strcmp(k, "--pool-q")) { if (!parse_dbl(val, 0, 1, &pool_q)) return die("bad --pool-q", val); i++; }
    else if (!strcmp(k, "--seed")) { if (!parse_long(val, 0, &seed)) return die("bad --seed", val); have_seed = 1; i++; }
    else return die("unknown argument", k);
  }
  if (pin_at >= 0 && bad_p >= 0) return die("--pin-at and --bad-p are exclusive", NULL);
  if (pool && (pool_r == 0 || use_main || pin_at >= 0 || bad_p >= 0 || late_max > 0)) return die("--pool needs --requests and excludes --main, --pin-at, --bad-p, --late-max", NULL);
  if (!pool && pool_r) return die("--requests needs --pool", NULL);
  if (late_max > 0 && idle_s <= late_max) return die("--late-max must be less than --idle", NULL);
  if (!have_seed) {
    FILE *f = fopen("/dev/urandom", "r"); uint64_t u = 0;
    if (!f || fread(&u, sizeof u, 1, f) != 1) return die("cannot read /dev/urandom", NULL);
    fclose(f); seed = (long)(u >> 1);
  }
  fprintf(stderr, "retain: seed %ld\n", seed);
  S = 0x9e3779b97f4a7c15ULL ^ (uint64_t)seed * 0x2545F4914F6CDD1DULL; if (!S) S = 1;
  for (int i = 0; i < 8; i++) rng();
  if (thr >= 0) mallopt(M_TRIM_THRESHOLD, (int)thr);

  if (pool) {
    bad_drawn = -1;
    pthread_t t[64];
    for (int i = 0; i < pool_w; i++) pthread_create(&t[i], NULL, pool_worker, (void *)(uintptr_t)i);
    while (atomic_load(&done_req) < pool_r) usleep(10000);
    if (do_trim) malloc_trim(0);
    double rb = rssanon_mib(); double b0 = now_s();
    printf("BOUNDARY\n"); fflush(stdout);
    sleep_until(b0 + idle_s);
    printf("MEASURE bad_drawn -1\nMEASURE release_delay_s -1\nMEASURE release_actual_s -1\nMEASURE self_rssanon_boundary_mib %.2f\nMEASURE self_rssanon_mib %.2f\n", rb, rssanon_mib());
    fflush(stdout);
    atomic_store(&stop_pool, 1); for (int i = 0; i < pool_w; i++) pthread_join(t[i], NULL);
    return 0;
  }

  /* Decide the pin before the burst: bad_drawn = 1 iff no pin is placed. p=0 never draws bad, p=1 always does. */
  if (pin_at >= 0) bad_drawn = 0;
  else if (bad_p >= 0) bad_drawn = urand() < bad_p;
  else bad_drawn = 1;
  if (late_max > 0 && bad_drawn) late_delay = urand() * late_max;

  double rb, b0;
  pthread_t th;
  if (use_main) {
    burst();
    if (do_trim) malloc_trim(0);
    rb = rssanon_mib(); b0 = now_s(); printf("BOUNDARY\n"); fflush(stdout);
    if (late_delay >= 0) { sleep_until(b0 + late_delay); late_free(); late_actual = now_s() - b0; }
  } else {
    pthread_create(&th, NULL, worker, NULL);
    pthread_mutex_lock(&mu); while (phase < 1) pthread_cond_wait(&cv, &mu); pthread_mutex_unlock(&mu);
    if (do_trim) malloc_trim(0);
    rb = rssanon_mib();
    pthread_mutex_lock(&mu);
    b0 = t0 = now_s(); printf("BOUNDARY\n"); fflush(stdout);
    phase = 2; pthread_cond_broadcast(&cv); pthread_mutex_unlock(&mu);
  }
  sleep_until(b0 + idle_s);
  printf("MEASURE bad_drawn %d\nMEASURE release_delay_s %.3f\nMEASURE release_actual_s %.3f\nMEASURE self_rssanon_boundary_mib %.2f\nMEASURE self_rssanon_mib %.2f\n",
         bad_drawn, late_delay, late_actual, rb, rssanon_mib());
  fflush(stdout);
  if (!use_main) { pthread_mutex_lock(&mu); phase = 3; pthread_cond_broadcast(&cv); pthread_mutex_unlock(&mu); pthread_join(th, NULL); }
  return 0;
}
