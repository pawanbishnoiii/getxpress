import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser as requireSupabaseAuth } from "@/lib/auth-guard";

/** Pincode/city autosuggest for signed-in users (booking + admin screens). */
export const searchPincodes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { q: string }) => z.object({ q: z.string().trim().min(2).max(40) }).parse(d))
  .handler(async ({ data, context }) => {
    const q = data.q;
    const byPin = /^\d{2,6}$/.test(q);
    const query = context.supabase.from("pincodes").select("pincode,city,state,zone").eq("active", true).limit(8);
    const { data: rows } = byPin ? await query.like("pincode", `${q}%`) : await query.ilike("city", `%${q}%`);
    return rows ?? [];
  });
