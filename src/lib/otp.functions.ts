import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser as requireSupabaseAuth } from "@/lib/auth-guard";

// Development mode: no SMS provider is connected yet, so the code is returned
// to the client and shown on screen. Flip to false once MSG91/Fast2SMS is wired.
const OTP_DEV_DISPLAY = true;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const sendPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string }) => z.object({ phone: z.string().regex(/^[6-9]\d{9}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 60_000).toISOString();
    const { count } = await supabaseAdmin.from("phone_otps").select("id", { count: "exact", head: true }).eq("user_id", context.userId).gte("created_at", since);
    if ((count ?? 0) > 0) throw new Error("Please wait a minute before requesting another code.");
    const n = new Uint32Array(1);
    crypto.getRandomValues(n);
    const code = String((n[0] ?? 0) % 1_000_000).padStart(6, "0");
    const { error } = await supabaseAdmin.from("phone_otps").insert({
      user_id: context.userId,
      phone: data.phone,
      code_hash: await sha256(`${context.userId}:${code}`),
      expires_at: new Date(Date.now() + 5 * 60_000).toISOString(),
    });
    if (error) throw new Error(error.message);
    return { sent: true, devCode: OTP_DEV_DISPLAY ? code : null };
  });

export const verifyPhoneOtp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { phone: string; code: string }) => z.object({ phone: z.string().regex(/^[6-9]\d{9}$/), code: z.string().regex(/^\d{6}$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: otp } = await supabaseAdmin.from("phone_otps").select("*").eq("user_id", context.userId).eq("phone", data.phone).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!otp) throw new Error("No active code. Request a new one.");
    if (new Date(otp.expires_at) < new Date()) throw new Error("Code expired. Request a new one.");
    if (otp.attempts >= 5) throw new Error("Too many attempts. Request a new code.");
    const ok = otp.code_hash === (await sha256(`${context.userId}:${data.code}`));
    if (!ok) {
      await supabaseAdmin.from("phone_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      throw new Error("Incorrect code.");
    }
    await supabaseAdmin.from("phone_otps").update({ consumed_at: new Date().toISOString() }).eq("id", otp.id);
    const { error } = await supabaseAdmin.from("profiles").upsert({ id: context.userId, phone: `+91${data.phone}`, phone_verified: true, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { verified: true };
  });
