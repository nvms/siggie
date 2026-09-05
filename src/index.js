let current;
let currentScope;
let queued = false;
let batchDepth = 0;
let batchHead;
let batchTail;
let effectHead;
let effectTail;
let syncHead;
let syncTail;

const equal = (a, b) => a === b;

export class Sig {
  constructor(value, computation = false, effect = 0, scope) {
    this.eq = equal;
    this._fn = computation ? value : null;
    this._value = computation ? undefined : value;
    this._previous = this._value;
    this._batched = false;
    this._nextBatch = null;
    this._effect = effect;
    this._nextEffect = null;
    this._stale = computation;
    this._deps = null;
    this._computedDeps = 0;
    this._depTail = null;
    this._cursor = null;
    this._version = 0;
    this._trackedBy = null;
    this._trackedVersion = 0;
    this._subs = null;
    this._tail = null;
    this._scope = scope;
    this._disposed = false;

    if (!computation) return;
    if (currentScope) currentScope.push(this);
    if (effect === 2) this._run();
    else if (effect === 1) {
      enqueueEffect(this);
      queueEffects();
    }
  }

  _remove(edge) {
    const source = edge.source;
    const observer = edge.observer;

    if (edge.prevSub) edge.prevSub.nextSub = edge.nextSub;
    else source._subs = edge.nextSub;
    if (edge.nextSub) edge.nextSub.prevSub = edge.prevSub;
    else source._tail = edge.prevSub;

    if (edge.prevDep) edge.prevDep.nextDep = edge.nextDep;
    else observer._deps = edge.nextDep;
    if (edge.nextDep) edge.nextDep.prevDep = edge.prevDep;
    else observer._depTail = edge.prevDep;
    if (source._fn) observer._computedDeps--;

    if (!source._subs && source._fn && !source._effect) {
      source._stale = true;
      let dependency = source._deps;
      while (dependency) {
        const next = dependency.nextDep;
        source._remove(dependency);
        dependency = next;
      }
    }
  }

  _refresh() {
    if (!this._fn || !this._stale) return false;
    const oldValue = this._value;
    let edge = this._deps;
    if (!edge) {
      this._run();
      return this.eq(oldValue, this._value);
    }
    while (edge) {
      const source = edge.source;
      if (!source._fn || !source._refresh()) {
        this._run();
        return this.eq(oldValue, this._value);
      }
      edge = edge.nextDep;
    }
    this._stale = false;
    return false;
  }

  _refreshEffect() {
    if (!this._stale || !this._fn) return;
    if (!this._computedDeps) {
      this._run();
      return;
    }
    let edge = this._deps;
    while (edge) {
      const source = edge.source;
      if (!source._fn || !source._refresh()) {
        this._run();
        return;
      }
      edge = edge.nextDep;
    }
    if (!this._deps) this._run();
    else this._stale = false;
  }

  _runEffect() {
    if (this._scope || this._deps !== this._depTail) {
      this._run();
      return;
    }
    if (typeof this._value === "function") this._value();
    const previous = current;
    this._cursor = this._deps;
    this._version++;
    current = this;
    try {
      this._value = this._fn();
    } finally {
      current = previous;
      let edge = this._cursor;
      while (edge) {
        const next = edge.nextDep;
        this._remove(edge);
        edge = next;
      }
      this._cursor = null;
      this._stale = false;
    }
  }

  _run(disconnect = false) {
    if (this._effect && typeof this._value === "function") this._value();

    const previous = current;
    const scope = this._scope;
    let previousScope;
    this._cursor = this._deps;
    this._version++;
    current = this;
    if (scope) {
      previousScope = currentScope;
      currentScope = scope;
    }

    try {
      if (!disconnect) this._value = this._fn();
    } finally {
      current = previous;
      if (scope) currentScope = previousScope;
      let edge = this._cursor;
      while (edge) {
        const next = edge.nextDep;
        this._remove(edge);
        edge = next;
      }
      this._cursor = null;
      this._stale = false;
    }
    return this._value;
  }

  _dispose() {
    if (this._disposed) return;
    this._disposed = true;
    if (this._fn) this._run(true);
    this._effect = 0;
    this._fn = null;
    if (this._scope) {
      for (const child of this._scope) child.value = null;
    }
  }

  get value() {
    if (this._fn) {
      if (batchHead) commitBatch();
      this._refresh();
    }
    track(this);
    return this._value;
  }

  set value(nextValue) {
    if (this.eq(this._value, nextValue)) return;
    if (batchDepth && this._subs) {
      if (!this._batched) {
        this._previous = this._value;
        this._batched = true;
        if (batchTail) batchTail._nextBatch = this;
        else batchHead = this;
        batchTail = this;
      }
      this._value = nextValue;
      return;
    }
    this._value = nextValue;
    if (!this._subs) return;
    propagate(this._subs);
    flushSyncEffects();
  }

