import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Box, PackageSearch } from "lucide-react";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BookingForm } from "@/components/site/BookingForm";
import { Button } from "@/components/ui/button";
import { LandingExtras } from "@/components/site/LandingExtras";
import { HeroCarousel } from "@/components/site/HeroCarousel";
import { useLandingMotion } from "@/hooks/use-landing-motion";
import packingStory from "@/assets/getxpress-story-packing.jpg";
import scanStory from "@/assets/getxpress-story-scanning.jpg";
import handoverStory from "@/assets/getxpress-story-handover.jpg";
import sealingStory from "@/assets/getxpress-story-sealing.jpg";
import shopStory from "@/assets/getxpress-story-shop.jpg";
import hubStory from "@/assets/getxpress-story-hub.jpg";
import airBanner from "@/assets/getxpress-air-banner.jpg";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Get Xpress — Courier, quotes & doorstep pickup | getxpress.in" },
      {
        name: "description",
        content:
          "Compare Standard, Express and Same Day delivery. Book a Get Xpress courier pickup and track your parcel.",
      },
      { property: "og:title", content: "Get Xpress — Courier & doorstep pickup" },
      {
        property: "og:description",
        content: "Courier quotes, doorstep pickups and parcel tracking across India.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "keywords",
        content:
          "courier service India, doorstep pickup, parcel delivery, international courier, GetXpress",
      },
    ],
    links: [{ rel: "canonical", href: "https://getxpress.in/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "GetXpress",
          url: "https://getxpress.in",
          logo: "https://getxpress.in/favicon.png",
          description:
            "Doorstep courier pickup, delivery and tracking across India and international shipping.",
          areaServed: "IN",
          sameAs: [],
        }),
      },
    ],
  }),
  component: Landing,
});
export function SectionTitle({
  eyebrow,
  title,
  copy,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  copy?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "text-center" : ""}>
      <p className="mb-3 text-xs font-bold uppercase text-primary">{eyebrow}</p>
      <h2 className="text-3xl font-extrabold md:text-4xl">{title}</h2>
      {copy && <p className="mt-4 text-muted-foreground">{copy}</p>}
    </div>
  );
}
function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  useLandingMotion(root);
  return (
    <div ref={root} className="min-h-screen bg-background">
      <SiteNav />
      <main className="pt-24 md:pt-28">
        <HeroCarousel />
        <LandingTracking />
        <section id="shipping-desk" className="gx-ship-parcel scroll-mt-28 bg-muted/40 py-12">
          <div className="mx-auto max-w-[1240px] px-4 md:px-8">
            <div className="overflow-hidden rounded-3xl border bg-card shadow-soft">
              <div className="border-b bg-gradient-to-r from-primary/10 via-card to-card px-5 py-6 md:px-8">
                <h2 className="flex items-center gap-2 text-2xl font-extrabold md:text-3xl">
                  <Box className="h-7 w-7 text-primary" />
                  Ship a parcel
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Enter pickup and delivery PIN codes, compare prices and book a doorstep pickup.
                </p>
              </div>
              <div className="px-5 py-6 md:px-8">
                <BookingForm compact />
                <p className="mt-4 text-sm text-muted-foreground">
                  Shipping abroad?{" "}
                  <Link to="/calculator" className="font-bold text-primary">
                    Compare international prices →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </section>
        <section className="gx-story-section" aria-labelledby="gx-story-heading">
          <div className="gx-story-heading reveal">
            <p>Made for the everyday hustle</p>
            <h2 id="gx-story-heading">A better shipping day,<br />from first pack to final handover.</h2>
            <span>Keep scrolling to follow a parcel from the seller’s hands to its destination.</span>
            <div className="gx-story-meter" aria-hidden="true"><span /></div>
          </div>
          <div className="gx-story-track-window">
          <div className="gx-story-grid">
            {[
              { image: packingStory, alt: "Small business owner carefully packing an order", title: "Packed with care", copy: "A simple start for every order." },
              { image: shopStory, alt: "Independent shop owner preparing a parcel at the counter", title: "Built around your business", copy: "Keep the focus on your next customer." },
              { image: sealingStory, alt: "Artisan sealing a parcel for collection", title: "Ready for pickup", copy: "Arrange collection from your doorstep." },
              { image: handoverStory, alt: "Courier handing a parcel to a family at home", title: "A thoughtful handover", copy: "Follow the parcel through its journey." },
              { image: scanStory, alt: "Parcel barcode scanned at a sorting hub", title: "Scanned as it moves", copy: "See recorded shipment updates." },
              { image: hubStory, alt: "Parcels moving through a modern sorting hub", title: "One step at a time", copy: "From local hubs toward their destination." },
            ].map(({ image, alt, title, copy }, index) => (
              <article className="gx-story-card" key={title}>
                <img src={image} alt={alt} loading="lazy" decoding="async" />
                <motion.div className="gx-story-card-copy" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}>
                  <span>0{index + 1}</span><h3>{title}</h3><p>{copy}</p>
                </motion.div>
              </article>
            ))}
          </div>
          </div>
        </section>
        <section className="mx-auto max-w-[1240px] px-5 pb-12">
          <Link to="/international" className="block overflow-hidden rounded-lg border">
            <img
              src={airBanner}
              alt="GetXpress Air Cargo — international quote requests"
              loading="lazy"
              width={1792}
              height={640}
              className="w-full"
            />
          </Link>
        </section>
        <LandingExtras />
        <section className="bg-muted px-5 py-14">
          <div className="reveal mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6">
            <div>
              <p className="text-xs font-bold uppercase text-primary">Get Xpress partners</p>
              <h2 className="mt-3 text-3xl font-extrabold md:text-4xl">
                Your shop.
                <br />
                The next shipping hub.
              </h2>
            </div>
            <Button asChild className="h-12">
              <Link to="/point-partner">
                Become a Hub
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}

function LandingTracking() {
  const navigate = useNavigate();
  const [trackingNumber, setTrackingNumber] = useState("");
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const id = trackingNumber.trim().toUpperCase();
    if (id) void navigate({ to: "/track", search: { id } });
  };
  return (
    <section className="gx-landing-tracking" aria-labelledby="gx-tracking-heading">
      <div className="gx-landing-tracking-card">
        <span className="gx-landing-tracking-icon"><PackageSearch className="h-6 w-6" /></span>
        <div className="gx-landing-tracking-copy"><p>Already sent a parcel?</p><h2 id="gx-tracking-heading">Track it from here.</h2><span>Enter your AWB, parcel ID or international quote reference.</span></div>
        <form onSubmit={submit} className="gx-landing-tracking-form">
          <label className="sr-only" htmlFor="gx-landing-tracking-input">Tracking number</label>
          <input id="gx-landing-tracking-input" value={trackingNumber} onChange={(event) => setTrackingNumber(event.target.value.slice(0, 30))} placeholder="AWB / parcel ID / GXI reference" maxLength={30} required />
          <button type="submit">Track parcel <ArrowRight className="h-4 w-4" /></button>
        </form>
      </div>
    </section>
  );
}
