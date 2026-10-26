import { createFileRoute } from "@tanstack/react-router";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { brand } from "@/lib/brand";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms & Conditions — ${brand.name}` },
      { name: "description", content: `Terms and conditions for using ${brand.name} courier services.` },
      { property: "og:title", content: `Terms & Conditions — ${brand.name}` },
      { property: "og:description", content: `Terms and conditions for using ${brand.name} courier services.` },
    , { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }],
  }),
  component: Terms,
});

const sections: [string, string][] = [
  ["1. Service", `${brand.name} ("we") provides doorstep parcel pickup and delivery within India. A booking is confirmed only after a master AWB is issued and, for online payment, after payment succeeds. Pay-at-pickup bookings are confirmed on rider collection.`],
  ["2. Prohibited items", "Arms, firearms, ammunition, explosives, illegal drugs, narcotics, stolen goods and other illegal items are not accepted. Flammable liquids, hazardous chemicals, damaged or loose lithium batteries and other dangerous goods must not be booked through the standard service. Declaring electronics or paying a handling fee does not make restricted goods eligible. Parcels may be refused or inspected in accordance with law."],
  ["3. Declared value & liability", "Declare the actual item value accurately. A declared value is not an insurance policy or a guaranteed compensation amount. Coverage, exclusions and any liability limits must be confirmed with the accepted delivery service before dispatch."],
  ["4. Packaging", "The sender must pack parcels securely. Damage from poor packaging is not covered. Volumetric weight applies where it exceeds actual weight."],
  ["5. Delivery", "Delivery timelines are estimates, not guarantees. Undeliverable parcels (wrong address, refusal) may be returned to the sender at the sender's cost."],
  ["6. Tracking & labels", "Each parcel carries a unique piece ID with a Code 128 barcode and QR code. Cancelled or voided label IDs are never reused. Sharing tracking IDs is at the sender's discretion."],
  ["7. Payments & refunds", "Cancellation and refund eligibility depends on pickup, dispatch and the payment record. Approved refunds use the original payment method where supported; support confirms the amount and timing. Return-to-origin, reverse pickup and completed transport may incur additional charges, disclosed before approval. Demo payments do not move real money."],
  ["8. Points & partners", "Get Xpress Points and Mini Hubs operate under a separate partner agreement. Points may only accept shipments for pincodes allocated to them."],
  ["9. Privacy", "We collect sender/receiver details solely to fulfil deliveries and comply with law. We do not sell personal data."],
  ["10. Brand notice", `${brand.domain} is a proposed brand/domain pending ownership and trademark verification. Brand registration and legal office details are pending confirmation.`],
  ["11. Jurisdiction", "These terms are governed by the laws of India. Courts at our registered office have exclusive jurisdiction."],
];

function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-28 md:pt-36">
        <h1 className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">Terms & Conditions</h1>
        <p className="mt-2 text-muted-foreground">Last updated: October 2026 · {brand.name} ({brand.domain})</p>
        <div className="mt-8 space-y-6">
          {sections.map(([h, b]) => (
            <section key={h} className="border-t py-6">
              <h2 className="font-display text-lg font-extrabold">{h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b}</p>
            </section>
          ))}
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Questions? Write to {brand.supportEmail} or call {brand.supportPhone}.</p>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
