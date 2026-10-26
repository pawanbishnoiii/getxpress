import { PhoneTabBar } from "./SiteNav";
import PushpinTearFooter from "@/components/ui/pushpin-tear-footer";
import { BrandMark } from "./BrandMark";
import { brand } from "@/lib/brand";

// Torn-poster footer: navy sheet (brand ink) over warm paper; SVG/canvas need literal hex colours.
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (<>
    <PushpinTearFooter
      brand="getxpress."
      name="GetXpress Courier"
      logo={<BrandMark light className="w-40" />}
      logoHref="/"
      email={brand.supportEmail}
      socials={[
        { icon: "globe", label: "getxpress.in", href: "https://getxpress.in" },
        { icon: "mail", label: "Email us", href: `mailto:${brand.supportEmail}` },
        { icon: "chat", label: "Track a parcel", href: "/track" },
      ]}
      newsletter={null}
      status={{ label: "Pickups open today across India", href: "/ship" }}
      mark={`GX / ${year}`}
      timeZone="Asia/Kolkata"
      timeLabel="IST"
      columns={[
        { title: "Ship", links: [{ label: "Book a shipment", href: "/ship" }, { label: "Track a parcel", href: "/track" }, { label: "Rate calculator", href: "/calculator" }, { label: "International", href: "/international" }], cta: { label: "ship.", href: "/ship" } },
        { title: "Company", links: [{ label: "Open a hub", href: "/point-partner" }, { label: "Shipping policy", href: "/shipping-policy" }, { label: "Refunds", href: "/refunds" }, { label: "Sign in", href: "/auth" }] },
      ]}
      chat={{ label: "need help?", href: `mailto:${brand.supportEmail}` }}
      sideLinks={[{ icon: "shield", label: "privacy", href: "/privacy" }, { icon: "doc", label: "terms", href: "/terms" }]}
      copyright={`© ${year} ${brand.name}`}
      credit="From your door to theirs"
      handle={{ label: "getxpress.in", href: "https://getxpress.in" }}
      sheet="#14213d"
      paper="#f4f1ec"
      sheetInk="#ffffff"
      height="680px"
    />
    <PhoneTabBar /></>
  );
}
