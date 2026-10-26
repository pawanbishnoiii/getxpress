import { useEffect, useRef } from "react";
import parcel from "@/assets/parcel-lottie.json";

/** Bouncing parcel Lottie animation (lottie-web, loaded client-side only). */
export function ParcelLottie({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let anim: { destroy: () => void } | undefined;
    let cancelled = false;
    import("lottie-web").then(({ default: lottie }) => {
      if (cancelled || !ref.current) return;
      anim = lottie.loadAnimation({ container: ref.current, renderer: "svg", loop: true, autoplay: true, animationData: parcel });
    });
    return () => { cancelled = true; anim?.destroy(); };
  }, []);
  return <div ref={ref} className={className} aria-hidden />;
}
