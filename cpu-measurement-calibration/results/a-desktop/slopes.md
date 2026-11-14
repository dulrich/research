Workload sizes N (loop iterations): 0, 100000000, 300000000, 1000000000; 150 invocations in the fit (warm-up rounds excluded). Slope is per 1e8 iterations. "N=0 median" is the zero-work control (the source's intercept); "N=0 share" is that median over the median at N=300000000.

| source | unit | N=0 median | OLS intercept | OLS slope per 1e8 | R^2 | N=0 share |
| --- | --- | --- | --- | --- | --- | --- |
| `cpu_task_clock_ms` | ms | 0.34 | 0.4237 | 74.81 | 0.999961 | 0.151% |
| `cpu_user_ms` | ms | 0.487 | 0.4087 | 74.77 | 0.999944 | 0.217% |
| `cpu_sys_ms` | ms | 0 | 0.1806 | 0.04454 | 0.0208591 | n/a |
| `instructions_u` | count | 102900 | 103000 | 500000000 | 1 | 0.00686% |
| `cycles_u` | count | 147300 | 146200 | 400100000 | 1 | 0.0123% |
| `instructions_k` | count | 1878000 | 2050000 | 195000 | 0.686172 | 73.3% |
| `cycles_k` | count | 1627000 | 2161000 | 485100 | 0.689757 | 48.5% |
| `cgroup_usage_ms` | ms | 10.85 | 11.13 | 74.85 | 0.999957 | 4.6% |
