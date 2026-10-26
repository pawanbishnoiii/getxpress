/** Which signed-in menu pages each role can see. Server/RLS still enforce data access. */
export type AccessRole = "admin" | "state_director" | "state_manager" | "area_manager" | "network" | "point";
export type NavFlags = { to: string; staff?: boolean; admin?: boolean; wallet?: boolean; customer?: boolean };

export function navVisible(i: NavFlags, roles: readonly string[]) {
  const isStaff = roles.length > 0, isAdmin = roles.includes("admin");
  const isManager = roles.some((r) => r === "state_manager" || r === "state_director");
  return (!i.customer || !isStaff) && (!i.staff || isStaff) && (!i.admin || isAdmin || (isManager && i.to === "/applications")) && (!i.wallet || (isStaff && !isAdmin));
}
