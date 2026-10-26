import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public help chat: short general questions about GetXpress. No private data is read here.
const Body = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(600) })).min(1).max(12),
});

export const Route = createFileRoute("/api/public/help-chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Please type a short question." }, { status: 400 });
        const apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Assistant is not configured." }, { status: 500 });
        const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are GetXpress courier support (India domestic + international parcels). Help with booking, prices, tracking (Track page with tracking number), pickup, packing, prohibited items, wallet, coupons, returns and hub/partner questions. Answer in under 100 words, in the user's language (English/Hindi/Hinglish). Never invent delivery dates, prices or refunds; for account-specific issues suggest opening a help ticket or WhatsApp support." },
              ...parsed.data.messages,
            ],
          }),
          signal: request.signal,
        });
        if (!r.ok) {
          const msg = r.status === 402 ? "Assistant is out of AI credits right now." : r.status === 429 ? "Too many questions — try again in a minute." : "Assistant is unavailable right now.";
          console.error("help-chat", r.status, await r.text());
          return Response.json({ error: msg }, { status: r.status });
        }
        const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
        return Response.json({ answer: j.choices?.[0]?.message?.content?.trim() ?? "" });
      },
    },
  },
});
