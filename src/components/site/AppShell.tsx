import { Link, Navigate, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3, Bell, ClipboardList, Home, Loader2, LogOut, MapPin, PackagePlus, ScanLine, ShieldCheck, Store, Ticket, UserRound, RotateCcw, Boxes, Coins, Settings, Wallet, Users, ClipboardCheck, Menu, Maximize2, Minimize2, History, Wand2, CreditCard, Barcode, Building2, Mail, Activity, Search,
} from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useProfile } from "@/hooks/use-profile";
import { ROLE_LABEL, useRoles } from "@/hooks/use-roles";
import { supabase } from "@/integrations/supabase/client";

import { NeedHelp } from "./NeedHelp";
import { Button } from "@/components/ui/button";
import { navVisible } from "@/lib/access";

type NavItem = { to: string; label: string; icon: typeof Home; staff?: boolean; admin?: boolean; wallet?: boolean; customer?: boolean };
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "My shipping", items: [
    { to: "/users/dashboard", label: "Dashboard", icon: Home, customer: true },
    { to: "/users/addorder", label: "Add order", icon: PackagePlus, customer: true },
    { to: "/users/orders", label: "Orders", icon: ClipboardList, customer: true },
    { to: "/users/returns", label: "Returns", icon: RotateCcw, customer: true },
    { to: "/dashboard", label: "Dashboard", icon: Home, staff: true },
    { to: "/users/addorder", label: "Book parcel", icon: PackagePlus, staff: true },
    { to: "/orders", label: "Orders", icon: ClipboardList, staff: true },
    { to: "/returns", label: "Returns & RTO", icon: RotateCcw, staff: true },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ] },
  { group: "Operations", items: [
    { to: "/scan", label: "Scan parcels", icon: ScanLine, staff: true },
    { to: "/tally", label: "Delivery tally", icon: ClipboardCheck, staff: true },
    { to: "/bags", label: "Dispatch center", icon: Boxes, staff: true },
    { to: "/manifest", label: "Manifest", icon: Boxes, staff: true },
    { to: "/wallet", label: "Wallet", icon: Wallet, wallet: true },
    { to: "/wallet-transactions", label: "Wallet transactions", icon: History, wallet: true },
    { to: "/analytics", label: "Analytics", icon: BarChart3, staff: true },
    { to: "/admin/staff", label: "Staff & territory map", icon: MapPin, staff: true },
    { to: "/team-prices", label: "Team prices", icon: Coins, staff: true },
    { to: "/onboarding", label: "My profile", icon: UserRound },
  ] },
  { group: "Admin", items: [
    { to: "/admin/customers", label: "Customer records", icon: Users, admin: true },
    { to: "/admin/payouts", label: "Manual gateway", icon: Wallet, admin: true },
    { to: "/admin/team", label: "Users & last seen", icon: Users, admin: true },
    { to: "/admin/console", label: "Users, areas & PINs", icon: MapPin, admin: true },
    { to: "/admin/commissions", label: "Commissions", icon: Coins, admin: true },
    { to: "/applications", label: "Hub applications", icon: Store, admin: true },
    { to: "/admin/coupons", label: "Offers & coupons", icon: Ticket, admin: true },
    { to: "/admin/pincodes", label: "Pincode master", icon: MapPin, admin: true },
    { to: "/admin/settings", label: "Prices & integrations", icon: Settings, admin: true },
    { to: "/admin/gateways/payment", label: "Gateways", icon: CreditCard, admin: true },
    { to: "/admin/barcode", label: "Barcodes", icon: Barcode, admin: true },
    { to: "/company", label: "Company dashboard", icon: Building2, admin: true },
    { to: "/admin/company", label: "Company profile", icon: Building2, admin: true },
    { to: "/admin/smtp", label: "SMTP & email", icon: Mail, admin: true },
  ] },
  { group: "Developer", items: [
    { to: "/admin/developer", label: "API & webhooks", icon: Activity, admin: true },
    { to: "/admin/gateways/payment", label: "API keys", icon: CreditCard, admin: true },
    { to: "/admin/diagnostics", label: "Diagnostics", icon: Activity, admin: true },
    { to: "/admin/audit", label: "Audit log", icon: History, admin: true },
  ] },
];

function FullscreenToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => { const h = () => setOn(!!document.fullscreenElement); document.addEventListener("fullscreenchange", h); return () => document.removeEventListener("fullscreenchange", h); }, []);
  const toggle = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.(); };
  return <button onClick={toggle} aria-label={on ? "Exit fullscreen" : "Fullscreen"} className="hidden h-10 w-10 place-items-center rounded-xl border bg-card lg:grid">{on ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>;
}

function Clock() {
  const [t, setT] = useState<Date | null>(null);
  useEffect(() => { setT(new Date()); const i = setInterval(() => setT(new Date()), 30000); return () => clearInterval(i); }, []);
  return <span>{t ? t.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}</span>;
}

