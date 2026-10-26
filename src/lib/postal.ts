import { createSearchCache } from './search-cache';
import { directorySearch } from './india-directory';
export type PostalInfo = { pincode: string; city: string; district: string; state: string; areas: string[] };
const cache = createSearchCache<PostalInfo | null>(30 * 60_000);
/** India Post public directory — instant pincode → area/district/state, no API key. */
export function postalLookup(pin: string): Promise<PostalInfo | null> {
  if (!/^\d{6}$/.test(pin)) return Promise.resolve(null);
  return cache.get(pin, async () => {
    const local=(await directorySearch(pin)).find(p=>p.pincode===pin);
    if(local) return local;
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctl.signal }).then((x) => x.json()); clearTimeout(t);
      const o: { Name: string; District: string; State: string; Block?: string }[] = r?.[0]?.PostOffice ?? [];
      if (!o[0]) return null;
      const block = o[0].Block && o[0].Block !== 'NA' ? o[0].Block : o[0].District;
      return { pincode: pin, city: block, district: o[0].District, state: o[0].State, areas: [...new Set(o.map((x) => x.Name))] };
    } catch { return null; }
  });
}
