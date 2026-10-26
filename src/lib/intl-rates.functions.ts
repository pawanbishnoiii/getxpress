import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { basePrice, chargeableKg, withMarkup, zoneFor, type RateCard } from "./intl-rates";

const quoteSchema = z.object({
  country: z.string().min(2).max(60),
  postal: z.string().max(20).default(""),
  items: z.array(z.object({ name: z.string().min(1).max(80), qty: z.number().int().min(1).max(500), weight: z.number().positive().max(300), value: z.number().min(0).max(10_000_000) })).min(1).max(30),
  l: z.number().min(0).max(300).default(0), w: z.number().min(0).max(300).default(0), h: z.number().min(0).max(300).default(0),
});

/** Replace the upstream brand with ours; customers never see the source provider. */
export const rebrand = (name: string) => name.replace(/ship\s?global/gi, "GetXpress.in");

/** Parse admin "Original=New" lines into a rename map (case-insensitive keys). */
export function parseServiceNames(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of text.split(/\r?\n|,/)) {
    const [from, to] = line.split("=").map((s) => s?.trim() ?? "");
    if (from && to) map[from.toLowerCase()] = to;
  }
  return map;
}
export const renameService = (name: string, map: Record<string, string>) => map[name.trim().toLowerCase()] ?? rebrand(name);

async function liveConfig() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("gateway_configs").select("enabled,config").eq("provider", "shipglobal").maybeSingle();
  const cfg = (data?.config ?? {}) as Record<string, string>;
  // Admin-saved key wins; otherwise the key stored securely on the server.
  const key = cfg["api_key"] || process.env["SHIPGLOBAL_API_KEY"] || "";
  if (!data?.enabled || !key) return null;
  return { base: (cfg["base_url"] || DEFAULT_BASE).replace(/\/$/, ""), key, names: parseServiceNames(String(cfg["service_names"] ?? "")) };
}
const DEFAULT_BASE = "https://shipglobal-rate-spark.lovable.app";
const TIMEOUT_MS = 9000;

// Per-worker short caches keep repeat lookups fast without hitting the rate API again.
const countryCache: { at: number; list: { name: string; code: string; needsPostal: boolean; postalHint: string }[] | null } = { at: 0, list: null };
const quoteCache = new Map<string, { at: number; value: unknown }>();
const QUOTE_TTL = 5 * 60_000, COUNTRY_TTL = 6 * 60 * 60_000;

/** Admin: ping the configured rate API with a sample quote and report speed + service names. */
export const testIntlApi = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("gateway_configs").select("config,enabled").eq("provider", "shipglobal").maybeSingle();
  const cfg = (data?.config ?? {}) as Record<string, string>;
  const key = cfg["api_key"] || process.env["SHIPGLOBAL_API_KEY"] || "";
  if (!key) return { ok: false as const, ms: 0, error: "Save an API key first", count: 0, names: [] as string[], enabled: !!data?.enabled };
  const base = (cfg["base_url"] || DEFAULT_BASE).replace(/\/$/, "");
  const names = parseServiceNames(String(cfg["service_names"] ?? ""));
  const t0 = Date.now();
  try {
    const r = await fetch(`${base}/api/public/v1/quote`, { method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "content-type": "application/json", "x-api-key": key }, body: JSON.stringify({ country: "US", pincode: "10001", weight: 1, length: 10, breadth: 10, height: 10 }) });
    const ms = Date.now() - t0;
    const text = await r.text();
    if (!r.ok) return { ok: false as const, ms, error: `HTTP ${r.status}: ${text.slice(0, 200)}`, count: 0, names: [] as string[], enabled: !!data?.enabled };
    const j = JSON.parse(text) as { results?: { courier: string; price: number }[] };
    const list = (j.results ?? []).map((o) => `${o.courier} → ${renameService(o.courier, names)} (₹${o.price})`);
    return { ok: true as const, ms, count: list.length, names: list, error: null, enabled: !!data?.enabled };
  } catch (e) {
    return { ok: false as const, ms: Date.now() - t0, error: (e as Error).message, count: 0, names: [] as string[], enabled: !!data?.enabled };
  }
});

/** Public: list of countries (no prices). Live list when the rate API is configured. */
export const intlCountries = createServerFn({ method: "GET" }).handler(async () => {
  if (countryCache.list && Date.now() - countryCache.at < COUNTRY_TTL) return countryCache.list;
  const card = (await import("@/data/intl-rates.json")).default as unknown as RateCard;
  const local = Object.entries(card).map(([name, c]) => ({ name, code: "" as string, needsPostal: !!c.zones, postalHint: c.zones === "state" ? "State code e.g. CA" : c.zones === "fsa" ? "Postal code e.g. M5V 2T6" : c.zones === "postcode" ? "Postcode e.g. 2000" : "" }));
  try {
    const cfg = await liveConfig();
    if (cfg) {
      const r = await fetch(`${cfg.base}/api/public/v1/countries`, { signal: AbortSignal.timeout(TIMEOUT_MS) });
      const j = (await r.json()) as { countries?: { code: string; name: string }[] };
      if (j.countries?.length) {
        const list = j.countries.filter((c) => c.code !== "IN").map((c) => ({ name: c.name, code: c.code, needsPostal: true, postalHint: "Destination pincode / postal code" })).sort((a, b) => a.name.localeCompare(b.name));
        countryCache.at = Date.now(); countryCache.list = list;
        return list;
      }
    }
  } catch (e) { console.error("intl countries live", e); }
  return local.sort((a, b) => a.name.localeCompare(b.name));
});

