const STALE = 1;
const RUNNING = 2;
const FAILED = 4;
const BATCHED = 8;
const SYNC = 16;
const EFFECT = 32;

let current;
let cursor = null;
let runId = 0;
let runCounter = 0;
let currentScope;
let globalVersion = 0;
let batchDepth = 0;
let batchHead = null;
let batchTail = null;
let syncHead = null;
let syncTail = null;
let effectHead = null;
let effectTail = null;
let flushing = false;
let queued = false;

export class Sig {
  constructor(value) {
    this._value = value;
    this._fn = null;
    this._flags = 0;
    this._version = 0;
    this._trackedRun = 0;
    this._subs = null;
    this._subTail = null;
    this._next = null;
    this._previous = undefined;
  }

  eq(a, b) {
    return a === b;
  }

  get value() {
    if (current !== undefined) track(this);
    return this._value;
  }

  set value(nextValue) {
    write(this, nextValue);
  }

  get peek() {
    return this._value;
  }
}

class Computed extends Sig {
  constructor(fn) {
    super(undefined);
    this._fn = fn;
    this._flags = STALE;
    this._checked = -1;
    this._deps = null;
    this._depTail = null;
    if (currentScope) currentScope.push(this);
  }

  get value() {
    if (this._fn !== null) {
      if (batchHead !== null) commitBatch();
      refresh(this);
    }
    if (current !== undefined) track(this);
    if (this._flags & FAILED) throw this._value;
    return this._value;
  }

  set value(nextValue) {
    dispose(this);
    write(this, nextValue);
  }

  get peek() {
    if (this._fn !== null) {
      if (batchHead !== null) commitBatch();
      refresh(this);
    }
    if (this._flags & FAILED) throw this._value;
    return this._value;
  }
}

class Effect {
  constructor(fn, sync, scope) {
    this._fn = fn;
    this._value = undefined;
    this._flags = sync ? EFFECT | SYNC : EFFECT;
    this._deps = null;
    this._depTail = null;
    this._next = null;
    this._scope = scope;
    if (currentScope) currentScope.push(this);
  }

  set value(_) {
    dispose(this);
  }
}

function write(node, nextValue) {
  if (node.eq(node._value, nextValue)) return;
  if (batchDepth && node._subs !== null) {
    if (!(node._flags & BATCHED)) {
      node._previous = node._value;
      node._flags |= BATCHED;
      if (batchTail !== null) batchTail._next = node;
      else batchHead = node;
      batchTail = node;
    }
    node._value = nextValue;
    return;
  }
  node._value = nextValue;
  node._version++;
  globalVersion++;
  if (node._subs === null) return;
  propagate(node._subs);
  drain(false);
}

function dispose(node) {
  if (node._fn === null) return;
  if (node._flags & EFFECT) {
    if (typeof node._value === "function") cleanup(node);
    node._value = undefined;
    trim(node, node._deps, true);
    node._fn = null;
    if (node._scope) {
      for (const child of node._scope) child.value = null;
    }
    return;
  }
  trim(node, node._deps, node._subs !== null);
  if (node._flags & FAILED) node._value = undefined;
  node._fn = null;
  node._flags = 0;
}

function link(edge) {
  const source = edge.source;
  const tail = source._subTail;
  edge.prevSub = tail;
  source._subTail = edge;
  if (tail !== null) {
    tail.nextSub = edge;
    return;
  }
  source._subs = edge;
  if (source._fn !== null) activate(source);
}

function unlink(edge) {
  const source = edge.source;
  const prevSub = edge.prevSub;
  const nextSub = edge.nextSub;
  if (prevSub !== null) prevSub.nextSub = nextSub;
  else source._subs = nextSub;
  if (nextSub !== null) nextSub.prevSub = prevSub;
  else source._subTail = prevSub;
  edge.prevSub = null;
  edge.nextSub = null;
  if (source._subs === null && source._fn !== null) deactivate(source);
}

function activate(node) {
  if (node._checked === globalVersion) node._flags &= ~STALE;
  else node._flags |= STALE;
  for (let edge = node._deps; edge !== null; edge = edge.nextDep) link(edge);
}

function deactivate(node) {
  if (!(node._flags & STALE)) node._checked = globalVersion;
  for (let edge = node._deps; edge !== null; edge = edge.nextDep) unlink(edge);
}

function track(source) {
  const next = cursor;
  if (next !== null && next.source === source) {
    next.version = source._version;
    cursor = next.nextDep;
    source._trackedRun = runId;
    return;
  }
  if (source._trackedRun === runId) return;
  source._trackedRun = runId;
  const observer = current;
  const prevDep = next !== null ? next.prevDep : observer._depTail;
  const edge = {
    source,
    observer,
    version: source._version,
    prevDep,
    nextDep: next,
    prevSub: null,
    nextSub: null,
  };
  if (prevDep !== null) prevDep.nextDep = edge;
  else observer._deps = edge;
  if (next !== null) next.prevDep = edge;
  else observer._depTail = edge;
  if (observer._flags & EFFECT || observer._subs !== null) link(edge);
}

function trim(node, edge, live) {
  if (edge === null) return;
  const prevDep = edge.prevDep;
  if (prevDep !== null) prevDep.nextDep = null;
  else node._deps = null;
  node._depTail = prevDep;
  if (!live) return;
  for (; edge !== null; edge = edge.nextDep) unlink(edge);
}

