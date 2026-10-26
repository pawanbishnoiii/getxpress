const ZONES: Record<string, string[]> = {
  North: ['Delhi','Haryana','Punjab','Chandigarh','Himachal Pradesh','Jammu and Kashmir','Jammu & Kashmir','Ladakh','Uttarakhand','Uttar Pradesh','Rajasthan'],
  West: ['Maharashtra','Gujarat','Goa','Dadra and Nagar Haveli and Daman and Diu','Daman and Diu','Dadra and Nagar Haveli'],
  South: ['Karnataka','Kerala','Tamil Nadu','Andhra Pradesh','Telangana','Puducherry','Pondicherry','Lakshadweep','Andaman and Nicobar Islands'],
  East: ['West Bengal','Odisha','Bihar','Jharkhand'],
  Central: ['Madhya Pradesh','Chhattisgarh'],
  'North-East': ['Assam','Meghalaya','Manipur','Mizoram','Nagaland','Tripura','Arunachal Pradesh','Sikkim'],
};
const TIER1 = ['mumbai','delhi','new delhi','bengaluru','bangalore','hyderabad','chennai','kolkata','pune','ahmedabad'];
const TIER2 = ['jaipur','lucknow','surat','kanpur','nagpur','indore','bhopal','patna','vadodara','ludhiana','agra','nashik','coimbatore','kochi','visakhapatnam','chandigarh','gurgaon','gurugram','noida','ghaziabad','faridabad','thane','rajkot','madurai','varanasi','amritsar','jodhpur','raipur','ranchi','guwahati','bhubaneswar','mysore','mysuru','dehradun','udaipur','kota'];
const norm = (s: string) => s.trim().toLowerCase();
export function zoneFor(state?: string | null) {
  if (!state) return null;
  const s = norm(state);
  for (const [z, list] of Object.entries(ZONES)) if (list.some(x => norm(x) === s)) return z;
  return null;
}
export function tierFor(city?: string | null) {
  if (!city) return null;
  const c = norm(city);
  return TIER1.includes(c) ? 'Tier 1' : TIER2.includes(c) ? 'Tier 2' : 'Tier 3';
}
/** Logistics zone from state; the old import stored the district in `zone`, so a district-valued zone is ignored. */
export function displayZone(p: { zone?: string | null; state: string; city: string }) {
  const known = p.zone && Object.keys(ZONES).includes(p.zone) ? p.zone : null;
  return known ?? zoneFor(p.state) ?? p.zone ?? null;
}