  get peek() {
    if (this._fn) {
      if (batchHead) commitBatch();
      this._refresh();
    }
    return this._value;
  }
}

function propagate(edge) {
  while (edge) {
    const observer = edge.observer;
    if (!observer._stale && !observer._disposed) {
      observer._stale = true;
      if (observer._effect === 2) enqueueSync(observer);
      else if (observer._effect === 1) {
        enqueueEffect(observer);
        queueEffects();
      } else if (observer._subs) propagate(observer._subs);
    }
    edge = edge.nextSub;
  }
}

function track(source) {
  const observer = current;
  if (!observer) return;
  let edge = observer._cursor;
  if (edge && edge.source === source) {
    observer._cursor = edge.nextDep;
    source._trackedBy = observer;
    source._trackedVersion = observer._version;
    return;
  }
  if (source._trackedBy === observer && source._trackedVersion === observer._version) return;
  while (edge) {
    const next = edge.nextDep;
    observer._remove(edge);
    edge = next;
  }
  observer._cursor = null;
  if (source._fn && source._stale) source._refresh();
  edge = {
    source,
    observer,
    prevSub: source._tail,
    nextSub: null,
    prevDep: observer._depTail,
    nextDep: null,
  };
  if (source._tail) source._tail.nextSub = edge;
  else source._subs = edge;
  source._tail = edge;
  if (observer._depTail) observer._depTail.nextDep = edge;
  else observer._deps = edge;
  observer._depTail = edge;
  if (source._fn) observer._computedDeps++;
  source._trackedBy = observer;
  source._trackedVersion = observer._version;
}

class Computed extends Sig {
  get value() {
    if (batchHead) commitBatch();
    if (this._stale) this._refresh();
    if (current) track(this);
    return this._value;
  }

  set value(nextValue) {
    this._dispose();
    super.value = nextValue;
  }
}

function enqueueSync(node) {
  if (syncTail) syncTail._nextEffect = node;
  else syncHead = node;
  syncTail = node;
}

function enqueueEffect(node) {
  if (effectTail) effectTail._nextEffect = node;
  else effectHead = node;
  effectTail = node;
}

function flushSyncEffects() {
  if (batchDepth) return;
  let source;
  let changed;
  while (syncHead) {
    const node = syncHead;
    syncHead = node._nextEffect;
    if (!syncHead) syncTail = undefined;
    node._nextEffect = null;
    if (!node._fn) continue;
    const dependency = node._deps;
    if (node._computedDeps === 1 && dependency === node._depTail) {
      if (dependency.source !== source || source._stale) {
        source = dependency.source;
        changed = !source._refresh();
      }
      if (changed) node._runEffect();
      else node._stale = false;
    } else {
      source = undefined;
      if (!node._computedDeps) node._run();
      else node._refreshEffect();
    }
  }
  syncTail = undefined;
}

function queueEffects() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    try {
      flushSync();
    } finally {
      queued = false;
      if (effectHead) queueEffects();
    }
  });
}

function commitBatch() {
  while (batchHead) {
    const node = batchHead;
    batchHead = node._nextBatch;
    node._nextBatch = null;
    node._batched = false;
    if (!node.eq(node._previous, node._value) && node._subs) {
      const edge = node._subs;
      const observer = edge.observer;
      if (!edge.nextSub && observer._effect && !observer._stale && !observer._disposed) {
        observer._stale = true;
        if (observer._effect === 2) enqueueSync(observer);
        else {
          enqueueEffect(observer);
          queueEffects();
        }
      } else propagate(edge);
    }
  }
  batchTail = undefined;
  flushSyncEffects();
}

export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    if (!--batchDepth) commitBatch();
  }
}

export function flushSync() {
  flushSyncEffects();
  let source;
  let changed;
  while (effectHead) {
    const node = effectHead;
    effectHead = node._nextEffect;
    if (!effectHead) effectTail = undefined;
    node._nextEffect = null;
    if (!node._fn) continue;
    const dependency = node._deps;
    if (node._computedDeps === 1 && dependency === node._depTail) {
      if (dependency.source !== source || source._stale) {
        source = dependency.source;
        changed = !source._refresh();
      }
      if (changed) node._runEffect();
      else node._stale = false;
    } else {
      source = undefined;
      if (!node._computedDeps) node._run();
      else node._refreshEffect();
    }
  }
  effectTail = undefined;
}

export function signal(value) {
  return new Sig(value);
}

export function computed(fn) {
  return new Computed(fn, true);
}

export function effect(fn, sync = false, scope) {
  const node = new Computed(fn, true, sync ? 2 : 1, scope);
  return () => node._dispose();
}
