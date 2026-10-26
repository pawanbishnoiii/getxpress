import { Box, FileText, Plus, Ruler, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DEFAULT_PRESETS, type ParcelPreset } from "@/lib/parcel-presets";
import { boxPresets, volumetric } from "@/lib/pricing";
import { newPiece, type BookingDraft } from "@/lib/booking-draft";
import imgSmall from "@/assets/parcel-small.webp";
import imgMedium from "@/assets/parcel-medium.webp";
import imgLarge from "@/assets/parcel-large.webp";
import imgXl from "@/assets/parcel-xl.webp";
import imgFlyer from "@/assets/parcel-flyer.webp";
import imgCard from "@/assets/parcel-card.webp";
import imgA4 from "@/assets/parcel-a4.webp";
import imgPack from "@/assets/parcel-docpack.webp";
const PRESET_IMG: Record<string, string> = { small: imgSmall, medium: imgMedium, large: imgLarge, extra_large: imgXl, xl: imgXl, document: imgFlyer, card: imgCard, a4: imgA4, document_pack: imgPack };
export function ParcelEditor({ pieces, onChange, presets=DEFAULT_PRESETS }: { pieces:BookingDraft["pieces"]; presets?: ParcelPreset[]; onChange:(pieces:BookingDraft["pieces"])=>void }) {
  const sizes=presets.filter(p=>p.active&&(p.kind==="documents"||p.kind==="packages")).map(p=>({id:p.id,label:p.label,kind:p.kind,maxKg:p.max_kg,dims:{l:p.l,w:p.w,h:p.h}}));
  const update=(i:number,p:Partial<BookingDraft["pieces"][number]>)=>onChange(pieces.map((x,j)=>j===i?{...x,...p}:x));
  return <div className="space-y-5">{pieces.map((p,i)=><div key={p.id} className="rounded-lg border bg-card p-4 md:p-5">
    <div className="mb-4 flex items-center justify-between"><h3 className="font-bold">Parcel #{i+1}</h3>{pieces.length>1&&<Button variant="ghost" size="icon" aria-label={`Remove parcel ${i+1}`} onClick={()=>onChange(pieces.filter((_,j)=>j!==i))}><Trash2 /></Button>}</div>
    <div className="mb-4 flex flex-wrap gap-2">{(["documents","packages"] as const).map(k=><Button key={k} variant={p.kind===k?"default":"outline"} onClick={()=>{ const preset=sizes.find(x=>x.kind===k); if(preset) update(i,{kind:k,preset:preset.id,dims:{...preset.dims},weight_kg:k==="documents"?0.5:1}); }}>{k==="documents"?<FileText/>:<Box/>}{k==="documents"?"Documents":"Packages"}</Button>)}<Button variant={p.preset==="custom"?"default":"outline"} onClick={()=>update(i,{preset:"custom"})}><Ruler/>Custom size</Button></div>
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">{sizes.filter(x=>x.kind===p.kind).map(x=><Button key={x.id} variant="outline" className={`h-auto min-h-32 flex-col whitespace-normal p-3 ${p.preset===x.id?"border-primary bg-primary/5 ring-1 ring-primary":""}`} onClick={()=>update(i,{preset:x.id,dims:{...x.dims},weight_kg:Math.min(p.weight_kg,x.maxKg)})}>{PRESET_IMG[x.id]?<img src={PRESET_IMG[x.id]} alt="" loading="lazy" width={816} height={816} className="h-16 w-16 object-contain"/>:x.kind==="documents"?<FileText className="!h-8 !w-8 text-primary"/>:<Box className="!h-8 !w-8 text-primary"/>}<span className="font-bold">{x.label}</span><span className="text-[11px] text-muted-foreground">{x.dims.l} × {x.dims.w} × {x.dims.h} cm<br/>Up to {x.maxKg} kg</span></Button>)}</div>
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4"><NumberField label="Actual weight (kg)" value={p.weight_kg} min={0.05} onChange={v=>update(i,{weight_kg:v})}/>{(["l","w","h"] as const).map((k,j)=><NumberField key={k} label={["Length (cm)","Width (cm)","Height (cm)"][j]??k} value={p.dims[k]} min={1} onChange={v=>update(i,{preset:"custom",dims:{...p.dims,[k]:v}})}/>)}</div>
    <p className="mt-2 text-xs text-muted-foreground">Volumetric {volumetric(p.dims).toFixed(2)} kg · Actual {p.weight_kg} kg</p>
  </div>)}<div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={pieces.length>=50} onClick={()=>onChange([...pieces,newPiece()])}><Plus/>Add parcel</Button><span className="text-sm font-bold">Total weight {pieces.reduce((a,p)=>a+p.weight_kg,0).toFixed(2)} kg</span></div></div>;
}
export function NumberField({label,value,onChange,min=0}:{label:string;value:number;onChange:(v:number)=>void;min?:number}) { return <label className="block min-w-0"><span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span><input aria-label={label} type="number" step="0.05" min={min} value={value||""} onChange={e=>onChange(Number(e.target.value))} className="h-11 w-full rounded-md border bg-background px-3 font-semibold outline-none focus:ring-2 focus:ring-ring"/></label>; }