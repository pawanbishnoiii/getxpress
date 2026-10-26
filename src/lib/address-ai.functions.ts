import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "./auth-guard";

const input = z.object({
  pickup: z.string().trim().min(3).max(400),
  drop: z.string().trim().min(3).max(400),
});

const issue = z.object({
  ambiguous: z.boolean(),
  confidence: z.enum(["high", "medium", "low"]),
  problems: z.array(z.string()),
  suggested: z.string(),
  pincode: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  ask_customer: z.string().nullable(),
});
const result = z.object({ pickup: issue, drop: issue });
export type AddressCheck = z.infer<typeof result>;

const LOVABLE_AIG_RUN_ID = "X-Lovable-AIG-Run-ID";

export const checkAddresses = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .inputValidator((d: z.input<typeof input>) => input.parse(d))
  .handler(async ({ data, context }) => {
    const { data: staff } = await context.supabase.rpc("is_staff", { _u: context.userId });
    if (!staff) throw new Error("Only delivery staff can use the address checker.");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("AI is not configured.");
    const { createOpenAI } = await import("@ai-sdk/openai");
    const { streamText, Output } = await import("ai");
    let runId: string | undefined;
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey,
      headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
      fetch: async (url, init) => {
        const h = new Headers(init?.headers);
        if (runId) h.set(LOVABLE_AIG_RUN_ID, runId);
        const res = await fetch(url, { ...init, headers: h });
        runId ??= res.headers.get(LOVABLE_AIG_RUN_ID) ?? undefined;
        return res;
      },
    });
    const stream = streamText({
      model: provider.responses("openai/gpt-6-astra"),
      system:
        "You are an Indian courier address verifier. For each address decide if a rider could find it without calling. Flag missing house/flat number, missing landmark, missing or mismatching 6-digit PIN, misspelled locality, duplicate area names that exist in several cities, or vague text. Write a corrected, clearly formatted single-line address (keep the customer's facts, never invent house numbers — use placeholders like [house no.] when missing). Give a short question the staff should ask the customer when something is missing.",
      prompt: `Pickup address: ${data.pickup}\nDrop-off address: ${data.drop}`,
      output: Output.object({ schema: result }),
      providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
    });
    try {
      return (await stream.output) as AddressCheck;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (/402|credit/i.test(msg)) throw new Error("AI credits are used up. Add credits to keep using the address checker.");
      if (/429/.test(msg)) throw new Error("Too many checks right now. Please wait a minute and try again.");
      console.error("address check failed", msg);
      throw new Error("Address check failed. Please try again.");
    }
  });
