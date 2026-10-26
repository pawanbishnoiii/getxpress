export type DirectoryPin = { pincode:string; city:string; state:string; district:string; areas:string[] };
type Indexed = DirectoryPin & { key:string };
let directory: Promise<Indexed[]> | undefined;
let prefixes: Map<string, Indexed[]> | undefined;
const cache = new Map<string, DirectoryPin[]>();

/** Loads the built-in India PIN list once and pre-builds a lowercase search key per PIN. */
export function indiaPins() {
 return directory ??= import('@/data/india-pins.json').then(m => {
  const rows = (m.default as [string,string,string,string,string[]][]).map(([pincode,city,state,district,areas])=>({pincode,city,state,district,areas,key:`${city}|${state}|${district}|${areas.join('|')}`.toLowerCase()})).sort((a,b)=>a.pincode.localeCompare(b.pincode));
  prefixes = new Map();
  for (const r of rows) for (let n=1;n<=6;n++) { const k=r.pincode.slice(0,n); const bucket=prefixes.get(k)??[]; bucket.push(r); prefixes.set(k,bucket); }
  return rows;
 });
}

/** Ranked search: exact PIN > PIN prefix > name starts with > word starts with > contains. */
export function rankPins(rows:Indexed[], q:string, limit=20):DirectoryPin[] {
 const query=q.trim().toLowerCase();
 if(!query) return [];
 if(/^\d+$/.test(query)) return rows.filter(r=>r.pincode.startsWith(query)).sort((a,b)=>a.pincode.localeCompare(b.pincode)).slice(0,limit);
 const scored:{r:Indexed;s:number}[]=[];
 for(const r of rows){
  if(!r.key.includes(query)) continue;
  const city=r.city.toLowerCase(), dist=r.district.toLowerCase();
  let s=1;
  if(city===query||dist===query) s=5;
  else if(city.startsWith(query)) s=4;
  else if(dist.startsWith(query)) s=3.5;
  else if(r.areas.some(a=>a.toLowerCase().startsWith(query))) s=3;
  else if(r.key.includes(` ${query}`)||r.key.includes(`|${query}`)) s=2;
  scored.push({r,s});
 }
 return scored.sort((a,b)=>b.s-a.s||a.r.pincode.localeCompare(b.r.pincode)).slice(0,limit).map(({r})=>({pincode:r.pincode,city:r.city,state:r.state,district:r.district,areas:r.areas}));
}

export async function directorySearch(q:string, limit=60) {
 const k=q.trim().toLowerCase();
 const ck=`${limit}|${k}`;
 const hit=cache.get(ck); if(hit) return hit;
 const rows=await indiaPins();
 const out=/^\d+$/.test(k) ? (prefixes?.get(k)??[]).slice(0,limit) : rankPins(rows,k,limit);
 if(cache.size>300) cache.clear();
 cache.set(ck,out); return out;
}

/** Warm the PIN list in the background so the first suggestion is instant. */
export function preloadPins(){ void indiaPins().catch(()=>{}); }
