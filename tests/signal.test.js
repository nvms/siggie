import { expect, test, vi, describe, it } from "vitest";
import { signal, effect, computed, flushSync } from "../src/index.js";
describe("state", () => {
  test("store and return a value", () => {
    const a = signal(1);
    expect(a.value).toBe(1);
  });
  test("is updating", () => {
    const a = signal(1);
    a.value = 2;
    expect(a.value).toBe(2);
  });
  test("is always updating", () => {
    const a = signal(1);
    a.value = 2;
    expect(a.value).toBe(2);
    a.value = 3;
    expect(a.value).toBe(3);
  });
});
describe("memos", () => {
  test("is caching", () => {
    const a = signal(1);
    const b = signal(2);
    const cSpy = vi.fn(() => a.value + b.value);
    const c = computed(cSpy);
    expect(c.value).toBe(3);
    expect(c.value).toBe(3);
    expect(c.value).toBe(3);
    expect(cSpy).toHaveBeenCalledTimes(1);
  });
  test("is lazy", () => {
    const a = signal("a");
    const b = signal("b");
    const cSpy = vi.fn(() => a.value + b.value);
    const c = computed(cSpy);
    a.value = "a!";
    b.value = "b!";
    expect(cSpy).toHaveBeenCalledTimes(0);
    expect(c.value).toBe("a!b!");
    expect(cSpy).toHaveBeenCalledTimes(1);
  });
  test("dynamic returns", () => {
    const a = signal(false);
    const bSpy = vi.fn(() => a.value ? "1" : "2");
    const b = computed(bSpy);
    expect(b.value).toBe("2");
    a.value = true;
    expect(b.value).toBe("1");
    a.value = false;
    expect(b.value).toBe("2");
    a.value = true;
    expect(b.value).toBe("1");
    expect(bSpy).toHaveBeenCalledTimes(4);
  });
  test("unsubscribe invisible dependencies", () => {
    const a = signal(false);
    const b = signal("b");
    const c = signal("c");
    const dSpy = vi.fn(() => a.value ? b.value : c.value);
    const d = computed(dSpy);
    expect(d.value).toBe("c");
    a.value = true;
    a.value = false;
    expect(d.value).toBe("c");
    expect(dSpy).toHaveBeenCalledTimes(2);
    b.value = "b!";
    b.value = "b!!";
    expect(d.value).toBe("c");
    expect(dSpy).toHaveBeenCalledTimes(2);
    a.value = true;
    expect(d.value).toBe("b!!");
    expect(dSpy).toHaveBeenCalledTimes(3);
    c.value = "c!";
    c.value = "c!!";
    expect(d.value).toBe("b!!");
    expect(dSpy).toHaveBeenCalledTimes(3);
    a.value = false;
    expect(d.value).toBe("c!!");
    expect(dSpy).toHaveBeenCalledTimes(4);
  });
});
describe("graph", () => {
  test("diamond runs once", () => {
    const a = signal("a");
    const b = computed(() => a.value);
    const c = computed(() => a.value);
    const spy = vi.fn(() => b.value + c.value);
    const d = computed(spy);
    expect(d.value).toBe("aa");
    expect(spy).toHaveBeenCalledTimes(1);
    a.value = "a!";
    expect(d.value).toBe("a!a!");
    expect(spy).toHaveBeenCalledTimes(2);
  });
  test("deep nested memos", () => {
    const a = signal(2);
    const spyB = vi.fn(() => a.value + 1);
    const b = computed(spyB);
    const spyC = vi.fn(() => a.value + b.value);
    const c = computed(spyC);
    const spyD = vi.fn(() => a.value + b.value + c.value);
    const d = computed(spyD);
    expect(d.value).toBe(10);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyC).toHaveBeenCalledTimes(1);
    expect(spyD).toHaveBeenCalledTimes(1);
    a.value = 4;
    d.value;
    expect(spyB).toHaveBeenCalledTimes(2);
    expect(spyC).toHaveBeenCalledTimes(2);
    expect(spyD).toHaveBeenCalledTimes(2);
  });
  test("repeating computeds runs once", () => {
    const a = signal(1);
    const spyB = vi.fn(() => a.value + a.value);
    const b = computed(spyB);
    const spyC = vi.fn(() => a.value + b.value + a.value + b.value);
    const c = computed(spyC);
    const spyD = vi.fn(
      () => a.value + b.value + c.value + a.value + b.value + c.value
    );
    const d = computed(spyD);
    expect(d.value).toBe(18);
    expect(spyB).toHaveBeenCalledTimes(1);
    expect(spyC).toHaveBeenCalledTimes(1);
    expect(spyD).toHaveBeenCalledTimes(1);
    a.value = 4;
    d.value;
    expect(spyB).toHaveBeenCalledTimes(2);
    expect(spyC).toHaveBeenCalledTimes(2);
    expect(spyD).toHaveBeenCalledTimes(2);
  });
  test("chained memos", () => {
    const a = signal("a");
    const spyB = vi.fn(() => a.value);
    const b = computed(spyB);
    const c = computed(() => b.value);
    const d = computed(() => c.value);
    expect(a.value).toBe("a");
    expect(b.value).toBe("a");
    expect(c.value).toBe("a");
    expect(d.value).toBe("a");
    expect(b.value).toBe("a");
    expect(spyB).toHaveBeenCalledTimes(1);
    a.value = "a!";
    expect(a.value).toBe("a!");
    expect(b.value).toBe("a!");
    expect(c.value).toBe("a!");
    expect(d.value).toBe("a!");
    expect(b.value).toBe("a!");
    expect(spyB).toHaveBeenCalledTimes(2);
  });
  test("diamond with tail (updates and runs once)", () => {
    const a = signal("a");
    const b = computed(() => a.value);
    const c = computed(() => a.value);
    const dSpy = vi.fn(() => b.value + c.value);
    const d = computed(dSpy);
    const e = computed(() => d.value);
    const f = computed(() => d.value);
    expect(e.value).toBe("aa");
    expect(f.value).toBe("aa");
    expect(dSpy).toBeCalledTimes(1);
    a.value = "b";
    expect(e.value).toBe("bb");
    expect(f.value).toBe("bb");
    expect(dSpy).toBeCalledTimes(2);
  });
  test("tree (updates and runs once)", () => {
    const a = signal("a");
    const b = signal("b");
    const c = signal("c");
    const d = signal("d");
    const e = computed(() => a.value + b.value);
    const f = computed(() => c.value + d.value);
    const gSpy = vi.fn(() => e.value + f.value);
    const g = computed(gSpy);
    expect(e.value).toBe("ab");
    expect(f.value).toBe("cd");
    expect(gSpy).toBeCalledTimes(0);
    expect(g.value).toBe("abcd");
    expect(gSpy).toBeCalledTimes(1);
    d.value = "d!";
    c.value = "c!";
    b.value = "b!";
    a.value = "a!";
    expect(e.value).toBe("a!b!");
    expect(f.value).toBe("c!d!");
    expect(gSpy).toBeCalledTimes(1);
    expect(g.value).toBe("a!b!c!d!");
    expect(gSpy).toBeCalledTimes(2);
  });
});
describe("effects", () => {
  test("effects", () => {
    const a = signal(1);
    const b = signal(2);
    const cSpy = vi.fn(() => a.value + b.value);
    const c = effect(cSpy);
    expect(cSpy).toHaveBeenCalledTimes(0);
    a.value = 10;
    flushSync();
    expect(cSpy).toHaveBeenCalledTimes(1);
    b.value = 20;
    flushSync();
    expect(cSpy).toHaveBeenCalledTimes(2);
  });
  test("unsubscribe invisible dependencies (memos)", () => {
    const a = signal(true);
    const b = signal("b");
    const c = signal("c");
    const fSpy = vi.fn(() => a.value ? b.value : c.value);
    const f = computed(fSpy);
    expect(fSpy).toHaveBeenCalledTimes(0);
    expect(f.value).toBe("b");
    expect(fSpy).toHaveBeenCalledTimes(1);
    a.value = false;
    expect(f.value).toBe("c");
    expect(fSpy).toHaveBeenCalledTimes(2);
    a.value = true;
    expect(f.value).toBe("b");
    expect(fSpy).toHaveBeenCalledTimes(3);
    c.value = "c!";
    c.value = "c!!";
    flushSync();
    expect(f.value).toBe("b");
    expect(fSpy).toHaveBeenCalledTimes(3);
    a.value = false;
    expect(f.value).toBe("c!!");
    expect(fSpy).toHaveBeenCalledTimes(4);
    b.value = "b!";
    b.value = "b!!";
    flushSync();
    expect(fSpy).toHaveBeenCalledTimes(4);
    a.value = false;
    expect(fSpy).toHaveBeenCalledTimes(4);
    b.value = "b!!!";
    expect(fSpy).toHaveBeenCalledTimes(4);
  });
  test("dispose effects", () => {
    const a = signal("a");
    const bSpy = vi.fn(() => a.value);
    const b = effect(bSpy);
    expect(bSpy).toHaveBeenCalledTimes(0);
    flushSync();
    expect(bSpy).toHaveBeenCalledTimes(1);
    a.value = "a!";
    expect(bSpy).toHaveBeenCalledTimes(1);
    b();
    expect(bSpy).toHaveBeenCalledTimes(1);
    a.value = "a!!";
    expect(bSpy).toHaveBeenCalledTimes(1);
    a.value = "a!!!";
    expect(bSpy).toHaveBeenCalledTimes(1);
    flushSync();
  });
  test("effect with conditions", () => {
    const s1 = signal(true);
    const s2 = signal("a");
    const s3 = signal("b");
    const s4 = computed(() => s2.value);
    const s5 = computed(() => s3.value);
    let result = { value: 0 };
    effect(() => {
      if (s1.value) {
        s4.value;
        result.value = 1;
      } else {
        s5.value;
        result.value = 0;
      }
    });
    s1.value = false;
    flushSync();
    expect(result.value).toBe(0);
    s1.value = true;
    flushSync();
    expect(result.value).toBe(1);
  });
  test("effect with nested dependencies", () => {
    const a = signal(2);
    const spyB = vi.fn(() => a.value + 1);
    const b = computed(spyB);
    const spyC = vi.fn(() => b.value);
    const c = computed(spyC);
    const spyD = vi.fn(() => c.value);
    const d = computed(spyD);
    const spyE = vi.fn(() => d.value);
    effect(spyE);
    flushSync();
    expect(spyE).toHaveBeenCalledTimes(1);
    a.value = 4;
    flushSync();
    expect(spyE).toHaveBeenCalledTimes(2);
  });
  test("cleanup effect", () => {
    const spy = vi.fn();
    const x = signal(1);
    effect(() => {
      x.value;
      return () => spy();
    });
    flushSync();
    expect(spy).toHaveBeenCalledTimes(0);
    x.value++;
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
  });
  test("can nest effects", () => {
    const eff1 = vi.fn();
    const eff2 = vi.fn();
    const a = signal(1);
    effect(() => {
      eff1();
      a.value;
      const inner = effect(() => {
        a.value;
        eff2();
      });
      return () => inner();
    });
    expect(eff1).toHaveBeenCalledTimes(0);
    expect(eff2).toHaveBeenCalledTimes(0);
    a.value++;
    flushSync();
    expect(eff1).toHaveBeenCalledTimes(1);
    expect(eff2).toHaveBeenCalledTimes(1);
    a.value++;
    flushSync();
    expect(eff1).toHaveBeenCalledTimes(2);
    expect(eff2).toHaveBeenCalledTimes(2);
  });
  test("drains effects enqueued during flushSync", () => {
    const a = signal(0);
    const b = signal(0);
    const spyB = vi.fn(() => {
      b.value;
    });
    effect(spyB);
    flushSync();
    expect(spyB).toHaveBeenCalledTimes(1);
    effect(() => {
      a.value;
      b.value = b.value + 1;
    });
    flushSync();
    expect(spyB).toHaveBeenCalledTimes(2);
  });
});
describe("sync effects", () => {
  test("sync effect runs immediately on dependency change", () => {
    const a = signal(1);
    const b = signal(2);
    const spy = vi.fn(() => a.value + b.value);
    effect(spy, true);
    a.value = 10;
    expect(spy).toHaveBeenCalledTimes(2);
    b.value = 20;
    expect(spy).toHaveBeenCalledTimes(3);
  });
  test("dispose sync effect", () => {
    const a = signal("a");
    const spy = vi.fn(() => a.value);
    const dispose = effect(spy, true);
    expect(spy).toHaveBeenCalledTimes(1);
    a.value = "a!";
    expect(spy).toHaveBeenCalledTimes(2);
    dispose();
    a.value = "a!!";
    expect(spy).toHaveBeenCalledTimes(2);
  });
  test("sync effect with cleanup", () => {
    const spy = vi.fn();
    const x = signal(1);
    effect(() => {
      x.value;
      return () => spy();
    }, true);
    expect(spy).toHaveBeenCalledTimes(0);
    x.value++;
    expect(spy).toHaveBeenCalledTimes(1);
  });
  test("sync effect runs once", () => {
    const spy = vi.fn();
    const a = signal(1);
    const b = signal(1);
    const c = signal(1);
    effect(() => {
      effect(() => [a.value, b.value, c.value]);
      spy();
    }, true);
    expect(spy).toHaveBeenCalledTimes(1);
    a.value++;
    b.value++;
    c.value++;
    expect(spy).toHaveBeenCalledTimes(1);
  });
  test("sync effect runs once with constant computed", () => {
    const a = signal("a");
    const b = computed(() => {
      a.value;
      return "a";
    });
    const spy = vi.fn(() => b.value);
    let result = "";
    effect(() => {
      result = spy();
    }, true);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockClear();
    a.value = "b";
    expect(spy).toHaveBeenCalledTimes(0);
    expect(result).toBe("a");
    a.value = "c";
    expect(spy).toHaveBeenCalledTimes(0);
    expect(result).toBe("a");
  });
  test("sync effects prevents duplicate execution", () => {
    const a = signal(1);
    const b = signal(0);
    let calls = 0;
    effect(() => {
      b.value = a.value * 2;
    }, true);
    effect(() => {
      calls++;
      a.value;
      b.value;
    }, true);
    expect(calls).toBe(1);
    a.value = 5;
    expect(calls).toBe(2);
    expect(b.value).toBe(10);
  });
});
describe("peek", () => {
  test("peek inside effect does not track value signal", () => {
    const a = signal(1);
    let result;
    effect(() => {
      result = a.peek;
    });
    flushSync();
    expect(result).toBe(1);
    a.value = 2;
    flushSync();
    expect(result).toBe(1);
  });
  test("peek inside effect does not track computed", () => {
    const a = signal(1);
    const b = computed(() => a.value);
    let result;
    effect(() => {
      result = b.peek;
    });
    flushSync();
    expect(result).toBe(1);
    a.value = 2;
    flushSync();
    expect(result).toBe(1);
  });
  test(".value tracking survives peek", () => {
    const a = signal(1);
    let result;
    effect(() => {
      result = a.value;
    });
    flushSync();
    expect(result).toBe(1);
    a.peek;
    a.value = 2;
    flushSync();
    expect(result).toBe(2);
  });
  test("computed with peek inside does not track peeked signal", () => {
    const a = signal(1);
    const b = signal(10);
    const c = computed(() => a.value + b.peek);
    let result;
    effect(() => {
      result = c.value;
    });
    flushSync();
    expect(result).toBe(11);
    a.value = 2;
    flushSync();
    expect(result).toBe(12);
    b.value = 20;
    flushSync();
    expect(result).toBe(12);
  });
  test("computed with peek as dependency does not track upstream", () => {
    const a = signal(1);
    const b = computed(() => a.value);
    const c = computed(() => b.peek);
    let result;
    effect(() => {
      result = c.value;
    });
    flushSync();
    expect(result).toBe(1);
    a.value = 2;
    flushSync();
    expect(result).toBe(1);
  });
  test("peek returns fresh value when upstream tracking exists", () => {
    const a = signal(1);
    const b = computed(() => a.value);
    b.value;
    a.value = 2;
    expect(b.peek).toBe(2);
  });
  test("peek does not clear stale \u2014 subsequent .value re-evaluates properly", () => {
    const a = signal(1);
    const b = computed(() => a.value);
    b.value;
    a.value = 2;
    expect(b.peek).toBe(2);
    expect(b.value).toBe(2);
  });
  test("re-evaluates on each peek while stale", () => {
    const a = signal(1);
    const spy = vi.fn(() => a.value);
    const b = computed(spy);
    b.value;
    spy.mockClear();
    a.value = 2;
    b.peek;
    expect(spy).toHaveBeenCalledTimes(1);
    a.value = 3;
    b.peek;
    expect(spy).toHaveBeenCalledTimes(2);
  });
  test("runs once", () => {
    const a = signal(1);
    const spy = vi.fn(() => a.value);
    const b = computed(spy);
    b.value;
    spy.mockClear();
    a.value = 2;
    b.peek;
    b.peek;
    b.peek;
    flushSync();
    expect(spy).toHaveBeenCalledTimes(1);
  });
  test("peek on value signal returns current value", () => {
    const a = signal(1);
    expect(a.peek).toBe(1);
    a.value = 2;
    expect(a.peek).toBe(2);
  });
  test("parent computed with peek does not forward reactivity", () => {
    const a = signal(1);
    const b = computed(() => a.value);
    const parent = computed(() => b.peek);
    let result;
    effect(() => {
      result = parent.value;
    });
    flushSync();
    expect(result).toBe(1);
    a.value = 2;
    flushSync();
    expect(result).toBe(1);
  });
});
describe("avoid propagation", () => {
  it("should not propagate unnecessarily", () => {
    const a = signal("a");
    const b = computed(() => {
      a.value;
      return "a";
    });
    const spyC = vi.fn(() => b.value);
    const c = computed(spyC);
    let result = "";
    effect(() => {
      result = c.value;
    });
    flushSync();
    spyC.mockClear();
    a.value = "b";
    flushSync();
    expect(spyC).toHaveBeenCalledTimes(0);
    a.value = "c";
    flushSync();
    expect(result).toBe("a");
    expect(spyC).toHaveBeenCalledTimes(0);
  });
  it("should not keep downstream permanently stale when upstream returns same value", () => {
    const a = signal("a");
    const b = computed(() => {
      a.value;
      return "constant";
    });
    const spyC = vi.fn(() => b.value);
    const c = computed(spyC);
    let result = "";
    effect(() => {
      result = c.value;
    });
    flushSync();
    expect(result).toBe("constant");
    expect(spyC).toHaveBeenCalledTimes(1);
    spyC.mockClear();
    a.value = "b";
    flushSync();
    expect(result).toBe("constant");
    expect(spyC).toHaveBeenCalledTimes(0);
    flushSync();
    expect(spyC).toHaveBeenCalledTimes(0);
  });
});
