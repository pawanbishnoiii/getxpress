import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "admin" | "state_director" | "state_manager" | "area_manager" | "network" | "point";

export const ROLE_LABEL: Record<string, string> = {
  admin: "Admin / Head Office", state_director: "State Director", state_manager: "State Manager",
  area_manager: "Area Manager", point: "Hub", network: "Network Ops",
};

const ORDER: Role[] = ["admin", "state_director", "state_manager", "area_manager", "network", "point"];

/** Roles of the signed-in user (read through RLS: own rows only). */
export function useRoles() {
  const q = useQuery({
    queryKey: ["my-roles"],
    queryFn: async () => ((await supabase.from("user_roles").select("role")).data?.map((r) => r.role) ?? []) as Role[],
  });
  const roles = q.data ?? [];
  const primary = ORDER.find((r) => roles.includes(r)) ?? null;
  return { roles, primary, isStaff: roles.length > 0, isAdmin: roles.includes("admin"), isLoading: q.isLoading };
}
