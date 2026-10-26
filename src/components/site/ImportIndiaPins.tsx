import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { indiaPins } from '@/lib/india-directory';
import { zoneFor, tierFor } from '@/lib/pin-zones';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Download,Loader2 } from 'lucide-react';
import { toast } from 'sonner';
export function ImportIndiaPins(){const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0);const qc=useQueryClient();
 const load=async()=>{setBusy(true);try{const rows=await indiaPins();for(let i=0;i<rows.length;i+=500){const batch=rows.slice(i,i+500).map(r=>({pincode:r.pincode,city:r.city,state:r.state,zone:zoneFor(r.state),tier:tierFor(r.city),active:true}));const r=await supabase.from('pincodes').upsert(batch,{onConflict:'pincode',ignoreDuplicates:true});if(r.error)throw new Error('Import paused. Retry to continue without replacing saved locations.');setProgress(Math.min(rows.length,i+500));}toast.success('India PIN directory added');await qc.invalidateQueries({queryKey:['pincode-master']});}catch(e){toast.error((e as Error).message);}finally{setBusy(false);}};
 return <Button variant="outline" disabled={busy} onClick={load}>{busy?<Loader2 className="animate-spin"/>:<Download/>}{busy?`Adding ${progress.toLocaleString('en-IN')} PINs…`:'Load India PIN directory'}</Button>;
}