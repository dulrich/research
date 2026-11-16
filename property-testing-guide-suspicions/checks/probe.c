/* Probe for the two build_system suspicions. BUILD_C is the path of the target's single translation unit,
 * passed as -DBUILD_C='"..."'. The target's own main is renamed so this file can supply one. */
#define main hacer_main
#include BUILD_C
#undef main
#include <sys/wait.h>

int main(void) {
	string_cache_init(64);

	/* strncache(in, n): two calls with the same first n bytes should return the same cached pointer */
	char* a = strncache("abcdef", 3);
	int fill_after_first = (int)string_cache.fill;
	char* b = strncache("abcdef", 3);
	int fill_after_second = (int)string_cache.fill;
	printf("PROBE strncache same_pointer=%d fill_after_first=%d fill_after_second=%d stored=%s\n",
	       a == b, fill_after_first, fill_after_second, a);

	/* a key that is exactly the n-byte prefix is found (the lookup works when the key ends at n) */
	char* c = strncache("abc", 3);
	printf("PROBE strncache exact_key_hits_existing=%d\n", c == a || c == b);

	/* path_join_ with a NULL argument, in a child so the crash is observable */
	fflush(stdout);
	pid_t p = fork();
	if (p == 0) {
		char* r = path_join("a", NULL);
		printf("PROBE path_join_null returned=%s\n", r ? r : "(null)");
		fflush(stdout);
		_exit(0);
	}
	int st = 0;
	waitpid(p, &st, 0);
	if (WIFSIGNALED(st)) printf("PROBE path_join_null signal=%d\n", WTERMSIG(st));
	else printf("PROBE path_join_null exit=%d\n", WEXITSTATUS(st));
	printf("PROBE path_join_ok value=%s\n", path_join("a", "b"));
	return 0;
}