/** Signed-in frame: Shiprocket-style sidebar on desktop, app-style tab bar on phones. Requires verified phone. */
export function AppShell({ children, requirePhone = true, wide = false, skipOnboarding = false }: { children: ReactNode; requirePhone?: boolean; wide?: boolean; skipOnboarding?: boolean }) {
  const { data, isLoading } = useProfile();
  const { isStaff, isAdmin, primary, roles } = useRoles();
  const isManager = roles.some((r) => r === "state_manager" || r === "state_director");
  useEffect(() => { supabase.rpc("touch_last_seen").then(() => {}); }, []);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navQ, setNavQ] = useState("");
  const qc = useQueryClient();
  const navigate = useNavigate();
  if (isLoading) return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (requirePhone && !data?.profile?.phone_verified) return <Navigate to="/onboarding" replace />;
  if (requirePhone && !skipOnboarding && !data?.profile?.onboarded_at) return <Navigate to="/onboarding" replace />;
  const signOut = async () => {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };
  const visible = (i: NavItem) => navVisible(i, roles);
  const phone = data?.profile?.phone || "Phone not verified";
  const city = (data?.profile as { city?: string | null } | null | undefined)?.city || "India";
  const home = isStaff ? "/dashboard" : "/users/dashboard";
  const authEmail = data?.user.email && !/@phone\.getxpress\.in$/i.test(data.user.email) ? data.user.email : "";
  const name = data?.profile?.full_name || authEmail || "";

  return (
    <div className="min-h-screen bg-background">
      <aside className="gx-admin-sidebar fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-ink text-ink-foreground lg:flex">
        <Link to="/" className="gx-admin-brand mx-5 mb-3 mt-6 block"><BrandMark light className="w-44" /></Link>
        <div className="gx-admin-search mx-3 mb-4 flex items-center gap-2 rounded-xl bg-ink-foreground/10 px-3"><Search className="h-4 w-4 opacity-60" /><input value={navQ} onChange={(e) => setNavQ(e.target.value)} placeholder="Find a page…" aria-label="Find a page" className="h-9 w-full bg-transparent text-sm outline-none placeholder:text-ink-foreground/50" /></div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
          {NAV.map((g) => {
            const items = g.items.filter(visible).filter((i) => !navQ || i.label.toLowerCase().includes(navQ.toLowerCase()));
            if (!items.length) return null;
            return (
              <div key={g.group}>
                <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-ink-foreground/50">{g.group}</p>
                {items.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} className="gx-admin-nav-link group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-ink-foreground/70 transition-all hover:translate-x-0.5 hover:bg-ink-foreground/10 hover:text-ink-foreground"
                    activeProps={{ className: "bg-primary !text-primary-foreground shadow-lg shadow-primary/30" }}>
                    <Icon className="h-4 w-4" />{label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="gx-admin-profile border-t border-ink-foreground/10 p-4">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="font-mono text-xs text-ink-foreground/80">{phone}</p>
          <p className="text-xs text-ink-foreground/60">{city} · {primary ? ROLE_LABEL[primary] : "Customer"}</p>
          <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-foreground/10 py-2 text-sm font-bold"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="gx-app-header sticky top-0 z-30 border-b bg-background/85 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 lg:hidden"><button onClick={() => setMenuOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl border bg-card"><Menu className="h-4 w-4" /></button><Link to="/"><BrandMark className="w-32" /></Link></div>
            <div className="hidden text-sm lg:block"><p className="font-bold">{name} <span className="font-mono font-semibold text-muted-foreground">· {phone}</span></p><p className="text-xs text-muted-foreground">{city} · <Clock /></p></div>
            <div className="flex items-center gap-2">
              <Link to={isStaff ? "/scan" : "/users/dashboard"} className="hidden items-center gap-1.5 rounded-xl border bg-card px-4 py-2 text-sm font-bold sm:flex"><ScanLine className="h-4 w-4" /> Scan</Link>
              <Link to="/users/addorder" className="hidden items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground sm:flex"><PackagePlus className="h-4 w-4" /> Add order</Link>
              <NeedHelp />
              <Button variant="outline" size="icon" aria-label="Search pages" title="Search pages" onClick={()=>{if(window.innerWidth<1024)setMenuOpen(true); else document.querySelector<HTMLInputElement>('[aria-label="Find a page"]')?.focus();}}><Search/></Button>
              <FullscreenToggle />
              <Link to="/notifications" aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-xl border bg-card"><Bell className="h-4 w-4" /></Link>
              
            </div>
          </div>
        </header>
        <main className={`mx-auto px-4 pb-12 pt-6 lg:px-8 lg:pb-12 ${wide ? "max-w-7xl" : "max-w-5xl"}`}>{children}</main>
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <button aria-label="Close menu" className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[82%] max-w-xs flex-col bg-ink text-ink-foreground animate-in slide-in-from-left duration-200">
            <div className="mx-5 mb-3 mt-6"><BrandMark light className="w-40" /></div>
            <input aria-label="Search mobile pages" placeholder="Find a page…" value={navQ} onChange={e=>setNavQ(e.target.value)} className="mx-4 mb-4 rounded-md border bg-ink px-3 py-2"/>
            <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6">
              {NAV.map((g) => {
                const items = g.items.filter(visible).filter(i=>!navQ||i.label.toLowerCase().includes(navQ.toLowerCase()));
                if (!items.length) return null;
                return (
                  <div key={g.group}>
                    <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-ink-foreground/50">{g.group}</p>
                    {items.map(({ to, label, icon: Icon }) => (
                      <Link key={to} to={to} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-foreground/80" activeProps={{ className: "bg-primary !text-primary-foreground" }}>
                        <Icon className="h-4 w-4" />{label}
                      </Link>
                    ))}
                  </div>
                );
              })}
            </nav>
            <div className="border-t border-ink-foreground/10 p-4">
              <p className="truncate text-sm font-bold">{name}</p>
              <p className="font-mono text-xs text-ink-foreground/80">{phone}</p>
              <button onClick={signOut} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-ink-foreground/10 py-2 text-sm font-bold"><LogOut className="h-4 w-4" /> Sign out</button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight lg:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stat({ label, value, tone = "card" }: { label: string; value: ReactNode; tone?: "card" | "primary" | "ink" | "lime" }) {
  const cls = { card: "border bg-card", primary: "bg-primary text-primary-foreground", ink: "bg-ink text-ink-foreground", lime: "bg-lime text-ink" }[tone];
  return (
    <div className={`rounded-lg p-5 ${cls}`}>
      <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