/** Public: final customer price only; base rate and markup stay on the server. */
export const intlQuote = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => quoteSchema.extend({ code: z.string().length(2).optional() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("app_settings").select("intl_markup_percent,intl_markup_flat").eq("id", true).maybeSingle();
    const pct = Number(s?.intl_markup_percent ?? 0), flat = Number(s?.intl_markup_flat ?? 0);
    const actual = data.items.reduce((s, i) => s + i.qty * i.weight, 0);
    const volumetric = (data.l * data.w * data.h) / 5000;
    const declared = data.items.reduce((s, i) => s + i.qty * i.value, 0);
    const cfg = data.code ? await liveConfig() : null;
    if (cfg && data.code) {
      try {
        const body = JSON.stringify({ country: data.code, pincode: data.postal.replace(/\s+/g, ""), weight: +Math.max(actual, 0.05).toFixed(2), length: data.l || 10, breadth: data.w || 10, height: data.h || 10 });
        const cacheKey = `${body}|${pct}|${flat}|${JSON.stringify(cfg.names)}|${declared}`;
        const hit = quoteCache.get(cacheKey);
        if (hit && Date.now() - hit.at < QUOTE_TTL) return hit.value as never;
        const r = await fetch(`${cfg.base}/api/public/v1/quote`, { method: "POST", signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "content-type": "application/json", "x-api-key": cfg.key }, body });
        const j = (await r.json()) as { status?: string; error?: string; message?: string; shipment?: { billedWeight: number; volumetricWeight: number }; results?: { provider: string; courier: string; transit: string; price: number }[] };
        if (r.ok && j.results?.length) {
          // The admin's single adjustment (+% margin or −% discount, plus flat ₹) is applied before customers see any price.
          const value = {
            ok: true as const, zone: null, actualKg: +actual.toFixed(2), volumetricKg: j.shipment?.volumetricWeight ?? +volumetric.toFixed(2), chargeableKg: j.shipment?.billedWeight ?? actual, declared,
            // Safe delivery detail is preserved for the UI. Provider base rates, API keys and
            // the admin's adjustment remain server-only.
            options: j.results.map((o) => ({ id: o.provider, name: renameService(o.courier, cfg.names), provider: rebrand(o.provider), days: o.transit, price: withMarkup(o.price, pct, flat) })).sort((a, b) => a.price - b.price),
          };
          if (quoteCache.size > 500) quoteCache.clear();
          quoteCache.set(cacheKey, { at: Date.now(), value });
          return value;
        }
        if (r.status === 400) return { ok: false as const, error: "Please check the destination pincode, weight or box size." };
        console.error("intl live quote", r.status, j.error ?? j.message);
      } catch (e) { console.error("intl live quote", e); }
    }
    const card = (await import("@/data/intl-rates.json")).default as unknown as RateCard;
    const c = card[data.country];
    if (!c) return { ok: false as const, error: "Live prices are unavailable right now. Request a quote instead." };
    const zone = zoneFor(c, data.postal);
    if (!zone || !c.rates[zone]) return { ok: false as const, error: "We couldn't match this destination pincode/postal code. Please check it." };
    const kg = chargeableKg(Math.max(actual, volumetric), c.rates[zone]!);
    const express = withMarkup(basePrice(c.rates[zone]!, kg), pct, flat);
    return {
      ok: true as const, zone: zone === "_" ? null : zone, actualKg: +actual.toFixed(2), volumetricKg: +volumetric.toFixed(2), chargeableKg: kg, declared,
      options: [
        { id: "pickup", name: "Air Express · with pickup", provider: "GetXpress international network", days: "5–8 working days", price: express },
        { id: "economy", name: "Air Economy · with pickup", provider: "GetXpress international network", days: "8–12 working days", price: Math.round(express * 0.9) },
      ],
    };
  });

export const getIntlMarkup = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!isAdmin) throw new Error("Forbidden");
  const { data } = await context.supabase.from("app_settings").select("intl_markup_percent,intl_markup_flat").eq("id", true).maybeSingle();
  return { percent: Number(data?.intl_markup_percent ?? 0), flat: Number(data?.intl_markup_flat ?? 0) };
});

export const saveIntlMarkup = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ percent: z.number().min(-90).max(200), flat: z.number().min(-100000).max(100000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");
    const { error } = await context.supabase.from("app_settings").update({ intl_markup_percent: data.percent, intl_markup_flat: data.flat }).eq("id", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
