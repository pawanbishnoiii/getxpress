import { getCountries, getCountryCallingCode } from "libphonenumber-js";

export type Country = { code: string; name: string; dial: string; flag: string };

/** Emoji flag from an ISO-3166 alpha-2 code. */
export function flagOf(code: string) {
  return code.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

let cache: Country[] | null = null;
/** Every country with name, ISO code, dialing code and flag, sorted by name. */
export function allCountries(): Country[] {
  if (cache) return cache;
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  cache = getCountries()
    .map((code) => ({ code, name: names.of(code) ?? code, dial: `+${getCountryCallingCode(code)}`, flag: flagOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

/** Search by name, ISO code (IN, US) or dialing code (+91, 44). */
export function searchCountries(q: string, list = allCountries()) {
  const s = q.trim().toLowerCase().replace(/^\+/, "");
  if (!s) return list;
  // Exact name first, then names starting with the text, then code matches, then the rest (e.g. "india" → India, not British Indian Ocean Territory).
  const rank = (c: { name: string; code: string }) => { const n = c.name.toLowerCase(); return n === s ? 0 : n.startsWith(s) ? 1 : c.code.toLowerCase() === s ? 2 : n.split(/[\s,()-]+/).some((w) => w.startsWith(s)) ? 3 : 4; };
  return list.filter((c) => c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s || c.dial.slice(1).startsWith(s))
    .sort((a, b) => rank(a) - rank(b));
}

/** Dialing code (e.g. "+44") for a country name, or "" when unknown. */
export function dialOf(name: string) { return allCountries().find((c) => c.name.toLowerCase() === name.trim().toLowerCase())?.dial ?? ""; }

/** Puts the country's dialing code in front of a phone number, replacing an older code; keeps typed digits. */
export function withDial(phone: string, dial: string, prevDial = "") {
  const p = phone.trim();
  if (!dial) return p;
  if (!p || p === prevDial || p === "+") return dial;
  if (prevDial && p.startsWith(prevDial)) return dial + p.slice(prevDial.length);
  if (p.startsWith("+")) return p;
  return dial + p.replace(/^0+/, "");
}
