import { supabase } from '@/integrations/supabase/client';
import { googlePlaceSearch } from './maps.functions';
import { searchPlaces, type GeoHit } from './geo';
import { boundedSearch, createSearchCache } from './search-cache';
const cache = createSearchCache<GeoHit[]>();
/** Parallel authenticated Google and keyless Photon searches. No public Google proxy. */
export async function searchLocations(raw: string, onPartial?: (rows: GeoHit[]) => void): Promise<GeoHit[]> {
  const q = raw.trim().slice(0, 120); if (q.length < 3) return [];
  const { data } = await supabase.auth.getSession();
  return cache.get(`${data.session?.user.id ?? 'guest'}:${q.toLowerCase()}`, async () => {
    const collected: GeoHit[] = [];
    const merge = (rows: GeoHit[]) => {
      for (const row of rows) if (!collected.some(h => h.pincode === row.pincode && Math.abs(h.lat-row.lat) < .002 && Math.abs(h.lng-row.lng) < .002)) collected.push(row);
      onPartial?.([...collected].slice(0,12));
    };
    await Promise.all([
      boundedSearch(() => searchPlaces(q)).then(merge),
      data.session ? boundedSearch(() => googlePlaceSearch({ data: { q } })).then(merge) : Promise.resolve(),
    ]);
    return collected.slice(0,12);
  });
}
