import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/commissions")({
  beforeLoad: () => { throw redirect({ to: "/admin/commissions", replace: true }); },
});
