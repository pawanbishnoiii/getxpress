import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";
import { routeTree } from "@/routeTree.gen";
import { NAV } from "@/components/site/AppShell";
import { navVisible } from "@/lib/access";

const items = NAV.flatMap((g) => g.items);
const pages = (roles: string[]) => items.filter((i) => navVisible(i, roles)).map((i) => i.to);
const ADMIN_ONLY = ["/admin/team", "/admin/console", "/admin/commissions", "/admin/coupons", "/admin/pincodes", "/admin/settings", "/admin/diagnostics"];

describe("role dashboards and page access", () => {
  it("every menu page exists as a real route", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    for (const i of items) expect(router.matchRoutes(i.to).at(-1)?.routeId, i.to).not.toBe(rootRouteId);
  });
  it("customer sees customer dashboard and no staff/admin pages", () => {
    const p = pages([]);
    expect(p).toContain("/users/dashboard");
    for (const x of ["/dashboard", "/scan", "/bags", ...ADMIN_ONLY]) expect(p).not.toContain(x);
  });
  for (const role of ["state_director", "state_manager", "area_manager", "network", "point"]) {
    it(`${role} gets staff dashboard, scanning and wallet but no admin pages`, () => {
      const p = pages([role]);
      for (const x of ["/dashboard", "/scan", "/bags", "/orders", "/wallet"]) expect(p).toContain(x);
      for (const x of ADMIN_ONLY) expect(p).not.toContain(x);
      expect(p).not.toContain("/users/dashboard");
    });
  }
  it("only state managers/directors (and admin) see hub applications", () => {
    expect(pages(["state_manager"])).toContain("/applications");
    expect(pages(["state_director"])).toContain("/applications");
    expect(pages(["area_manager"])).not.toContain("/applications");
    expect(pages(["point"])).not.toContain("/applications");
  });
  it("admin sees every admin page and no wallet", () => {
    const p = pages(["admin"]);
    for (const x of ADMIN_ONLY) expect(p).toContain(x);
    expect(p).not.toContain("/wallet");
  });
});
