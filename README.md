# Siggie

A small reactive runtime for JavaScript.

```sh
npm install siggie
```

```js
import { computed, effect, signal } from "siggie";

const price = signal(10);
const quantity = signal(2);
const total = computed(() => price.value * quantity.value);

effect(() => {
  console.log(total.value);
}, true);

price.value = 12;
quantity.value = 3;
```

## API

- `signal(value)` creates a writable signal.
- `computed(fn)` creates a lazy computed signal.
- `effect(fn, sync?, scope?)` creates an effect and returns its disposer.
- `batch(fn)` groups writes and coalesces synchronous effects.
- `flushSync()` drains queued effects.
- Read `.peek` without creating a dependency.
- Assign `.eq` to customize equality.
- A computed that throws rethrows the same error on every read until one of its inputs changes.

## Development

```sh
npm test
npm run bench
```

Benchmark results are in [`benchmarks/README.md`](benchmarks/README.md).
