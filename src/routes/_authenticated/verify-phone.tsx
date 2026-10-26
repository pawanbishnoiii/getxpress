import { createFileRoute, redirect } from "@tanstack/react-router";

// Phone verification is now step 1 of onboarding.
export const Route = createFileRoute("/_authenticated/verify-phone")({
  beforeLoad: () => { throw redirect({ to: "/onboarding", replace: true }); },
  head: () => ({ meta: [{ title: "Verify mobile — Get Xpress" }, { name: "description", content: "Verify your mobile number." }, { property: "og:title", content: "Verify mobile — Get Xpress" }, { property: "og:description", content: "Verify your mobile number." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }),
});
