import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, MapPin, Phone, UserPlus, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createStaffAccount } from "@/lib/staff.functions";
import { INDIAN_STATES } from "@/lib/india-regions";
import { PinAutocomplete } from "@/components/site/PinAutocomplete";

const ROLES = [
  ["customer", "Customer"], ["admin", "Admin"], ["point", "Hub"], ["network", "Network partner"], ["area_manager", "Area cluster manager"], ["state_manager", "State manager"], ["state_director", "State director"],
] as const;
type Role = (typeof ROLES)[number][0];
const box = "flex h-11 items-center gap-2 rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-ring";
const inp = "h-full min-w-0 flex-1 bg-transparent text-sm outline-none";

/** Admin: make a ready-to-use login for hub / network / area / state staff — no email or phone verification needed. */
export function CreateStaffAccount() {
  const create = useServerFn(createStaffAccount);
  const qc = useQueryClient();
  const [f, setF] = useState({ full_name: "", email: "", password: "", phone: "", role: "point" as Role, state: "", area: "", pin: "" });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  return (
    <form className="mb-5 grid gap-3 rounded-2xl border bg-card p-5 md:grid-cols-4" onSubmit={async (e) => {
      e.preventDefault();
      if (!f.state && f.role !== "customer" && f.role !== "admin") { toast.error("Select a state"); return; }
      setBusy(true);
      try {
        await create({ data: { ...f, phone: f.phone.replace(/\D/g, "").slice(-10), pin: f.pin || "" } });
        toast.success(`Account created — ${f.email} can sign in now with this password`);
        setF({ full_name: "", email: "", password: "", phone: "", role: f.role, state: f.state, area: "", pin: "" });
        qc.invalidateQueries();
      } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
    }}>
      <p className="flex items-center gap-2 font-bold md:col-span-4"><UserPlus className="h-5 w-5 text-primary" />Create user login <span className="text-xs font-normal text-muted-foreground">Works straight away — no email or phone verification.</span></p>
      <label className="text-xs font-bold">Full name<div className={`mt-1 ${box}`}><UserRound className="h-4 w-4 text-primary" /><input required minLength={2} maxLength={80} className={inp} value={f.full_name} onChange={(e) => set({ full_name: e.target.value })} placeholder="Ravi Sharma" /></div></label>
      <label className="text-xs font-bold">Email (login)<div className={`mt-1 ${box}`}><Mail className="h-4 w-4 text-primary" /><input required type="email" maxLength={200} className={inp} value={f.email} onChange={(e) => set({ email: e.target.value })} placeholder="hub.jaipur@getxpress.in" autoComplete="off" /></div></label>
      <label className="text-xs font-bold">Password<div className={`mt-1 ${box}`}><KeyRound className="h-4 w-4 text-primary" /><input required minLength={8} maxLength={72} type="text" className={inp} value={f.password} onChange={(e) => set({ password: e.target.value })} placeholder="At least 8 characters" autoComplete="new-password" /></div></label>
      <label className="text-xs font-bold">Phone (optional)<div className={`mt-1 ${box}`}><Phone className="h-4 w-4 text-primary" /><input inputMode="tel" maxLength={14} className={inp} value={f.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="98XXXXXXXX" /></div></label>
      <label className="text-xs font-bold">Position<select className={`mt-1 ${box} w-full`} value={f.role} onChange={(e) => set({ role: e.target.value as Role })}>{ROLES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <label className="text-xs font-bold">State<select className={`mt-1 ${box} w-full`} value={f.state} onChange={(e) => set({ state: e.target.value })}><option value="">— state —</option>{INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}</select></label>
      <label className="text-xs font-bold">Area name (optional)<div className={`mt-1 ${box}`}><MapPin className="h-4 w-4 text-primary" /><input maxLength={80} className={inp} value={f.area} onChange={(e) => set({ area: e.target.value })} placeholder="e.g. Malviya Nagar" /></div></label>
      <PinAutocomplete label="Hub PIN (optional)" value={f.pin} onChange={(v) => set({ pin: v })} onPick={(h) => set({ pin: h.pincode, state: h.state, area: f.area || h.areas?.[0] || h.city })} />
      <div className="md:col-span-4"><Button type="submit" className="h-11" disabled={busy}>{busy ? "Creating…" : "Create account"}</Button></div>
    </form>
  );
}
