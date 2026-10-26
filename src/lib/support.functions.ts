import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ticketSchema = z.object({
  subject: z.string().trim().min(3).max(140),
  message: z.string().trim().min(5).max(3000),
  tracking_number: z.string().trim().max(40).optional(),
});

/** Signed-in customer opens a help ticket; an AI draft answer is attached right away. */
export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ticketSchema.parse(d))
  .handler(async ({ data, context }) => {
    const ins = await context.supabase
      .from("support_tickets")
      .insert({ user_id: context.userId, subject: data.subject, message: data.message, tracking_number: data.tracking_number || null })
      .select("id")
      .single();
    if (ins.error) throw new Error("Your ticket could not be saved. Please retry.");

    let parcel = "";
    if (data.tracking_number) {
      const { data: s } = await context.supabase
        .from("shipments")
        .select("tracking_number,status,sender_city,receiver_city,created_at")
        .eq("tracking_number", data.tracking_number)
        .maybeSingle();
      if (s) parcel = `Customer's parcel ${s.tracking_number}: status ${s.status}, ${s.sender_city} to ${s.receiver_city}, booked ${s.created_at}.`;
    }

    let answer: string | null = null;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are GetXpress courier support (India + international parcels). Answer briefly (under 120 words), kindly and practically. Never invent delivery dates or refunds; say a team member will confirm anything you cannot know. Reply in the customer's language." },
              { role: "user", content: `${parcel}\nSubject: ${data.subject}\n${data.message}` },
            ],
          }),
        });
        if (r.ok) answer = ((await r.json()) as { choices?: { message?: { content?: string } }[] }).choices?.[0]?.message?.content?.trim() ?? null;
        else console.error("ticket AI", r.status, await r.text());
      } catch (e) { console.error("ticket AI", e); }
    }
    if (answer) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("support_tickets").update({ ai_answer: answer, status: "answered", updated_at: new Date().toISOString() }).eq("id", ins.data.id);
    }
    return { id: ins.data.id, answer };
  });
