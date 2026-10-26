import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Building2, Globe2, Image as ImageIcon, MapPin, Phone, Search, Share2 } from "lucide-react";
import { AppShell, PageHeader } from "@/components/site/AppShell";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/use-roles";
import logo from "@/assets/getxpress-logo.png.asset.json";

export const Route = createFileRoute("/_authenticated/admin/company")({
  head: () => ({ meta: [
    { title: "Company profile — GetXpress Admin" },
    { name: "description", content: "Manage company identity, contacts, legal details, social links, SEO and website status." },
    { property: "og:title", content: "GetXpress company profile" },
    { property: "og:description", content: "Company identity, contacts, SEO and website status." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: CompanyPage,
});

const field = "mt-1 h-11 w-full rounded-md border bg-background px-3 text-sm";
type F = [key: string, label: string, kind?: "area" | "url"];
const SECTIONS: { id: string; title: string; icon: typeof Building2; fields: F[] }[] = [
  { id: "identity", title: "Identity", icon: Building2, fields: [["company_name", "Company name"], ["company_type", "Company type (Pvt Ltd, LLP, Proprietorship…)"], ["tagline", "Tagline"], ["description", "Description", "area"]] },
  { id: "contact", title: "Contact", icon: Phone, fields: [["support_email", "Company email"], ["support_whatsapp", "WhatsApp number"], ["support_phone", "Support phone"], ["business_hours", "Business hours (e.g. Mon–Sat 9am–8pm)"]] },
  { id: "address", title: "Address", icon: MapPin, fields: [["address", "Registered address", "area"], ["city", "City"], ["state", "State"], ["pincode", "PIN code"]] },
  { id: "legal", title: "Legal & tax", icon: Building2, fields: [["gstin", "GSTIN"], ["pan", "PAN"], ["cin", "CIN / registration no."]] },
  { id: "social", title: "Social links", icon: Share2, fields: [["facebook_url", "Facebook", "url"], ["instagram_url", "Instagram", "url"], ["linkedin_url", "LinkedIn", "url"], ["youtube_url", "YouTube", "url"], ["x_url", "X / Twitter", "url"]] },
  { id: "seo", title: "SEO & sharing", icon: Search, fields: [["meta_title", "Meta title"], ["meta_description", "Meta description", "area"], ["meta_keywords", "Meta keywords (comma separated)"], ["footer_text", "Footer note"]] },
];

async function uploadImage(file: File) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Choose a PNG, JPEG or WebP image");
  if (file.size > 5 * 1024 * 1024) throw new Error("Image must be under 5 MB");
  const path = `${crypto.randomUUID()}-${file.name.replace(/[^\w.]/g, "")}`;
  const r = await supabase.storage.from("brand-assets").upload(path, file, { contentType: file.type });
  if (r.error) throw r.error;
  const signed = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signed.error) throw signed.error;
  return signed.data.signedUrl;
}

function CompanyPage() {
  const { isAdmin } = useRoles();
  const qc = useQueryClient();
  const [sec, setSec] = useState("identity");
  const [imgs, setImgs] = useState<Record<string, string>>({});
  const { data: s } = useQuery({ queryKey: ["company"], enabled: isAdmin, queryFn: async () => (await supabase.from("app_settings").select("*").eq("id", true).single()).data as Record<string, unknown> | null });
  if (!isAdmin) return <AppShell><p>Admin access required.</p></AppShell>;
  if (!s) return <AppShell><p className="text-muted-foreground">Loading…</p></AppShell>;
  const v = (k: string) => String(s[k] ?? "");
  const save = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), ...imgs };
    for (const x of SECTIONS.flatMap((x) => x.fields)) {
      if (!f.has(x[0])) continue;
      const val = String(f.get(x[0]) ?? "").trim();
      if (x[2] === "url" && val && !/^https:\/\//.test(val)) { toast.error(`${x[1]} must start with https://`); return; }
      patch[x[0]] = val || null;
    }
    if (f.has("site_live")) { patch["site_live"] = f.get("site_live") === "on"; patch["maintenance_message"] = String(f.get("maintenance_message") ?? "").trim() || null; }
    if ("company_name" in patch && !patch["company_name"]) { toast.error("Company name is required"); return; }
    const r = await supabase.from("app_settings").update(patch as never).eq("id", true);
    if (r.error) toast.error(r.error.message); else { toast.success("Saved"); setImgs({}); qc.invalidateQueries({ queryKey: ["company"] }); }
  };
  const current = SECTIONS.find((x) => x.id === sec);
  const upload = (k: string) => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try { const url = await uploadImage(file); setImgs((m) => ({ ...m, [k]: url })); toast.success("Uploaded — press Save"); } catch (err) { toast.error((err as Error).message); }
  };
  return (
    <AppShell wide>
      <PageHeader title="Company profile" sub="Everything customers see about your business" />
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto rounded-xl border bg-card p-1 lg:flex-col">
          {[...SECTIONS, { id: "brand", title: "Brand images", icon: ImageIcon }, { id: "status", title: "Website status", icon: Globe2 }].map((x) => (
            <Button type="button" variant="ghost" key={x.id} onClick={() => setSec(x.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-left text-sm font-semibold ${sec === x.id ? "bg-ink text-ink-foreground" : "text-muted-foreground hover:bg-secondary"}`}><x.icon className="h-4 w-4" />{x.title}</Button>
          ))}
        </nav>
        <form key={sec} onSubmit={save} className="grid gap-4 rounded-xl border bg-card p-5 md:grid-cols-2">
          {current?.fields.map(([k, l, kind]) => kind === "area"
            ? <label key={k} className="text-sm font-semibold md:col-span-2">{l}<textarea name={k} defaultValue={v(k)} rows={3} className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label>
            : <label key={k} className="text-sm font-semibold">{l}<input name={k} type={kind === "url" ? "url" : "text"} placeholder={kind === "url" ? "https://" : ""} defaultValue={v(k)} className={field} /></label>)}
          {sec === "brand" && <>
            <div className="rounded-lg border p-4 md:col-span-2"><p className="text-sm font-semibold">Main logo (fixed)</p><img src={logo.url} alt="GetXpress" className="mt-2 h-10 w-auto" /></div>
            {([["hero_image_url", "Landing hero image"], ["icon_url", "App icon"], ["og_image_url", "Social share image (1200×630)"]] as const).map(([k, l]) => (
              <label key={k} className="text-sm font-semibold">{l}<input type="file" accept="image/*" onChange={upload(k)} className={field + " pt-2"} />
                {(imgs[k] ?? v(k)) && <img src={imgs[k] ?? v(k)} alt={l} className="mt-2 h-20 rounded-lg border object-contain" />}</label>))}
          </>}
          {sec === "status" && <>
            <label className="flex items-center gap-3 rounded-lg border p-4 md:col-span-2"><input name="site_live" type="checkbox" defaultChecked={!!s["site_live"]} className="h-5 w-5" /><span><b>Website live</b><span className="block text-xs text-muted-foreground">Turn off to show a maintenance notice to visitors</span></span></label>
            <label className="text-sm font-semibold md:col-span-2">Maintenance message<textarea name="maintenance_message" defaultValue={v("maintenance_message")} rows={2} placeholder="We are upgrading. Back shortly!" className="mt-1 w-full rounded-md border bg-background p-3 text-sm" /></label>
          </>}
          <Button type="submit" className="md:col-span-2 md:w-fit">Save {current?.title ?? (sec === "brand" ? "brand images" : "website status")}</Button>
        </form>
      </div>
    </AppShell>
  );
}
