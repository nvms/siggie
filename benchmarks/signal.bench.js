import { bench, describe } from "vitest";
import {
  AlienSignals,
  PreactSignals,
  Reactively,
  Siggie,
} from "./frameworks.js";

function runAll(op) {
  for (const [name, api] of [
    ["siggie", Siggie],
    ["alien-signals", AlienSignals],
    ["preact", PreactSignals],
    ["reactively", Reactively],
  ]) {
    const run = op(api);
    bench(name, run);
  }
}

describe("simple set+get", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      return () => s1.set(s1.get() + 1);
    });
  }
  runAll(op);
});

describe("deep set+get", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.computed(() => s1.get());
      const s3 = api.computed(() => s2.get());
      const s4 = api.computed(() => s3.get());
      const s5 = api.computed(() => s4.get());
      const s6 = api.computed(() => s5.get());
      const s7 = api.computed(() => s6.get());
      const s8 = api.computed(() => s7.get());
      const s9 = api.computed(() => s8.get());
      const s10 = api.computed(() => s9.get());
      return () => {
        s1.set(s1.get() + 1);
        s10.get();
      };
    });
  }
  runAll(op);
});

describe("wide get", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.signal(1);
      const s3 = api.signal(1);
      const s4 = api.signal(1);
      const s5 = api.signal(1);
      const s6 = api.signal(1);
      const s7 = api.signal(1);
      const s8 = api.signal(1);
      const s9 = api.signal(1);
      const s10 = api.computed(
        () =>
          s1.get() +
          s2.get() +
          s3.get() +
          s4.get() +
          s5.get() +
          s6.get() +
          s7.get() +
          s8.get() +
          s9.get()
      );

      return () => {
        s10.get();
      };
    });
  }
  runAll(op);
});

describe("wide set+get", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.signal(1);
      const s3 = api.signal(1);
      const s4 = api.signal(1);
      const s5 = api.signal(1);
      const s6 = api.signal(1);
      const s7 = api.signal(1);
      const s8 = api.signal(1);
      const s9 = api.signal(1);
      const s = api.computed(
        () =>
          s1.get() +
          s2.get() +
          s3.get() +
          s4.get() +
          s5.get() +
          s6.get() +
          s7.get() +
          s8.get() +
          s9.get()
      );
      return () => {
        s5.set(s.get() + 1);
      };
    });
  }
  runAll(op);
});

describe("simple effect", () => {
  function op(api) {
    let result = 0;
    return api.root(() => {
      const s = api.signal(1);
      api.effect(() => {
        result = s.get();
      });
      return () => {
        api.runSync(() => {
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
          s.set(s.get() + 1);
        });
      };
    });
  }
  runAll(op);
});

describe("tree effects", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.signal(1);
      const s3 = api.signal(1);
      const s4 = api.signal(1);
      const s5 = api.computed(() => s1.get() + s2.get());
      const s6 = api.computed(() => s3.get() + s4.get());
      api.effect(() => {
        s5.get() + s6.get();
      });
      return () => {
        api.runSync(() => {
          s3.set(s3.get() + 1);
          s1.set(s1.get() + 1);
        });
      };
    });
  }
  runAll(op);
});

describe("effect with conditions", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(true);
      const s2 = api.signal("a");
      const s3 = api.signal("b");
      const s4 = api.computed(() => s2.get());
      const s5 = api.computed(() => s3.get());
      api.effect(() => {
        s1.get() ? s4.get() : s5.get();
      });
      return () => {
        api.runSync(() => {
          s1.set(false);
          s1.set(true);
        });
      };
    });
  }
  runAll(op);
});

describe("wide effects", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.signal(1);
      const s3 = api.signal(1);
      const s4 = api.signal(1);
      const s5 = api.signal(1);
      const s6 = api.signal(1);
      const s7 = api.signal(1);
      const s8 = api.signal(1);
      const s9 = api.signal(1);
      api.effect(() => {
        s1.get() +
          s2.get() +
          s3.get() +
          s4.get() +
          s5.get() +
          s6.get() +
          s7.get() +
          s8.get() +
          s9.get() +
          s1.get() +
          s2.get() +
          s3.get() +
          s4.get() +
          s5.get() +
          s6.get() +
          s7.get() +
          s8.get() +
          s9.get();
      });
      return () => {
        api.runSync(() => {
          s1.set(s1.get() + 1);
          s5.set(s5.get() + 1);
          s9.set(s9.get() + 1);
        });
      };
    });
  }
  runAll(op);
});

describe("1 source -> 1 computed -> 100 computeds", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.computed(() => s1.get());
      const arr = [];
      api.runSync(() => {
        for (let i = 0; i < 100; i++) {
          arr.push(api.computed(() => s2.get()));
        }
      });
      return () => {
        api.runSync(() => {
          s1.set(s1.get() + 1);
          arr.forEach((el) => el.get());
        });
      };
    });
  }
  runAll(op);
});

describe("1 source -> 1 computed -> 100 effects", () => {
  function op(api) {
    return api.root(() => {
      const s1 = api.signal(1);
      const s2 = api.computed(() => s1.get());
      api.runSync(() => {
        for (let i = 0; i < 100; i++) {
          api.effect(() => s2.get());
        }
      });
      let j = 0;
      return () => {
        api.runSync(() => {
          s1.set(s1.get() + 1);
        });
      };
    });
  }
  runAll(op);
});

describe("1 to 1 effects", () => {
  function op(api) {
    return api.root(() => {
      let count = 0,
        all = [];
      for (let i = 0; i < 1000; i++) {
        const a = api.signal(i);
        all.push(a);
        api.effect(() => {
          a.get();
          count++;
        });
      }
      return () => {
        count = 0;
        api.runSync(() => {
          all.forEach((el) => el.set(el.get() + 1));
        });
        console.assert(count === 1000);
      };
    });
  }
  runAll(op);
});
