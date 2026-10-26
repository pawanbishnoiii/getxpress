import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceLevel, ServiceRates } from "./pricing";
export const bookingConfigOptions = queryOptions({ queryKey: ["booking-config"], staleTime: 15000, queryFn: async () => {
  const [r,s] = await Promise.all([supabase.from("service_rates").select("*"), supabase.from("app_settings").select("cash_on_pickup").eq("id",true).maybeSingle()]);
  if(r.error) throw new Error(r.error.message); if(s.error) throw new Error(s.error.message);
  const rates: ServiceRates = {}; for(const row of r.data ?? []) rates[row.service as ServiceLevel] = { base:Number(row.base),perKg:Number(row.per_kg),active:row.active };
  return { rates, cashOnPickup:s.data?.cash_on_pickup ?? true };
} });