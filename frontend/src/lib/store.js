// A very small query cache: de-duplicated reads, time-to-live, optional polling and global invalidation.
import { useEffect, useRef, useState } from 'react';

const entries = new Map();
const listeners = new Set();
let epoch = 0;
const notify = () => listeners.forEach((l) => l());

function load(key, fetcher) {
  let e = entries.get(key);
  if (!e) { e = { data: undefined, error: null, ts: 0, promise: null }; entries.set(key, e); }
  if (e.promise) return e.promise;
  e.promise = Promise.resolve().then(fetcher)
    .then((d) => { e.data = d; e.error = null; e.ts = Date.now(); })
    .catch((err) => { e.error = err; e.ts = Date.now(); })
    .finally(() => { e.promise = null; notify(); });
  notify();
  return e.promise;
}

export function invalidate(prefix = '') {
  for (const [k, e] of entries) if (k.startsWith(prefix)) e.ts = 0;
  epoch += 1;
  notify();
}

export function useRead(key, fetcher, { ttl = 30000, refresh = 0, enabled = true } = {}) {
  const [, force] = useState(0);
  const ref = useRef(fetcher); ref.current = fetcher;
  useEffect(() => { const l = () => force((x) => x + 1); listeners.add(l); return () => listeners.delete(l); }, []);
  const ep = epoch;
  useEffect(() => {
    if (!enabled || !key) return;
    const e = entries.get(key);
    if (!e || Date.now() - e.ts > ttl) load(key, () => ref.current());
  }, [key, enabled, ep, ttl]);
  useEffect(() => {
    if (!enabled || !key || !refresh) return undefined;
    const id = setInterval(() => { if (!document.hidden) load(key, () => ref.current()); }, refresh);
    return () => clearInterval(id);
  }, [key, enabled, refresh]);
  const e = key ? entries.get(key) : null;
  return {
    data: e?.data, error: e?.error ?? null,
    loading: !!e?.promise && e?.data === undefined, refreshing: !!e?.promise,
    refetch: () => (key ? load(key, () => ref.current()) : null),
  };
}