function propagate(edge) {
  for (; edge !== null; edge = edge.nextSub) {
    const node = edge.observer;
    const flags = node._flags;
    if (flags & (STALE | RUNNING)) continue;
    node._flags = flags | STALE;
    if (flags & EFFECT) {
      if (flags & SYNC) enqueueSync(node);
      else enqueueEffect(node);
    } else if (node._subs !== null) propagate(node._subs);
  }
}

function refresh(node) {
  const flags = node._flags;
  if (flags & RUNNING) throw new Error("Cycle detected");
  if (node._subs !== null) {
    if (!(flags & STALE)) return;
  } else if (node._checked === globalVersion) return;
  const initial = node._checked === -1;
  node._checked = globalVersion;
  node._flags = flags & ~STALE;
  if (initial || sourcesChanged(node)) runComputed(node);
}

function sourcesChanged(node) {
  for (let edge = node._deps; edge !== null; edge = edge.nextDep) {
    const source = edge.source;
    if (source._fn !== null) refresh(source);
    if (source._version !== edge.version) return true;
  }
  return false;
}

function runComputed(node) {
  const previous = current;
  const previousCursor = cursor;
  const previousRunId = runId;
  current = node;
  cursor = node._deps;
  runId = ++runCounter;
  node._flags |= RUNNING;
  try {
    const value = node._fn();
    if (node._flags & FAILED || !node.eq(node._value, value)) {
      node._value = value;
      node._flags &= ~FAILED;
      node._version++;
    }
  } catch (error) {
    node._value = error;
    node._flags |= FAILED;
    node._version++;
  } finally {
    node._flags &= ~RUNNING;
    const unused = cursor;
    current = previous;
    cursor = previousCursor;
    runId = previousRunId;
    trim(node, unused, node._subs !== null);
  }
}

function runEffect(node) {
  if (typeof node._value === "function") cleanup(node);
  const previous = current;
  const previousCursor = cursor;
  const previousRunId = runId;
  const previousScope = currentScope;
  const scope = node._scope;
  current = node;
  cursor = node._deps;
  runId = ++runCounter;
  if (scope) currentScope = scope;
  node._flags |= RUNNING;
  try {
    node._value = node._fn();
  } finally {
    node._flags &= ~RUNNING;
    const unused = cursor;
    current = previous;
    cursor = previousCursor;
    runId = previousRunId;
    currentScope = previousScope;
    trim(node, unused, true);
  }
}

function cleanup(node) {
  const fn = node._value;
  const previous = current;
  node._value = undefined;
  current = undefined;
  try {
    fn();
  } finally {
    current = previous;
  }
}

function runSyncEffect(node) {
  if (flushing) {
    runEffect(node);
    return;
  }
  flushing = true;
  try {
    runEffect(node);
  } finally {
    flushing = false;
  }
  if (syncHead !== null) drain(false);
}

function refreshEffect(node) {
  if (node._fn === null) return;
  node._flags &= ~STALE;
  if (node._deps === null || sourcesChanged(node)) runEffect(node);
}

function enqueueSync(node) {
  if (syncTail !== null) syncTail._next = node;
  else syncHead = node;
  syncTail = node;
}

function enqueueEffect(node) {
  if (effectTail !== null) effectTail._next = node;
  else effectHead = node;
  effectTail = node;
  queueEffects();
}

function drain(includeEffects) {
  if (flushing || batchDepth) return;
  flushing = true;
  let failed = false;
  let error;
  try {
    for (;;) {
      let node = syncHead;
      if (node !== null) {
        syncHead = node._next;
        if (syncHead === null) syncTail = null;
      } else if (includeEffects && effectHead !== null) {
        node = effectHead;
        effectHead = node._next;
        if (effectHead === null) effectTail = null;
      } else break;
      node._next = null;
      try {
        refreshEffect(node);
      } catch (caught) {
        if (!failed) {
          failed = true;
          error = caught;
        }
      }
    }
  } finally {
    flushing = false;
  }
  if (failed) throw error;
}

function queueEffects() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    try {
      flushSync();
    } finally {
      queued = false;
      if (effectHead !== null) queueEffects();
    }
  });
}

function commitBatch() {
  while (batchHead !== null) {
    const node = batchHead;
    const previous = node._previous;
    batchHead = node._next;
    node._next = null;
    node._previous = undefined;
    node._flags &= ~BATCHED;
    if (node.eq(previous, node._value)) continue;
    node._version++;
    globalVersion++;
    if (node._subs !== null) propagate(node._subs);
  }
  batchTail = null;
  drain(false);
}

export function batch(fn) {
  batchDepth++;
  try {
    return fn();
  } finally {
    if (--batchDepth === 0) commitBatch();
  }
}

export function flushSync() {
  drain(true);
}

export function signal(value) {
  return new Sig(value);
}

export function computed(fn) {
  return new Computed(fn);
}

export function effect(fn, sync = false, scope) {
  const node = new Effect(fn, sync, scope);
  if (sync) runSyncEffect(node);
  else {
    node._flags |= STALE;
    enqueueEffect(node);
  }
  return () => dispose(node);
}
