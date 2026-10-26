import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/gateways")({
  beforeLoad: () => { throw redirect({ to: "/admin/gateways/$category", params: { category: "payment" }, replace: true }); },
});
