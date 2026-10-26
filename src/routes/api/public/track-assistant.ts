import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// Public: customers ask about their own parcel. Requires a real tracking number;
// the model only sees the non-personal fields returned by track_shipment.
const Body = z.object({ tracking: z.string().trim().min(6).max(30), question: z.string().trim().min(2).max(300) });

export const Route = createFileRoute("/api/public/track-assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ error: "Enter a tracking number and a short question." }, { status: 400 });
        const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!, apiKey = process.env["LOVABLE_API_KEY"];
        if (!apiKey) return Response.json({ error: "Assistant is not configured." }, { status: 500 });
        const sb = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
          auth: { persistSession: false },
          global: { fetch: (i, init) => { const h = new Headers(init?.headers); if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization"); h.set("apikey", key); return fetch(i, { ...init, headers: h }); } },
        });
        const { data: shipment } = await sb.rpc("track_shipment", { _tracking: parsed.data.tracking.toUpperCase() });
        if (!shipment) return Response.json({ error: "No shipment found for that tracking number." }, { status: 404 });
        const provider = createOpenAI({ baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" } });
        try {
          const result = streamText({
            model: provider.responses("openai/gpt-6-astra"),
            system: `You are Get Xpress customer support. Answer ONLY from the shipment data below, in 2-4 short sentences, in the customer's language (English or Hinglish). If the data doesn't contain the answer, say so and suggest contacting help@getxpress.in. Never invent dates, locations or promises. Today: ${new Date().toISOString()}.\nSHIPMENT DATA:\n${JSON.stringify(shipment)}`,
            messages: [{ role: "user", content: parsed.data.question }],
            abortSignal: request.signal,
            providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low" } },
          });
          return Response.json({ answer: (await result.text).trim() });
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode ?? 500;
          const msg = status === 402 ? "Assistant is out of AI credits right now." : status === 429 ? "Too many questions — try again in a minute." : "Assistant is unavailable right now.";
          console.error("track-assistant", status, (e as Error).message);
          return Response.json({ error: msg }, { status });
        }
      },
    },
  },
});
