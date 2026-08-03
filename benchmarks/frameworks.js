import { signal, computed, effect, batch as siggieBatch } from "../src/index.js";
import { Reactive, stabilize } from "@reactively/core";
import { signal as preactSignal, computed as preactComputed, effect as preactEffect, batch } from "@preact/signals-core";
import { signal as alienSignal, computed as alienComputed, effect as alienEffect, startBatch, endBatch } from "alien-signals";

function objectApi(makeSignal, makeComputed, makeEffect, runSync) {
  return {
    signal(value) {
      const node = makeSignal(value);
      return { get: () => node.value, set: value => { node.value = value; } };
    },
    computed(fn) {
      const node = makeComputed(fn);
      return { get: () => node.value };
    },
    effect: makeEffect,
    runSync,
    root: fn => fn(),
  };
}

export const Siggie = objectApi(signal, computed, fn => effect(fn, true), siggieBatch);

export const PreactSignals = objectApi(preactSignal, preactComputed, preactEffect, batch);

export const Reactively = {
  signal(value) { const node = new Reactive(value); return { get: () => node.get(), set: value => node.set(value) }; },
  computed(fn) { const node = new Reactive(fn); return { get: () => node.get() }; },
  effect: fn => new Reactive(fn, true),
  runSync(fn) { fn(); stabilize(); },
  root: fn => fn(),
};

export const AlienSignals = {
  signal(value) { const node = alienSignal(value); return { get: () => node(), set: value => node(value) }; },
  computed(fn) { const node = alienComputed(fn); return { get: () => node() }; },
  effect: alienEffect,
  runSync(fn) { startBatch(); try { fn(); } finally { endBatch(); } },
  root: fn => fn(),
};
