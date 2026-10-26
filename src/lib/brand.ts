// Central brand config — change name, domain, contacts and public URL here.
// Domain is the intended brand address; QR URLs use the active app origin until configured.
export const brand = {
  name: "GetXpress",
  domain: "getxpress.in",
  tagline: "Every parcel. Moving forward.",
  supportPhone: "+91 00000 00000",
  supportEmail: "help@getxpress.in",
};

/** Public base URL used in labels/QR codes. Set VITE_PUBLIC_BASE_URL once the final domain is live. */
export function publicBaseUrl() {
  const env = import.meta.env["VITE_PUBLIC_BASE_URL"] as string | undefined;
  if (env) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://pinpoint-parcel-pilot.lovable.app";
}
