import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser as requireSupabaseAuth } from "@/lib/auth-guard";
import type { GeoHit } from "./geo";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

async function mapsRequest(path: string, opts: { body?: unknown; fieldMask?: string } = {}) {
  const key = process.env["GOOGLE_MAPS_API_KEY"], appKey = process.env["LOVABLE_API_KEY"];
  if (!key || !appKey) throw new Error("Google Maps is not configured.");
  const headers: Record<string, string> = { Authorization: `Bearer ${appKey}`, "X-Connection-Api-Key": key, "Content-Type": "application/json" };
  if (opts.fieldMask) headers["X-Goog-FieldMask"] = opts.fieldMask;
  const response = await fetch(`${GATEWAY_URL}/${path}`, { method: opts.body ? "POST" : "GET", headers, ...(opts.body ? { body: JSON.stringify(opts.body) } : {}) });
  if (response.status === 403) {
    const details: Array<{ reason?: string }> = (await response.json().catch(() => ({})))?.error?.details ?? [];
    const reason = details.find((d) => d.reason)?.reason;
    if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") throw new Error("Google Maps server key is referrer-restricted; set its application restriction to None or IP addresses.");
    if (reason === "API_KEY_SERVICE_BLOCKED") throw new Error("Google Maps server key does not allow this API; add it to the key's allowed APIs.");
    throw new Error("Google Maps request was denied (403).");
  }
  if (!response.ok) { const t = await response.text(); console.error(`Maps request failed [${response.status}]: ${t}`); throw new Error(`Google Maps request failed (${response.status}).`); }
  return response.json();
}

type Comp = { types: string[]; longText?: string; long_name?: string };
const pick = (comps: Comp[] | undefined, ...types: string[]) => { for (const t of types) { const c = comps?.find((x) => x.types.includes(t)); if (c) return c.longText ?? c.long_name; } return undefined; };

// India-wide bias so results do not default to the gateway's location.
const INDIA_BIAS = { rectangle: { low: { latitude: 6.5, longitude: 68.0 }, high: { latitude: 35.7, longitude: 97.4 } } };

export const googlePlaceSearch = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().min(3).max(120) }).parse(d))
  .handler(async ({ data }) => {
    const j = await mapsRequest("places/v1/places:searchText", {
      body: { textQuery: data.q, pageSize: 6, regionCode: "IN", languageCode: "en", locationBias: INDIA_BIAS },
      fieldMask: "places.id,places.formattedAddress,places.location,places.addressComponents",
    });
    const hits: GeoHit[] = [];
    await Promise.all(((j.places ?? []) as { location?: { latitude: number; longitude: number }; formattedAddress?: string; addressComponents?: Comp[] }[]).slice(0, 6).map(async (p) => {
      if (!p.location) return;
      let pincode = pick(p.addressComponents, "postal_code");
      // Some place results omit the postal code — fill it via reverse geocode.
      if (!pincode) { const r = await reverse(p.location.latitude, p.location.longitude).catch(() => null); pincode = r?.pincode; }
      hits.push({ lat: p.location.latitude, lng: p.location.longitude, label: p.formattedAddress ?? data.q, pincode, city: pick(p.addressComponents, "locality", "administrative_area_level_3", "administrative_area_level_2"), state: pick(p.addressComponents, "administrative_area_level_1") } as GeoHit);
    }));
    return hits;
  });

async function reverse(lat: number, lng: number): Promise<GeoHit | null> {
  const j = await mapsRequest(`maps/api/geocode/json?latlng=${lat},${lng}&region=in`);
  const results = (j.results ?? []) as { formatted_address: string; address_components: Comp[] }[];
  const p = results[0]; if (!p) return null;
  const pincode = results.map((r) => pick(r.address_components, "postal_code")).find(Boolean);
  return { lat, lng, label: p.formatted_address, pincode, city: pick(p.address_components, "locality", "administrative_area_level_3", "administrative_area_level_2"), state: pick(p.address_components, "administrative_area_level_1") } as GeoHit;
}

export const googleReverse = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { lat: number; lng: number }) => z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) }).parse(d))
  .handler(async ({ data }) => reverse(data.lat, data.lng));

