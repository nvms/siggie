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

Results from [js-reactivity-benchmark](https://github.com/milomg/js-reactivity-benchmark) on Node 24, in milliseconds. Smaller numbers are faster.

| Test | Siggie | Alien Signals | Preact Signals | Reactively | Vue |
|---|---:|---:|---:|---:|---:|
| createSignals | **2.1** | 2.5 | 2.2 | 2.8 | 7.4 |
| createComputations | 52.0 | 39.3 | 63.0 | **29.9** | 103.3 |
| updateSignals | 273.1 | 315.7 | **261.4** | 337.6 | 397.5 |
| avoidablePropagation | **79.7** | 85.7 | 82.0 | 104.2 | 139.1 |
| broadPropagation | 106.2 | 101.8 | **96.9** | 113.9 | 151.8 |
| deepPropagation | 34.2 | **33.0** | 35.2 | 41.6 | 57.6 |
| diamond | **67.0** | 83.7 | 80.1 | 84.0 | 110.7 |
| mux | **84.1** | 94.1 | 91.6 | 104.0 | 155.9 |
| repeatedObservers | 14.1 | 22.9 | **13.9** | 20.9 | 18.6 |
| triangle | **23.9** | 25.5 | 26.9 | 26.6 | 36.1 |
| unstable | 17.7 | 27.0 | **16.6** | 44.8 | 25.7 |
| molBench | 16.9 | 16.6 | 18.1 | **16.6** | 36.2 |
| cellx1000 | 8.7 | **7.7** | 14.3 | 16.3 | 36.7 |
| cellx2500 | **19.2** | 33.4 | 33.9 | 39.2 | 114.2 |
| 2-10x5 - lazy80% | **142.4** | 203.3 | 207.8 | 196.7 | 288.2 |
| 6-10x10 - dyn25% - lazy80% | 129.3 | 143.1 | 149.2 | **126.2** | 209.4 |
| 4-1000x12 - dyn5% | 284.6 | 311.8 | 376.1 | **282.8** | 496.8 |
| 25-1000x5 | 358.5 | 394.7 | 449.8 | **308.4** | 693.8 |
| 3-5x500 | 94.4 | 102.5 | 108.5 | **94.0** | 159.9 |
| 6-100x15 - dyn50% | **152.1** | 172.0 | 195.0 | 161.9 | 259.3 |
| Total | **1960** | 2216 | 2322 | 2152 | 3498 |

## Run

```sh
npm run bench
```

The adapters and workloads are in [`frameworks.js`](frameworks.js) and [`signal.bench.js`](signal.bench.js).
