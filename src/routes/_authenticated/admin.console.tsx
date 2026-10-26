import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Loader2, MapPin, ShieldCheck, Upload, Users } from "lucide-react";
import { AppShell } from "@/components/site/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { grantRoleByEmail } from "@/lib/shipments.functions";
import { searchPincodes } from "@/lib/pincodes.functions";
import { ROLE_LABEL } from "@/hooks/use-roles";
import { CreateStaffAccount } from "@/components/site/CreateStaffAccount";
import { TerritoryHierarchy } from "@/components/site/TerritoryHierarchy";

export const Route = createFileRoute("/_authenticated/admin/console")({
  head: () => ({ meta: [{ title: "Staff console — Get Xpress" }, { name: "description", content: "Get Xpress staff console: roles, pincode allocations and audit log." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  component: Console,
});


function Console() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"allocations" | "users" | "territory" | "team" | "staff" | "import" | "audit">("allocations");
  const { data: roles } = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => (await supabase.from("user_roles").select("role")).data?.map((r) => r.role) ?? [],
  });
  const { data: scopes } = useQuery({
    queryKey: ["my-scopes"],
    queryFn: async () => (await supabase.from("staff_scopes").select("*").is("revoked_at", null)).data ?? [],
  });
  const { data: allocations, refetch } = useQuery({
    queryKey: ["allocations"],
    queryFn: async () => {
      const { data } = await supabase.from("pincode_allocations").select("*, pincodes(city,state)").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  const { data: audits } = useQuery({
    queryKey: ["audits"],
    enabled: tab === "audit",
    queryFn: async () => (await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(100)).data ?? [],
  });

  if (roles && roles.length === 0)
    return <AppShell wide><div className="pt-20 text-center"><ShieldCheck className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-3 font-bold">No staff role on this account.</p><p className="text-sm text-muted-foreground">Ask an Admin to grant you a role.</p></div></AppShell>;

  const isAdmin = roles?.includes("admin");
  const myAllocPins = (allocations ?? []).filter((a) => a.status === "active");

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const rows = (allocations ?? []).map((a) => ({ pincode: a.pincode, city: (a.pincodes as { city: string } | null)?.city, state: (a.pincodes as { state: string } | null)?.state, role: a.holder_role, holder: a.holder_user_id, status: a.status, from: a.effective_from, to: a.effective_to ?? "" }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "allocations");
    XLSX.writeFile(wb, "pincode-allocations.xlsx");
  };

  return (
    <AppShell wide>
      <h1 className="font-display text-3xl font-extrabold">Staff console</h1>
      <div className="mt-1 flex flex-wrap gap-1.5">
        {roles?.map((r) => <span key={r} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{ROLE_LABEL[r] ?? r}</span>)}
        {(scopes ?? []).map((s) => <span key={s.id} className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{s.state ?? "Point"}</span>)}
      </div>
      <div className="mt-5 flex gap-1.5 overflow-x-auto">
        {([["users", Users, "Add users"], ["territory", MapPin, "Areas & hubs"], ["allocations", MapPin, "Pincodes"], ["team", Users, "Team"], ["staff", Users, "Grant role"], ["import", Upload, "Import"], ["audit", ShieldCheck, "Audit"]] as const).map(([t, Icon, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-bold ${tab === t ? "bg-ink text-ink-foreground" : "border bg-card"}`}><Icon className="h-4 w-4" />{label}</button>
        ))}
      </div>

      {tab === "allocations" && (
        <div className="mt-5 space-y-4">
          <AllocateForm roles={roles ?? []} onDone={() => { refetch(); qc.invalidateQueries({ queryKey: ["allocations"] }); }} />
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold">Allocations ({myAllocPins.length} active)</h2>
            <button onClick={exportXlsx} className="flex items-center gap-1.5 rounded-xl border bg-card px-3 py-2 text-xs font-bold"><Download className="h-3.5 w-3.5" /> Excel</button>
          </div>
          <div className="space-y-2">
            {(allocations ?? []).map((a) => (
              <div key={a.id} className={`flex items-center justify-between rounded-lg border bg-card p-3.5 ${a.status !== "active" ? "opacity-50" : ""}`}>
                <div>
                  <p className="font-mono font-bold">{a.pincode} <span className="font-sans text-xs font-semibold text-muted-foreground">{(a.pincodes as { city: string } | null)?.city}, {(a.pincodes as { state: string } | null)?.state}</span></p>
                  <p className="text-xs text-muted-foreground">{ROLE_LABEL[a.holder_role]} · {a.status} · {a.holder_user_id}{a.effective_to ? ` · released ${new Date(a.effective_to).toLocaleDateString("en-IN")}` : ""}</p>
                </div>
                {a.status === "active" && (
                  <button onClick={async () => {
                    const { error } = await supabase.rpc("release_pincode", { _allocation_id: a.id });
                    if (error) toast.error(error.message); else { toast.success("Released"); refetch(); }
                  }} className="rounded-xl border px-3 py-1.5 text-xs font-bold">Release</button>
                )}
              </div>
            ))}
            {allocations?.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No allocations in your scope yet.</p>}
          </div>
          {isAdmin && <p className="text-xs text-muted-foreground">Admins can allocate any pincode to any level. State Managers allocate to Area Managers; Area Managers allocate to Points — only from their own pincodes.</p>}
        </div>
      )}

      {tab === "users" && <div className="mt-5">{isAdmin ? <CreateStaffAccount /> : <p className="text-sm text-muted-foreground">Only admins can create logins.</p>}<p className="text-sm">Manage existing users on <Link to="/admin/team" className="font-bold text-primary underline">Users & last seen</Link> and <Link to="/admin/customers" className="font-bold text-primary underline">Customer records</Link>.</p></div>}
      {tab === "territory" && <TerritoryHierarchy />}
      {tab === "team" && <TeamPanel allocations={allocations ?? []} onDone={() => refetch()} />}
      {tab === "staff" && <StaffForm roles={roles ?? []} />}
      {tab === "import" && <ImportPanel isAdmin={!!isAdmin} />}
      {tab === "audit" && (
        <div className="mt-5 space-y-2">
          {(audits ?? []).map((a) => (
            <div key={a.id} className="rounded-lg border bg-card p-3.5 text-sm">
              <p className="font-bold">{a.action} <span className="font-normal text-muted-foreground">on {a.entity}</span></p>
              <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString("en-IN")} · {JSON.stringify(a.meta)}</p>
            </div>
          ))}
          {audits?.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No audit entries yet.</p>}
        </div>
      )}
    </AppShell>
  );
}

/** Accepts a verified mobile number or a user ID and returns the user ID. */
async function resolveHolder(v: string): Promise<string | null> {
  if (/^[0-9a-f-]{36}$/i.test(v)) return v;
  if (/^\+?\d{10,13}$/.test(v)) {
    const { data, error } = await supabase.rpc("find_user_by_phone", { _phone: v });
    if (error) { toast.error(error.message); return null; }
    const u = data?.[0];
    if (!u) { toast.error("No verified account with that mobile number"); return null; }
    toast.message(`Found ${u.full_name ?? "user"} (${(u.roles ?? []).join(", ") || "no role"})`);
    return u.user_id;
  }
  toast.error("Enter a 10-digit mobile number or a user ID");
  return null;
}

function TeamPanel({ allocations, onDone }: { allocations: { id: string; pincode: string; holder_user_id: string; holder_role: string; status: string }[]; onDone: () => void }) {
  const { data = [] } = useQuery({ queryKey: ["staff-dir"], queryFn: async () => (await supabase.rpc("staff_directory")).data ?? [] });
  const [target, setTarget] = useState<Record<string, string>>({});
  return (
    <div className="mt-5 space-y-2">
      {data.map((u) => {
        const held = allocations.filter((a) => a.holder_user_id === u.user_id && a.status === "active");
        return (
          <div key={u.user_id} className="rounded-lg border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="font-bold">{u.full_name ?? "—"} <span className="text-sm font-semibold text-muted-foreground">{u.phone}</span></p>
                <p className="break-all font-mono text-xs text-muted-foreground">ID: {u.user_id}</p></div>
              <div className="flex flex-wrap gap-1">{(u.roles ?? []).map((r) => <span key={r} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">{ROLE_LABEL[r] ?? r}</span>)}{(u.states ?? []).map((st) => <span key={st} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-bold">{st}</span>)}</div>
            </div>
            {held.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {held.map((a) => (
                  <div key={a.id} className="flex items-center gap-1 rounded-xl border px-2 py-1 text-xs">
                    <b className="font-mono">{a.pincode}</b>
                    <input value={target[a.id] ?? ""} onChange={(e) => setTarget({ ...target, [a.id]: e.target.value.trim() })} placeholder="transfer to mobile/ID" className="w-36 bg-transparent outline-none" />
                    <button className="font-bold text-primary" onClick={async () => {
                      const to = await resolveHolder(target[a.id] ?? ""); if (!to) return;
                      const { error } = await supabase.rpc("transfer_pincode", { _allocation_id: a.id, _new_holder: to });
                      if (error) toast.error(error.message); else { toast.success(`${a.pincode} transferred`); onDone(); }
                    }}>Transfer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {data.length === 0 && <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No staff in your scope yet.</p>}
    </div>
  );
}

function AllocateForm({ roles, onDone }: { roles: string[]; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [holder, setHolder] = useState("");
  const [level, setLevel] = useState<string>(roles.includes("area_manager") && !roles.includes("admin") && !roles.includes("state_manager") ? "point" : "area_manager");
  const [suggest, setSuggest] = useState<{ pincode: string; city: string; state: string }[]>([]);
  const search = useServerFn(searchPincodes);
  const [busy, setBusy] = useState(false);
  const levels = roles.includes("admin") ? ["state_manager", "area_manager", "point"] : roles.includes("state_manager") ? ["area_manager"] : ["point"];

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="font-bold">Allocate a pincode</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="relative">
          <input value={pin} placeholder="Pincode" inputMode="numeric" maxLength={6}
            onChange={async (e) => {
              const v = e.target.value.replace(/\D/g, ""); setPin(v);
              if (v.length >= 2) setSuggest(await search({ data: { q: v } }) as { pincode: string; city: string; state: string }[]);
              else setSuggest([]);
            }}
            className="h-12 w-full rounded-lg border bg-background px-4 font-mono font-bold outline-none" />
          {suggest.length > 0 && (
            <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-card shadow-soft">
              {suggest.map((s) => (
                <button key={s.pincode} onClick={() => { setPin(s.pincode); setSuggest([]); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-muted">
                  <span className="font-mono font-bold">{s.pincode}</span> <span className="text-muted-foreground">{s.city}, {s.state}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <input value={holder} onChange={(e) => setHolder(e.target.value.trim())} placeholder="Holder mobile or user ID" className="h-12 rounded-lg border bg-background px-4 text-sm font-semibold outline-none" />
        <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-12 rounded-lg border bg-background px-4 text-sm font-bold outline-none">
          {levels.map((l) => <option key={l} value={l}>{ROLE_LABEL[l]}</option>)}
        </select>
      </div>
      <button disabled={busy || !/^\d{6}$/.test(pin) || !holder} onClick={async () => {
        setBusy(true);
        const holderId = await resolveHolder(holder);
        if (!holderId) { setBusy(false); return; }
        const { error } = await supabase.rpc("allocate_pincode", { _pincode: pin, _holder: holderId, _holder_role: level as "state_manager" | "area_manager" | "point" });
        setBusy(false);
        if (error) toast.error(error.message); else { toast.success(`Pincode ${pin} allocated`); setPin(""); setHolder(""); onDone(); }
      }} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground disabled:opacity-40">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Allocate
      </button>
      <p className="mt-2 text-xs text-muted-foreground">Enter the holder's verified mobile number or their user ID (shown in the Team tab). Conflicts and out-of-scope pins are rejected automatically.</p>
    </div>
  );
}

function StaffForm({ roles }: { roles: string[] }) {
  const grant = useServerFn(grantRoleByEmail);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("area_manager");
  const [state, setState] = useState("");
  const [busy, setBusy] = useState(false);
  const [myId, setMyId] = useState("");
  useEffect(() => { supabase.auth.getUser().then(({ data }) => setMyId(data.user?.id ?? "")); }, []);
  const grantable = roles.includes("admin") ? ["admin", "state_director", "state_manager", "area_manager", "network", "point"]
    : roles.includes("state_director") ? ["state_manager"] : roles.includes("state_manager") ? ["area_manager"] : roles.includes("area_manager") ? ["point"] : [];
  return (
    <div className="mt-5 rounded-lg border bg-card p-4">
      <p className="font-bold">Grant a staff role</p>
      <p className="mt-1 break-all text-xs text-muted-foreground">Your user ID (share it with your manager for pincode allocation): <span className="font-mono font-bold text-ink">{myId}</span></p>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff email or mobile" className="h-12 rounded-lg border bg-background px-4 text-sm font-semibold outline-none" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="h-12 rounded-lg border bg-background px-4 text-sm font-bold outline-none">
          {grantable.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </select>
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="State (for state roles)" className="h-12 rounded-lg border bg-background px-4 text-sm font-semibold outline-none" />
      </div>
      <button disabled={busy || !email || grantable.length === 0} onClick={async () => {
        setBusy(true);
        try {
          if (email.includes("@")) await grant({ data: { email, role: role as "area_manager", ...(state ? { state } : {}) } });
          else {
            const id = await resolveHolder(email); if (!id) { setBusy(false); return; }
            const { error } = await supabase.rpc("grant_staff_role", { _user_id: id, _role: role as "area_manager", ...(state ? { _state: state } : {}) });
            if (error) throw new Error(error.message);
          }
          toast.success(`Role granted to ${email}`); setEmail("");
        } catch (e) { toast.error((e as Error).message); }
        setBusy(false);
      }} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-ink font-bold text-ink-foreground disabled:opacity-40">
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Grant role
      </button>
      {grantable.length === 0 && <p className="mt-2 text-xs text-muted-foreground">Your role cannot grant further roles.</p>}
    </div>
  );
}

function ImportPanel({ isAdmin }: { isAdmin: boolean }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  if (!isAdmin) return <p className="mt-5 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Pincode CSV import is Admin-only.</p>;
  const loadIndia = async () => {
    setBusy(true);
    try {
      const text = await (await fetch("/data/india-pincodes.csv")).text();
      const rows = text.split(/\r?\n/).slice(1).map((l) => { const [pincode = "", city = "", state = ""] = l.split(","); return { pincode, city, state, tier: "", zone: "" }; }).filter((r) => /^\d{6}$/.test(r.pincode));
      let total = 0;
      for (let i = 0; i < rows.length; i += 1000) {
        const { data, error } = await supabase.rpc("import_pincodes", { _rows: rows.slice(i, i + 1000) });
        if (error) throw new Error(error.message);
        total += data as number; setProgress(`${total.toLocaleString("en-IN")} / ${rows.length.toLocaleString("en-IN")}`);
      }
      toast.success(`Loaded ${total.toLocaleString("en-IN")} India pincodes`);
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };
  return (
    <div className="mt-5 rounded-lg border bg-card p-4">
      <p className="font-bold">India pincode list</p>
      <p className="mt-1 text-xs text-muted-foreground">Loads all 19,238 India pincodes (city + state). Safe to run again — existing pincodes are updated, not duplicated.</p>
      <button type="button" disabled={busy} onClick={loadIndia} className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border-2 border-primary font-bold text-primary disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {busy && progress ? `Loading ${progress}` : "Load full India list"}
      </button>
      <p className="mt-5 font-bold">Import pincode CSV</p>
      <p className="mt-1 text-xs text-muted-foreground">Columns: Pincode, City, State, Tier, Zone. Existing pincodes are updated; every import is logged in the audit trail.</p>
      <label className="mt-3 flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary font-bold text-primary-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Choose CSV
        <input type="file" accept=".csv" className="hidden" onChange={async (e) => {
          const file = e.target.files?.[0]; if (!file) return;
          setBusy(true);
          try {
            const text = await file.text();
            const lines = text.split(/\r?\n/).filter(Boolean);
            const header = (lines[0] ?? "").toLowerCase();
            if (!header.includes("pincode") || !header.includes("city")) throw new Error("CSV must have Pincode, City, State columns.");
            const rows = lines.slice(1).map((l) => {
              const [pincode = "", city = "", state = "", tier = "", zone = ""] = l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
              return { pincode, city, state, tier, zone };
            }).filter((r) => /^\d{6}$/.test(r.pincode) && r.city && r.state);
            let total = 0;
            for (let i = 0; i < rows.length; i += 500) {
              const { data, error } = await supabase.rpc("import_pincodes", { _rows: rows.slice(i, i + 500) });
              if (error) throw new Error(error.message);
              total += data as number;
            }
            toast.success(`Imported ${total} pincodes`);
          } catch (err) { toast.error((err as Error).message); }
          setBusy(false);
          e.target.value = "";
        }} />
      </label>
    </div>
  );
}

export function ConsoleLink() {
  return <Link to="/admin/console" className="text-xs font-bold text-primary underline">Staff console</Link>;
}
