/** Bounded TTL cache that coalesces concurrent requests; failed searches are never cached. */
export function createSearchCache<T>(ttl = 300_000, max = 80) {
  const rows = new Map<string, { value: T; expires: number }>();
  const pending = new Map<string, Promise<T>>();
  return {
    get(key: string, load: () => Promise<T>): Promise<T> {
      const hit = rows.get(key);
      if (hit && hit.expires > Date.now()) return Promise.resolve(hit.value);
      const flight = pending.get(key); if (flight) return flight;
      const promise = load().then(value => {
        rows.delete(key); rows.set(key, { value, expires: Date.now() + ttl });
        while (rows.size > max) { const oldest = rows.keys().next().value; if (oldest === undefined) break; rows.delete(oldest); }
        return value;
      }).finally(() => pending.delete(key));
      pending.set(key, promise); return promise;
    },
    clear() { rows.clear(); },
  };
}
export async function boundedSearch<T>(load: () => Promise<T[]>, ms = 3500): Promise<T[]> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { return await Promise.race([load().catch(() => []), new Promise<T[]>(resolve => { timer = setTimeout(() => resolve([]), ms); })]); }
  finally { clearTimeout(timer); }
}
