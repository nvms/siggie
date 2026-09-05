import { describe, expect, test } from "vitest";
import { Sig, batch, computed, effect, flushSync, signal } from "../src/index.js";

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

for (const makeComputed of [computed, fn => new Sig(fn, true)]) {
  test(`refreshes and tracks ${makeComputed === computed ? "computed" : "Sig"} reads`, () => {
    const source = signal(1);
    let runs = 0;
    const derived = makeComputed(() => { runs++; return source.value * 2; });
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
}
