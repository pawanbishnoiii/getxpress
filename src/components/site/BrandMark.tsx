import { cn } from "@/lib/utils";
import logo from "@/assets/getxpress-wordmark.webp";
import logoLight from "@/assets/getxpress-logo-white.webp";

/**
 * GetXpress wordmark (bundled file so it also loads on non-Lovable hosts like Vercel).
 * `light` swaps in white letters for dark surfaces.
 */
export function BrandMark({ className, light = false }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex w-40 items-center", className)}>
      <img src={light ? logoLight : logo} alt="GetXpress" width={1920} height={640} className="h-auto w-full object-contain" />
    </span>
  );
}
