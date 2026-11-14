Workload sizes N (loop iterations): 0, 100000000, 300000000, 1000000000; 30 invocations in the fit (warm-up rounds excluded). Slope is per 1e8 iterations. "N=0 median" is the zero-work control (the source's intercept); "N=0 share" is that median over the median at N=300000000.

| source | unit | N=0 median | OLS intercept | OLS slope per 1e8 | R^2 | N=0 share |
| --- | --- | --- | --- | --- | --- | --- |
| `cpu_task_clock_ms` | ms | 0.335 | 2.162 | 74.82 | 0.999519 | 0.15% |
| `cpu_user_ms` | ms | 0.483 | 2.159 | 74.83 | 0.999496 | 0.216% |
| `cpu_sys_ms` | ms | 0 | 0.1786 | -0.008761 | 0.00182217 | n/a |
| `instructions_u` | count | 102900 | 103000 | 500000000 | 1 | 0.00686% |
| `cycles_u` | count | 148500 | 139300 | 400100000 | 1 | 0.0124% |
| `instructions_k` | count | 1890000 | 1965000 | 164900 | 0.960178 | 76.8% |
| `cycles_k` | count | 1611000 | 1944000 | 313400 | 0.836135 | 56.8% |
| `cgroup_usage_ms` | ms | 10.67 | 12.75 | 74.87 | 0.999479 | 4.55% |
