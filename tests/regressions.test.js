import { describe, expect, test } from "vitest";
import { batch, computed, effect, flushSync, signal } from "../src/index.js";

for (const sync of [true, false]) {
  describe(sync ? "synchronous regressions" : "microtask regressions", () => {
    test("skips effects disposed while queued", () => {
      const source = signal(0);
      let stop;
      const seen = [];
      const first = effect(() => { if (source.value) stop(); }, sync);
      stop = effect(() => { seen.push(source.value); }, sync);
      flushSync();
      source.value = 1;
      flushSync();
      expect(seen).toEqual([0]);
      first();
    });

    test("refreshes shared values after an interleaved writer", () => {
      const source = signal(0);
      const trigger = signal(0);
      const shared = computed(() => source.value % 2);
      const seen = [];
      const stops = [
        effect(() => { shared.value; }, sync),
        effect(() => { if (trigger.value) source.value = 3; }, sync),
        effect(() => { seen.push(shared.value); }, sync),
      ];
      flushSync();
      batch(() => { source.value = 2; trigger.value = 1; });
      flushSync();
      expect(seen.at(-1)).toBe(1);
      stops.forEach(stop => stop());
    });

    test("retains upstream tracking after computed dependency reordering", () => {
      const flip = signal(false);
      const a = signal(1);
      const b = signal(2);
      const c = computed(() => a.value);
      const d = computed(() => b.value);
      const seen = [];
      const stop = effect(() => {
        seen.push(flip.value ? [d.value, c.value] : [c.value, d.value]);
      }, sync);
      flushSync();
      flip.value = true;
      flushSync();
      b.value = 3;
      flushSync();
      expect(seen).toEqual([[1, 2], [2, 1], [3, 1]]);
      stop();
    });

    test("direct effects can change dependency count and run cleanup", () => {
      const a = signal(0);
      const b = signal(10);
      const seen = [];
      const cleaned = [];
      const stop = effect(() => {
        const value = a.value ? a.value + b.value : a.value;
        seen.push(value);
        return () => { cleaned.push(value); };
      }, sync);
      flushSync();
      a.value = 1;
      flushSync();
      b.value = 20;
      flushSync();
      a.value = 0;
      flushSync();
      b.value = 30;
      flushSync();
      stop();
      expect(seen).toEqual([0, 11, 21, 0]);
      expect(cleaned).toEqual(seen);
    });
  });
}

test("computed reads observe batch writes without running effects", () => {
  const source = signal(0);
  const doubled = computed(() => source.value * 2);
  const seen = [];
  const stop = effect(() => { seen.push(doubled.value); }, true);
  batch(() => {
    source.value = 1;
    expect(doubled.value).toBe(2);
    source.value = 2;
    expect(doubled.peek).toBe(4);
    expect(seen).toEqual([0]);
  });
  expect(seen).toEqual([0, 4]);
  stop();
});

test("writable computeds coalesce assignments inside batches", () => {
  const value = computed(() => 0);
  const seen = [];
  const stop = effect(() => { seen.push(value.value); }, true);
  batch(() => {
    value.value = 1;
    value.value = 2;
    expect(seen).toEqual([0]);
  });
  expect(seen).toEqual([0, 2]);
  stop();
});

test("refreshes and tracks computed reads", () => {
  const source = signal(1);
  let runs = 0;
  const derived = computed(() => { runs++; return source.value * 2; });
  expect(derived.value).toBe(2);
  expect(derived.value).toBe(2);
  expect(runs).toBe(1);
  const seen = [];
  const stop = effect(() => { seen.push(derived.value + derived.value); }, true);
  source.value = 2;
  expect(seen).toEqual([4, 8]);
  batch(() => {
    source.value = 3;
    expect(derived.value).toBe(6);
    source.value = 4;
    expect(derived.peek).toBe(8);
    expect(seen).toEqual([4, 8]);
  });
  expect(seen).toEqual([4, 8, 16]);
  stop();
  source.value = 5;
  expect(derived.value).toBe(10);
});

test("skips a computed whose computed input recomputes to the same value", () => {
  const a = signal(1);
  const d = signal(1);
  const positive = computed(() => d.value > 0);
  let runs = 0;
  const total = computed(() => { runs++; return a.value + (positive.value ? 1 : 0); });
  const stop = effect(() => { total.value; }, true);
  runs = 0;
  d.value = 2;
  expect(runs).toBe(0);
  a.value = 2;
  expect(runs).toBe(1);
  stop();
});

test("unobserved computeds do not retain subscriptions to their sources", () => {
  const source = signal(1);
  let runs = 0;
  const derived = Array.from({ length: 100 }, () => computed(() => { runs++; return source.value; }));
  derived.forEach(node => node.value);
  expect(source._subs).toBeNull();
  runs = 0;
  derived.forEach(node => node.value);
  expect(runs).toBe(0);
  source.value = 2;
  expect(runs).toBe(0);
  expect(derived.map(node => node.value).every(value => value === 2)).toBe(true);
  expect(runs).toBe(100);
});

test("computeds rethrow their error until an input changes", () => {
  const source = signal(1);
  let runs = 0;
  const derived = computed(() => {
    runs++;
    if (source.value === 1) throw new Error("boom");
    return source.value;
  });
  expect(() => derived.value).toThrow("boom");
  expect(() => derived.peek).toThrow("boom");
  expect(runs).toBe(1);
  source.value = 2;
  expect(derived.value).toBe(2);
});

test("effects observe a computed recovering from an error", () => {
  const source = signal(1);
  const derived = computed(() => {
    if (source.value === 1) throw new Error("boom");
    return source.value;
  });
  const seen = [];
  const stop = effect(() => {
    try { seen.push(derived.value); } catch (error) { seen.push(error.message); }
  }, true);
  source.value = 2;
  source.value = 1;
  expect(seen).toEqual(["boom", 2, "boom"]);
  stop();
});

test("detects cycles between computeds", () => {
  const a = computed(() => b.value);
  const b = computed(() => a.value);
  expect(() => a.value).toThrow("Cycle detected");
});

test("a throwing effect does not stop the rest of the flush", () => {
  const source = signal(0);
  const seen = [];
  const stops = [
    effect(() => { if (source.value) throw new Error("boom"); }),
    effect(() => { seen.push(source.value); }),
  ];
  flushSync();
  source.value = 1;
  expect(() => flushSync()).toThrow("boom");
  expect(seen).toEqual([0, 1]);
  stops.forEach(stop => stop());
});

test("resubscribing to an unwound computed does not recompute it", () => {
  const source = signal(1);
  let runs = 0;
  const derived = computed(() => { runs++; return source.value * 2; });
  const first = effect(() => { derived.value; }, true);
  first();
  const seen = [];
  const second = effect(() => { seen.push(derived.value); }, true);
  expect(runs).toBe(1);
  source.value = 2;
  expect(seen).toEqual([2, 4]);
  second();
});
