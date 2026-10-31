# Benchmarks

Throughput in operations per second. Each operation is the complete workload described below. Larger numbers are faster.

| Workload | Operation | Siggie | Alien Signals | Preact Signals | Reactively |
|---|---|---:|---:|---:|---:|
| Signal | Increment one signal with a read and write | **34.42M** | 25.65M | 27.06M | 27.49M |
| Deep computed | Update a signal and read through 9 computed nodes | **6.06M** | 4.05M | 4.50M | 3.32M |
| Cached computed | Read one computed that sums 9 signals | **31.21M** | 26.61M | 31.11M | 29.72M |
| Wide computed | Read a 9-signal computed, then update one dependency | **12.35M** | 6.81M | 6.46M | 9.27M |
| Batched effect | Update one signal 9 times and run its effect once | **9.65M** | 4.99M | 6.12M | 5.18M |
| Effect tree | Update 2 of 4 signals feeding 2 computeds and 1 effect | **8.08M** | 6.08M | 5.65M | 5.44M |
| Conditional effect | Toggle a conditional dependency off and back on in one batch | **24.09M** | 14.26M | 14.01M | 9.23M |
| Wide effect | Update 3 of 9 signals read twice by one effect | **7.66M** | 3.75M | 4.26M | 4.23M |
| Computed fan-out | Update 1 source and read 100 downstream computeds | **444.93K** | 333.95K | 303.84K | 353.83K |
| Effect fan-out | Update 1 source feeding 1 computed and 100 effects | **494.72K** | 437.98K | 435.58K | 366.75K |
| Independent effects | Update 1,000 signals with 1 effect each | **36.09K** | 20.36K | 20.90K | 24.59K |

## js-reactivity-benchmark

Results from [js-reactivity-benchmark](https://github.com/milomg/js-reactivity-benchmark) on Node 24 with `NODE_ENV=production`, in milliseconds. Smaller numbers are faster.

| Test | Siggie | Alien Signals | Preact Signals | Reactively | Vue |
|---|---:|---:|---:|---:|---:|
| createSignals | **2.2** | 2.3 | 2.3 | 2.7 | 7.3 |
| createComputations | 53.1 | 38.6 | 62.6 | **31.3** | 111.3 |
| updateSignals | 276.0 | 315.0 | **255.3** | 339.7 | 400.0 |
| avoidablePropagation | **81.0** | 86.9 | 81.7 | 106.3 | 140.2 |
| broadPropagation | 110.2 | 102.3 | **98.3** | 117.5 | 150.4 |
| deepPropagation | 36.8 | **33.1** | 35.4 | 42.7 | 60.2 |
| diamond | **70.5** | 86.4 | 77.8 | 87.1 | 111.0 |
| mux | **81.5** | 91.7 | 92.1 | 101.0 | 148.0 |
| repeatedObservers | 14.2 | 22.9 | **13.9** | 21.6 | 18.4 |
| triangle | **24.7** | 25.8 | 26.8 | 27.1 | 37.1 |
| unstable | 17.5 | 26.6 | **16.2** | 44.6 | 25.7 |
| molBench | 15.8 | 15.8 | **15.8** | 16.1 | 34.8 |
| cellx1000 | 9.1 | **4.3** | 8.6 | 8.9 | 17.0 |
| cellx2500 | 25.4 | **13.8** | 20.6 | 18.0 | 48.0 |
| 2-10x5 - lazy80% | **141.3** | 200.9 | 207.6 | 201.2 | 292.1 |
| 6-10x10 - dyn25% - lazy80% | 131.4 | 150.6 | 151.3 | **130.8** | 213.5 |
| 4-1000x12 - dyn5% | 303.8 | 342.8 | 392.6 | **277.5** | 497.7 |
| 25-1000x5 | 353.5 | 405.3 | 450.1 | **314.0** | 681.8 |
| 3-5x500 | **93.5** | 105.5 | 114.1 | 101.7 | 161.2 |
| 6-100x15 - dyn50% | **151.7** | 180.8 | 198.2 | 162.7 | 262.9 |
| Total | **1993** | 2251 | 2321 | 2153 | 3419 |

## Run

```sh
npm run bench
```

The adapters and workloads are in [`frameworks.js`](frameworks.js) and [`signal.bench.js`](signal.bench.js).
