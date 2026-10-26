import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Development mode: no SMS provider is connected yet, so the code is shown on screen.
const OTP_DEV_DISPLAY = true;
const phoneSchema = z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number");

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Public: request a login code for a mobile number (rate-limited to 1/min per number). */
export const requestLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string }) => z.object({ phone: phoneSchema }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin.from("login_otps").select("id", { count: "exact", head: true }).eq("phone", data.phone).gte("created_at", since);
    if ((count ?? 0) > 0) throw new Error("Please wait a minute before requesting another code.");
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    const code = String((n[0] ?? 0) % 1_000_000).padStart(6, "0");
    const { error } = await supabaseAdmin.from("login_otps").insert({
      phone: data.phone, code_hash: await sha256(`${data.phone}:${code}`), expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return { sent: true, devCode: OTP_DEV_DISPLAY ? code : null };
  });

/** Public: verify the code, find or create the account for that number, return a one-time sign-in token. */
export const verifyLoginOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { phone: string; code: string }) => z.object({ phone: phoneSchema, code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: otp } = await supabaseAdmin.from("login_otps").select("*").eq("phone", data.phone).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!otp) throw new Error("No active code. Request a new one.");
    if (new Date(otp.expires_at) < new Date()) throw new Error("Code expired. Request a new one.");
    if (otp.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    if (otp.code_hash !== (await sha256(`${data.phone}:${data.code}`))) {
      await supabaseAdmin.from("login_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("Incorrect code.");
    }
    await supabaseAdmin.from("login_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);

    const full = `+91${data.phone}`;
    const { data: prof } = await supabaseAdmin.from("profiles").select("id").in("phone", [full, data.phone]).eq("phone_verified", true).limit(1).maybeSingle();
    let email: string | undefined;
    if (prof) {
      email = (await supabaseAdmin.auth.admin.getUserById(prof.id)).data.user?.email ?? undefined;
    }
    if (!email) {
      email = `91${data.phone}@phone.getxpress.in`;
      const created = await supabaseAdmin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { phone: full } });
      const uid = created.data.user?.id;
      if (uid) await supabaseAdmin.from("profiles").upsert({ id: uid, phone: full, phone_verified: true, updated_at: new Date().toISOString() });
      else if (!created.error?.message.toLowerCase().includes("already")) throw new Error(created.error?.message ?? "Could not create account");
    }
    const link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
    if (link.error || !link.data.properties?.hashed_token) throw new Error(link.error?.message ?? "Sign-in failed");
    return { tokenHash: link.data.properties.hashed_token };
  });

/** Public: email a 6-digit sign-in code through the admin SMTP account (creates the account if new). */
export const requestEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string }) => z.object({ email: z.string().trim().toLowerCase().email().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    if (link.error) {
      const created = await supabaseAdmin.auth.admin.createUser({ email: data.email, email_confirm: true });
      if (created.error && !created.error.message.toLowerCase().includes("already")) throw new Error(created.error.message);
      link = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: data.email });
    }
    const otp = link.data?.properties?.email_otp;
    if (link.error || !otp) throw new Error(link.error?.message ?? "Could not create a code");
    const { sendSmtp } = await import("@/lib/email.functions");
    const r = await sendSmtp(data.email, `Your GetXpress sign-in code: ${otp}`, `Your sign-in code is ${otp}\n\nIt expires in 1 hour. If you didn't ask for it, ignore this email.`, { templateKey: "login_otp" });
    if (!r.sent) throw new Error(`Email could not be sent: ${r.error ?? "unknown error"}`);
    return { sent: true };
  });
