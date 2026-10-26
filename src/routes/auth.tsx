import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Mail, Smartphone, ShieldCheck, Truck, MapPin } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { BrandMark } from "@/components/site/BrandMark";
import { requestLoginOtp, verifyLoginOtp, requestEmailOtp } from "@/lib/phone-login.functions";
import hero from "@/assets/login-courier.jpg";

const safe = (r?: string) => (r && r.startsWith("/") && !r.startsWith("//") ? r : "/dashboard");

export const Route = createFileRoute("/auth")({
  validateSearch: (s) => z.object({ redirect: z.string().optional() }).parse(s),
  head: () => ({
    meta: [
      { title: "Sign in — Get Xpress" },
      { name: "description", content: "Sign in to Get Xpress with your mobile number, Google or email." },
      { property: "og:title", content: "Sign in to Get Xpress" },
      { property: "og:description", content: "Book pickups and track shipments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const input = "h-12 w-full rounded-2xl border bg-card px-4 font-semibold outline-none focus:ring-2 focus:ring-ring";

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const target = safe(redirect);
  const [tab, setTab] = useState<"phone" | "email">("phone");
  const [mode, setMode] = useState<"in" | "up">("in");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const reqOtp = useServerFn(requestLoginOtp);
  const verOtp = useServerFn(verifyLoginOtp);
  const reqEmail = useServerFn(requestEmailOtp);
  const [emailSent, setEmailSent] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const sendEmailCode = async () => {
    if (!z.string().email().safeParse(email).success) { toast.error("Enter a valid email"); return; }
    setBusy(true);
    try { await reqEmail({ data: { email } }); setEmailSent(true); toast.success("Code sent to your email"); } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };
  const verifyEmailCode = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: emailCode, type: "email" });
    if (error) { toast.error(error.message); setBusy(false); return; }
    navigate({ to: target, replace: true });
  };

  useEffect(() => {
    sessionStorage.setItem("dbx_after_auth", target);
    supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: target, replace: true }); });
  }, [target, navigate]);

  const google = async () => {
    setBusy(true);
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` });
    if (r.error) { toast.error(r.error.message ?? "Google sign-in failed"); setBusy(false); return; }
    if (r.redirected) return;
    navigate({ to: target, replace: true });
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!/^[6-9]\d{9}$/.test(phone)) { toast.error("Enter a valid 10-digit mobile number"); return; }
    setBusy(true);
    try {
      const r = await reqOtp({ data: { phone } });
      setSent(true); setDevCode(r.devCode); toast.success("Code sent");
    } catch (err) { toast.error((err as Error).message); }
    setBusy(false);
  };

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { tokenHash } = await verOtp({ data: { phone, code } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      navigate({ to: target, replace: true });
    } catch (err) { toast.error((err as Error).message); setBusy(false); }
  };

  const emailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p = z.object({ email: z.string().email(), password: z.string().min(8, "Password needs 8+ characters") }).safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Invalid"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      navigate({ to: target, replace: true });
    } else {
      const { error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/auth?redirect=${encodeURIComponent(target)}` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Check your email to confirm your account.");
    }
  };

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={hero} alt="Get Xpress courier on a scooter" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
        <div className="absolute left-10 top-10 rounded-2xl bg-card/95 px-4 py-2 shadow-soft"><BrandMark /></div>
        <div className="absolute bottom-12 left-12 right-12 text-ink-foreground">
          <p className="max-w-md font-display text-5xl font-extrabold leading-none">Every parcel, one tap away.</p>
          <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold">
            {[{ i: Truck, t: "Doorstep pickup" }, { i: MapPin, t: "19,000+ pincodes" }, { i: ShieldCheck, t: "Secure OTP login" }].map(({ i: I, t }) => (
              <span key={t} className="flex items-center gap-2 rounded-full bg-ink-foreground/15 px-4 py-2 backdrop-blur"><I className="h-4 w-4" />{t}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center bg-hero px-5 py-10">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <Link to="/" className="lg:hidden"><BrandMark /></Link>
          <h1 className="mt-8 font-display text-4xl font-extrabold tracking-tight">Welcome to Get Xpress</h1>
          <p className="mt-2 text-muted-foreground">Sign in with your mobile number to book and track parcels.</p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl border bg-card p-1 text-sm font-bold">
            {(["phone", "email"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`flex items-center justify-center gap-2 rounded-xl py-2.5 ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
                {t === "phone" ? <Smartphone className="h-4 w-4" /> : <Mail className="h-4 w-4" />}{t === "phone" ? "Mobile OTP" : "Email"}
              </button>
            ))}
          </div>

          {tab === "phone" ? (
            !sent ? (
              <form onSubmit={sendCode} className="mt-4 space-y-3">
                <div className="flex h-12 items-center rounded-2xl border bg-card focus-within:ring-2 focus-within:ring-ring">
                  <span className="pl-4 pr-2 font-bold text-muted-foreground">+91</span>
                  <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} inputMode="numeric" placeholder="Mobile number" className="h-full flex-1 bg-transparent pr-4 font-semibold outline-none" />
                </div>
                <button disabled={busy} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Send OTP"}</button>
              </form>
            ) : (
              <form onSubmit={verify} className="mt-4 space-y-3">
                <p className="text-sm text-muted-foreground">Code sent to <b className="text-foreground">+91 {phone}</b> · <button type="button" className="font-bold text-primary" onClick={() => { setSent(false); setCode(""); }}>Change</button></p>
                {devCode && <div className="rounded-2xl border border-dashed bg-card p-3 text-center text-sm">Test mode code: <b className="font-mono text-lg tracking-widest">{devCode}</b></div>}
                <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus placeholder="6-digit code" className={`${input} text-center font-mono text-xl tracking-[0.5em]`} />
                <button disabled={busy || code.length !== 6} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & continue"}</button>
                <button type="button" onClick={() => sendCode()} disabled={busy} className="w-full text-sm font-semibold text-muted-foreground">Resend code</button>
              </form>
            )
          ) : (
            emailSent ? (
            <form onSubmit={verifyEmailCode} className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">Code sent to <b className="text-foreground">{email}</b> · <button type="button" className="font-bold text-primary" onClick={() => { setEmailSent(false); setEmailCode(""); }}>Change</button></p>
              <input value={emailCode} onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus placeholder="6-digit code" className={`${input} text-center font-mono text-xl tracking-[0.5em]`} />
              <button disabled={busy || emailCode.length !== 6} className="flex h-12 w-full items-center justify-center rounded-2xl bg-primary font-bold text-primary-foreground disabled:opacity-50">{busy ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify & continue"}</button>
            </form>
            ) : (
            <form onSubmit={emailSubmit} className="mt-4 space-y-3">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email" className={input} />
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Password" className={input} />
              <button disabled={busy} className="h-12 w-full rounded-2xl bg-primary font-bold text-primary-foreground">{mode === "in" ? "Sign in" : "Create account"}</button>
              <button type="button" onClick={() => setMode(mode === "in" ? "up" : "in")} className="w-full text-sm font-semibold text-muted-foreground">{mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}</button>
              <button type="button" disabled={busy} onClick={sendEmailCode} className="h-11 w-full rounded-2xl border font-bold">Email me a sign-in code instead</button>
            </form>
            )
          )}

          <div className="my-6 flex items-center gap-3 text-xs font-bold text-muted-foreground"><span className="h-px flex-1 bg-border" />OR<span className="h-px flex-1 bg-border" /></div>
          <button onClick={google} disabled={busy} className="flex h-12 w-full items-center justify-center gap-3 rounded-2xl bg-ink font-bold text-ink-foreground shadow-soft transition-transform active:scale-[.98]">
            <svg viewBox="0 0 24 24" className="h-5 w-5"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 12s4.3 9.7 9.6 9.7c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" /></svg>
            Continue with Google
          </button>
          <p className="mt-6 text-center text-xs text-muted-foreground">By continuing you agree to our <Link to="/terms" className="font-bold underline">Terms</Link>.</p>
        </motion.div>
      </div>
    </div>
  );
}
