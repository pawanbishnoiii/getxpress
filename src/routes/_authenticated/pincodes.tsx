import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pincodes")({
  beforeLoad: () => { throw redirect({ to: "/admin/pincodes", replace: true }); },
});
