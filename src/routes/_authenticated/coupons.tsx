import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/coupons")({
  beforeLoad: () => { throw redirect({ to: "/admin/coupons", replace: true }); },
});
