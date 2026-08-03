import { describe, expect, test, vi } from "vitest";
import { batch, computed, effect, signal } from "../src/index.js";

describe("batch", () => {
  test("coalesces synchronous effects", () => {
    const value = signal(0);
    const run = vi.fn(() => value.value);
    effect(run, true);
    run.mockClear();

    batch(() => {
      value.value = 1;
      value.value = 2;
      value.value = 3;
    });

    expect(run).toHaveBeenCalledTimes(1);
    expect(run).toHaveLastReturnedWith(3);
  });

  test("supports nesting and return values", () => {
    const value = signal(0);
    const run = vi.fn(() => value.value);
    effect(run, true);
    run.mockClear();

    const result = batch(() => {
      value.value = 1;
      batch(() => {
        value.value = 2;
      });
      expect(run).not.toHaveBeenCalled();
      return 42;
    });

    expect(result).toBe(42);
    expect(run).toHaveBeenCalledTimes(1);
  });

  test("preserves unchanged computed bailout", () => {
    const source = signal(1);
    const parity = computed(() => source.value % 2);
    const run = vi.fn(() => parity.value);
    effect(run, true);
    run.mockClear();

    batch(() => {
      source.value = 3;
      source.value = 5;
    });

    expect(run).not.toHaveBeenCalled();
  });
});
