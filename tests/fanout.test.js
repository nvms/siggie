import { describe, expect, test, vi } from "vitest";
import { batch, computed, effect, signal } from "../src/index.js";

describe("computed effect fan-out", () => {
  test("runs every subscriber after a shared computed changes", () => {
    const source = signal(1);
    const shared = computed(() => source.value * 2);
    const subscribers = Array.from({ length: 100 }, () =>
      vi.fn(() => shared.value),
    );

    for (const subscriber of subscribers) effect(subscriber, true);
    for (const subscriber of subscribers) subscriber.mockClear();

    source.value = 2;

    for (const subscriber of subscribers) {
      expect(subscriber).toHaveBeenCalledOnce();
      expect(subscriber).toHaveLastReturnedWith(4);
    }
  });

  test("skips every subscriber when the shared value is unchanged", () => {
    const source = signal(1);
    const shared = computed(() => source.value % 2);
    const subscribers = Array.from({ length: 100 }, () =>
      vi.fn(() => shared.value),
    );

    for (const subscriber of subscribers) effect(subscriber, true);
    for (const subscriber of subscribers) subscriber.mockClear();

    source.value = 3;

    for (const subscriber of subscribers) {
      expect(subscriber).not.toHaveBeenCalled();
    }
  });

  test("falls back to general stabilization for mixed dependencies", () => {
    const source = signal(1);
    const direct = signal(1);
    const shared = computed(() => source.value % 2);
    const subscriber = vi.fn(() => shared.value + direct.value);

    effect(subscriber, true);
    subscriber.mockClear();

    batch(() => {
      source.value = 3;
      direct.value = 2;
    });

    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveLastReturnedWith(3);
  });

  test("reconciles a subscriber that changes dependency shape", () => {
    const chooseComputed = signal(true);
    const source = signal(1);
    const direct = signal(10);
    const shared = computed(() => source.value * 2);
    const subscriber = vi.fn(() =>
      chooseComputed.value ? shared.value : direct.value,
    );

    effect(subscriber, true);
    subscriber.mockClear();

    chooseComputed.value = false;
    expect(subscriber).toHaveLastReturnedWith(10);

    subscriber.mockClear();
    source.value = 2;
    expect(subscriber).not.toHaveBeenCalled();

    direct.value = 11;
    expect(subscriber).toHaveBeenCalledOnce();
    expect(subscriber).toHaveLastReturnedWith(11);
  });
});
