Workload sizes N (loop iterations): 0, 100000000, 300000000, 1000000000; 150 invocations in the fit (warm-up rounds excluded). Slope is per 1e8 iterations. "N=0 median" is the zero-work control (the source's intercept); "N=0 share" is that median over the median at N=300000000.

| source | unit | N=0 median | OLS intercept | OLS slope per 1e8 | R^2 | N=0 share |
| --- | --- | --- | --- | --- | --- | --- |
| `cpu_task_clock_ms` | ms | 0.325 | 0.7672 | 125.8 | 0.999994 | 0.086% |
| `cpu_user_ms` | ms | 0.84 | 0.9198 | 125.7 | 0.999987 | 0.222% |
| `cpu_sys_ms` | ms | 0 | 0.4304 | 0.007817 | 0.000468769 | n/a |
| `instructions_u` | count | 107900 | 108000 | 500000000 | 1 | 0.00719% |
| `cycles_u` | count | 234500 | 394800 | 400200000 | 1 | 0.0195% |
| `instructions_k` | count | 501000 | 558300 | 181800 | 0.991972 | 44.4% |
| `cycles_k` | count | 674500 | 856200 | 233500 | 0.943322 | 41.3% |
| `cgroup_usage_ms` | ms | 17.86 | 18.47 | 125.7 | 0.999993 | 4.52% |
