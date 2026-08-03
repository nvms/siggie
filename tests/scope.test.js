import { expect, test, vi, describe } from "vitest";
import { signal, effect, computed, flushSync } from "../src/index.js";
describe("scoped effects", () => {
  test("scope collects computeds created inside effect", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(1);
  });
  test("scope collects nested effects", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      effect(() => {
        a.value;
      });
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(1);
  });
  test("scope collects multiple computeds", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      computed(() => a.value * 2);
      computed(() => a.value * 3);
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(2);
  });
  test("scope does not collect plain signals", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      signal(0);
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(0);
  });
  test("effect itself is not added to its own scope", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(1);
  });
  test("dispose scoped effect disposes collected computeds", () => {
    const scope = [];
    const a = signal(1);
    const dispose = effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    const collected = scope[0];
    expect(collected.value).toBe(2);
    a.value = 3;
    flushSync();
    expect(collected.value).toBe(6);
    dispose();
    expect(collected.value).toBeNull();
    a.value = 5;
    flushSync();
    expect(collected.value).toBeNull();
  });
  test("dispose scoped effect disposes collected nested effects", () => {
    const scope = [];
    const a = signal(1);
    const innerSpy = vi.fn();
    const dispose = effect(() => {
      a.value;
      effect(() => {
        a.value;
        innerSpy();
      });
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(1);
    expect(innerSpy).toHaveBeenCalledTimes(1);
    innerSpy.mockClear();
    a.value = 2;
    flushSync();
    expect(scope).toHaveLength(2);
    expect(innerSpy).toHaveBeenCalledTimes(2);
    innerSpy.mockClear();
    dispose();
    a.value = 3;
    flushSync();
    expect(innerSpy).not.toHaveBeenCalled();
  });
  test("sync scoped effect collects computeds", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, true, scope);
    expect(scope).toHaveLength(1);
  });
  test("sync scoped effect disposes collected items on dispose", () => {
    const scope = [];
    const a = signal(1);
    const dispose = effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, true, scope);
    const collected = scope[0];
    expect(collected.value).toBe(2);
    dispose();
    expect(collected.value).toBeNull();
    a.value = 5;
    expect(collected.value).toBeNull();
  });
  test("multiple effects can share a single scope", () => {
    const scope = [];
    const a = signal(1);
    effect(() => {
      a.value;
      computed(() => a.value);
    }, false, scope);
    effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    expect(scope).toHaveLength(2);
  });
  test("unrelated effects are unaffected by scope disposal", () => {
    const scope = [];
    const a = signal(1);
    const unrelatedSpy = vi.fn();
    effect(() => {
      a.value;
      unrelatedSpy();
    });
    flushSync();
    unrelatedSpy.mockClear();
    const dispose = effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    dispose();
    a.value = 2;
    flushSync();
    expect(unrelatedSpy).toHaveBeenCalledTimes(1);
  });
  test("disposing scoped effect multiple times is safe", () => {
    const scope = [];
    const a = signal(1);
    const dispose = effect(() => {
      a.value;
      computed(() => a.value * 2);
    }, false, scope);
    flushSync();
    dispose();
    dispose();
    dispose();
    expect(scope[0].value).toBeNull();
  });
});
