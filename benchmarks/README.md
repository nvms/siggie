# Benchmarks

Throughput in operations per second. Each operation is the complete workload described below. Larger numbers are faster.

| Workload | Operation | Siggie | Alien Signals | Preact Signals | Reactively |
|---|---|---:|---:|---:|---:|
| Signal | Increment one signal with a read and write | **47.62M** | 38.45M | 34.22M | 41.90M |
| Deep computed | Update a signal and read through 9 computed nodes | 5.01M | **5.11M** | 5.07M | 3.73M |
| Cached computed | Read one computed that sums 9 signals | 46.05M | 44.38M | **46.17M** | 45.16M |
| Wide computed | Read a 9-signal computed, then update one dependency | **10.68M** | 8.55M | 7.60M | 10.57M |
| Batched effect | Update one signal 9 times and run its effect once | **8.36M** | 5.95M | 6.21M | 6.16M |
| Effect tree | Update 2 of 4 signals feeding 2 computeds and 1 effect | **8.61M** | 7.19M | 6.68M | 6.27M |
| Conditional effect | Toggle a conditional dependency off and back on in one batch | **35.93M** | 17.75M | 16.34M | 10.65M |
| Wide effect | Update 3 of 9 signals read twice by one effect | **6.25M** | 4.40M | 4.79M | 4.69M |
| Computed fan-out | Update 1 source and read 100 downstream computeds | **468.49K** | 394.53K | 376.50K | 377.84K |
| Effect fan-out | Update 1 source feeding 1 computed and 100 effects | **545.17K** | 460.82K | 448.81K | 391.21K |
| Independent effects | Update 1,000 signals with 1 effect each | 26.59K | 24.60K | 24.54K | **27.60K** |

## Run

```sh
npm run bench
```

The adapters and workloads are in [`frameworks.js`](frameworks.js) and [`signal.bench.js`](signal.bench.js).
