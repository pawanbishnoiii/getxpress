import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/diagnostics")({
  beforeLoad: () => { throw redirect({ to: "/admin/diagnostics", replace: true }); },
});
