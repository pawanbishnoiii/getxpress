import { useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/** Optional parcel photos (max 3). Stores private storage paths. */
export function ParcelPhotos({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Sign in to add photos."); return; }
    setBusy(true);
    const next = [...value];
    for (const f of Array.from(files).slice(0, 3 - value.length)) {
      if (!f.type.startsWith("image/") || f.size > 5_000_000) { toast.error(`${f.name}: use an image under 5 MB`); continue; }
      const path = `${u.user.id}/${crypto.randomUUID()}.${f.name.split(".").pop() || "jpg"}`;
      const r = await supabase.storage.from("parcel-photos").upload(path, f, { contentType: f.type });
      if (r.error) { toast.error(r.error.message); continue; }
      next.push(path);
      setPreviews((p) => ({ ...p, [path]: URL.createObjectURL(f) }));
    }
    onChange(next);
    setBusy(false);
  };
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-sm font-bold">Parcel photos <span className="font-normal text-muted-foreground">(optional, up to 3)</span></p>
      <div className="mt-3 flex flex-wrap gap-2">
        {value.map((p) => (
          <div key={p} className="relative h-20 w-20 overflow-hidden rounded-xl border bg-secondary">
            {previews[p] && <img src={previews[p]} alt="Parcel" className="h-full w-full object-cover" />}
            <button type="button" aria-label="Remove photo" onClick={() => onChange(value.filter((x) => x !== p))} className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90"><X className="h-3 w-3" /></button>
          </div>
        ))}
        {value.length < 3 && (
          <label className="grid h-20 w-20 cursor-pointer place-items-center rounded-xl border border-dashed text-muted-foreground hover:border-primary hover:text-primary">
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => add(e.target.files)} />
          </label>
        )}
      </div>
    </div>
  );
}
