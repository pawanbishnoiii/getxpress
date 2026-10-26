import { createFileRoute, Link } from "@tanstack/react-router";
import { PackageSearch, Truck, Calculator } from "lucide-react";
import { SiteNav, MobileTabBar } from "@/components/site/SiteNav";
import { SiteFooter } from "@/components/site/SiteFooter";
import { NeedHelp } from "@/components/site/NeedHelp";
import helpImg from "@/assets/help-support.jpg";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & support — GetXpress" },
      { name: "description", content: "Ask the GetXpress assistant about booking, prices and tracking. No sign-in needed." },
      { property: "og:title", content: "Help & support — GetXpress" },
      { property: "og:description", content: "Chat with the GetXpress assistant or reach our team on WhatsApp, email or phone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  const quick = [
    { to: "/track", label: "Track a parcel", icon: PackageSearch },
    { to: "/ship", label: "Book a pickup", icon: Truck },
    { to: "/calculator", label: "Check prices", icon: Calculator },
  ] as const;
  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28 md:pt-32">
        <img src={helpImg} alt="GetXpress support agent ready to help" width={1024} height={640} className="mb-6 w-full rounded-2xl border object-cover max-h-64" />
        <h1 className="text-3xl font-extrabold md:text-4xl">How can we help?</h1>
        <p className="mt-2 text-muted-foreground">Ask anything below — no account needed.</p>
        <div className="mt-6"><NeedHelp inline /></div>
        <div className="mt-6 grid grid-cols-3 gap-2">
          {quick.map(({ to, label, icon: I }) => (
            <Link key={to} to={to} className="flex flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm font-semibold hover:border-primary">
              <I className="h-6 w-6 text-primary" />{label}
            </Link>
          ))}
        </div>
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}
