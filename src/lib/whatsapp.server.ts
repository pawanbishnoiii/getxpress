// Server-only TezSender WhatsApp sender. Settings (API key, endpoint, sender) are entered by the Admin.
export type WaMessage = { to: string; message: string; mediaUrl?: string | null; linkUrl?: string | null };

export async function getWhatsappSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("whatsapp_settings").select("*").eq("id", true).maybeSingle();
  return data;
}

export function normalizeIndianNumber(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  throw new Error("Enter a valid Indian mobile number");
}

/** Sends one WhatsApp message (text, optional image and link). Returns false when WhatsApp is off. */
export async function sendWhatsapp(msg: WaMessage, opts: { force?: boolean } = {}): Promise<boolean> {
  const s = await getWhatsappSettings();
  if (!s || !s.api_key || (!s.enabled && !opts.force)) return false;
  const number = normalizeIndianNumber(msg.to);
  const text = msg.linkUrl ? `${msg.message}\n\n${msg.linkUrl}` : msg.message;
  const endpoint = s.base_url.replace(/\/$/, "") + (msg.mediaUrl ? "/send-media" : "/send-message");
  const body: Record<string, string> = { api_key: s.api_key, number, message: text };
  if (s.instance_id) body["sender"] = s.instance_id;
  if (msg.mediaUrl) { body["media_type"] = "image"; body["url"] = msg.mediaUrl; body["caption"] = text; }
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${s.api_key}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(12000),
  });
  const out = await res.text();
  if (!res.ok || /"status"\s*:\s*(false|"error")/i.test(out)) throw new Error(`WhatsApp send failed (${res.status}): ${out.slice(0, 200)}`);
  return true;
}