type Check = { name: string; ok: boolean; detail: string; ms?: number };
/** Admin-only live checks of the server-side Maps features (3 small billable calls). */
export const mapsDiagnostics = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Admin only");
    const checks: Check[] = [];
    const hasKeys = !!process.env["GOOGLE_MAPS_API_KEY"] && !!process.env["LOVABLE_API_KEY"];
    checks.push({ name: "Server connection configured", ok: hasKeys, detail: hasKeys ? "Google Maps connection is linked." : "Google Maps connection is not linked — suggestions fall back to OpenStreetMap." });
    if (!hasKeys) return checks;
    const run = async (name: string, fn: () => Promise<string>) => { const t = Date.now(); try { checks.push({ name, ok: true, detail: await fn(), ms: Date.now() - t }); } catch (e) { checks.push({ name, ok: false, detail: (e as Error).message, ms: Date.now() - t }); } };
    await run("Address lookup (pin on map → address)", async () => { const r = await reverse(26.8549, 75.8243); if (!r?.pincode) throw new Error("No pincode returned for a known Jaipur point."); return `${r.label} → ${r.pincode}`; });
    await run("Place search (typed locality)", async () => { const j = await mapsRequest("places/v1/places:searchText", { body: { textQuery: "Malviya Nagar Jaipur", pageSize: 1, regionCode: "IN" }, fieldMask: "places.formattedAddress" }); const a = j.places?.[0]?.formattedAddress; if (!a) throw new Error("No result."); return a; });
    await run("Location suggestions (autocomplete)", async () => { const j = await mapsRequest("places/v1/places:autocomplete", { body: { input: "Connaught Pl", includedRegionCodes: ["in"], sessionToken: crypto.randomUUID() }, fieldMask: "suggestions.placePrediction.text.text" }); const n = j.suggestions?.length ?? 0; if (!n) throw new Error("No suggestions."); return `${n} suggestions, e.g. ${j.suggestions[0].placePrediction?.text?.text ?? ""}`; });
    return checks;
  });

/** Signed-in: worldwide city / postal-code suggestions inside one country (Google Places autocomplete). */
export const googlePlaceSuggest = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string; country: string; session?: string }) => z.object({ q: z.string().trim().min(2).max(80), country: z.string().regex(/^[A-Za-z]{2}$/), session: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const isPostal = /\d/.test(data.q);
    const j = await mapsRequest("places/v1/places:autocomplete", {
      body: { input: data.q, includedRegionCodes: [data.country.toLowerCase()], languageCode: "en", ...(data.session ? { sessionToken: data.session } : {}),
        includedPrimaryTypes: isPostal ? ["postal_code"] : ["locality", "postal_code", "administrative_area_level_3", "sublocality", "postal_town"] },
      fieldMask: "suggestions.placePrediction.placeId,suggestions.placePrediction.types,suggestions.placePrediction.structuredFormat",
    });
    type S = { placePrediction?: { placeId?: string; types?: string[]; structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } } } };
    return ((j.suggestions ?? []) as S[]).flatMap((s) => {
      const p = s.placePrediction; const main = p?.structuredFormat?.mainText?.text ?? ""; const second = p?.structuredFormat?.secondaryText?.text ?? "";
      if (!main) return [];
      const parts = second.split(",").map((x) => x.trim()).filter(Boolean);
      const postal = p?.types?.includes("postal_code");
      const city = postal ? (parts[0] ?? main) : main;
      const region = (postal ? parts.slice(1, -1) : parts.slice(0, -1)).join(", ");
      return [{ city, postal_code: postal ? main : "", region, label: [main, second].filter(Boolean).join(" · "), ...(p?.placeId ? { placeId: p.placeId } : {}) }];
    });
  });

/** Signed-in: main postal code for a picked city (place details, then reverse geocode of its centre). */
export const googlePlacePostal = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: { placeId: string; session?: string }) => z.object({ placeId: z.string().regex(/^[\w-]{10,300}$/), session: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const j = await mapsRequest(`places/v1/places/${data.placeId}${data.session ? `?sessionToken=${data.session}` : ""}`, { fieldMask: "location,addressComponents" }) as { location?: { latitude: number; longitude: number }; addressComponents?: Comp[] };
    let postal = pick(j.addressComponents, "postal_code");
    if (!postal && j.location) postal = (await reverse(j.location.latitude, j.location.longitude).catch(() => null))?.pincode;
    return { postal_code: postal ?? "" };
  });
