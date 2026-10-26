import { supabase } from '@/integrations/supabase/client';
import { searchLocations } from './location-search';
import { createSearchCache } from './search-cache';
import { postalLookup } from './postal';
import { directorySearch } from './india-directory';
export type PinHit = { pincode:string; city:string; state:string; zone?:string|null; district?:string; areas?:string[]; hub_name?:string|null; source:'master'|'map'; lat?:number; lng?:number; label?:string };
const cache=createSearchCache<PinHit[]>(120_000);
export async function lookupPins(raw:string):Promise<PinHit[]> {
 const q=raw.trim().slice(0,120); if(q.length<2) return [];
 return cache.get(q.toLowerCase(),async()=>{
  const isPin=/^\d+$/.test(q);
  const master=async():Promise<PinHit[]>=>{
   const base=supabase.from('pincodes').select('pincode,city,state,zone,area,hub_name').eq('active',true).limit(12);
   const {data,error}=isPin?await base.like('pincode',`${q}%`).order('pincode'):await base.ilike('city',`${q.replace(/[%_]/g,'')}%`).order('city');
   if(error) throw new Error('Could not check serviceable pincodes. Please retry.');
   return (data??[]).map(r=>({...r,source:'master'}));
  };
  const maps=async():Promise<PinHit[]>=>{
   if(isPin||q.length<3) return [];
   const places=await searchLocations(q);
   const codes=[...new Set(places.map(p=>p.pincode).filter((p):p is string=>Boolean(p&&/^\d{6}$/.test(p))))];
   if(!codes.length) return [];
    return places.flatMap(p=>p.pincode&&/^\d{6}$/.test(p.pincode)?[{pincode:p.pincode,city:p.city||p.label.split(',')[0]||'',state:p.state||'',source:'map' as const,lat:p.lat,lng:p.lng,label:p.label}]:[]);
  };
  const postal=async():Promise<PinHit[]>=>{if(!/^\d{6}$/.test(q))return [];const p=await postalLookup(q);return p?[{pincode:p.pincode,city:p.city,state:p.state,zone:p.district,source:'master'}]:[];};
   const local=(await directorySearch(q)).map(r=>({...r,source:'master' as const}));
   if(local.length) return local;
   const [m,b]=await Promise.all([master().catch(()=>[]),maps().catch(()=>[])]);
   const a=m.length?m:await postal();
  return [...a,...b.filter(p=>!a.some(s=>s.pincode===p.pincode))].slice(0,12);
 });
}
/** Any real Indian pincode is serviceable: master list first, then India Post directory. */
export async function pinInfo(pin:string):Promise<PinHit|null>{if(!/^\d{6}$/.test(pin))return null;const hit=(await lookupPins(pin).catch(()=>[])).find(r=>r.pincode===pin&&r.source==='master');if(hit)return hit;const p=await postalLookup(pin);return p?{pincode:p.pincode,city:p.city,state:p.state,zone:p.district,source:'master'}:null;}
