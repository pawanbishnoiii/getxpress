import { useEffect, useLayoutEffect, type RefObject } from "react";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** Lenis smooth scroll + GSAP ScrollTrigger reveals, loaded client-side only. */
export function useLandingMotion(root: RefObject<HTMLElement | null>) {
  useIso(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    let cleanup = () => {};
    let cancelled = false;
    (async () => {
      const [{ default: gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (cancelled || !root.current) return;
      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ duration: 1.05, smoothWheel: true });
      const storyMatchMedia = gsap.matchMedia();
      let frame = 0;
      const raf = (t: number) => {
        lenis.raf(t);
        frame = requestAnimationFrame(raf);
      };
      frame = requestAnimationFrame(raf);
      lenis.on("scroll", ScrollTrigger.update);
      const ctx = gsap.context(() => {
        gsap.from(".hero-rise", {
          y: 44,
          opacity: 0,
          duration: 1,
          stagger: 0.09,
          ease: "power4.out",
        });
        gsap.fromTo(
          ".hero-photo-img",
          { scale: 1.08, opacity: 0.6 },
          { scale: 1, opacity: 1, duration: 2.2, ease: "power2.out" },
        );
        gsap.to(".hero-photo-img", {
          yPercent: 6,
          ease: "none",
          scrollTrigger: { trigger: ".hero-shell", start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.fromTo(".hero-bg", { scale: 1.12 }, { scale: 1, duration: 2.6, ease: "power2.out" });
        gsap.to(".hero-bg", {
          yPercent: 12,
          ease: "none",
          scrollTrigger: { trigger: ".hero-shell", start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.from(".hero-chip", {
          y: 24,
          opacity: 0,
          scale: 0.9,
          duration: 0.8,
          delay: 0.7,
          stagger: 0.25,
          ease: "back.out(1.8)",
        });
        gsap.to(".hero-chip", {
          y: -8,
          duration: 2.4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          stagger: 0.6,
          delay: 1.6,
        });
        gsap.from(".hero-console", {
          x: 42,
          y: 18,
          opacity: 0,
          scale: 0.96,
          duration: 1.25,
          delay: 0.18,
          ease: "power4.out",
        });
        gsap.to(".hero-console", {
          yPercent: 3,
          rotate: -0.35,
          ease: "none",
          scrollTrigger: { trigger: ".hero-shell", start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.from(".service-icon", {
          y: 20,
          opacity: 0,
          duration: 0.6,
          stagger: 0.05,
          delay: 0.5,
          ease: "power3.out",
        });
        gsap.utils.toArray<HTMLElement>(".magnetic").forEach((el) => {
          const move = (e: PointerEvent) => {
            const r = el.getBoundingClientRect();
            gsap.to(el, {
              x: (e.clientX - r.left - r.width / 2) * 0.15,
              y: (e.clientY - r.top - r.height / 2) * 0.2,
              duration: 0.4,
            });
          };
          const leave = () =>
            gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: "elastic.out(1,0.4)" });
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerleave", leave);
        });
        gsap.from(".hero-art", {
          scale: 0.9,
          rotate: 3,
          opacity: 0,
          duration: 1.3,
          delay: 0.15,
          ease: "power4.out",
        });
        gsap.to(".hero-art", {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: ".hero-shell", start: "top top", end: "bottom top", scrub: 1 },
        });
        gsap.utils
          .toArray<HTMLElement>(".reveal")
          .forEach((el) =>
            gsap.from(el, {
              y: 45,
              opacity: 0,
              duration: 0.85,
              ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 86%", once: true },
            }),
          );
        gsap.utils
          .toArray<HTMLElement>(".parallax-img")
          .forEach((el) =>
            gsap.fromTo(
              el,
              { scale: 1.15 },
              {
                scale: 1,
                ease: "none",
                scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 1 },
              },
            ),
          );
        gsap.utils.toArray<HTMLElement>(".gx-story-card").forEach((card) => {
          const image = card.querySelector("img");
          if (!image) return;
          gsap.fromTo(
            image,
            { scale: 1.1, yPercent: -2 },
            {
              scale: 1,
              yPercent: 2,
              ease: "none",
              scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.7 },
            },
          );
        });
        storyMatchMedia.add("(min-width: 900px)", () => {
          const section = root.current?.querySelector<HTMLElement>(".gx-story-section");
          const track = section?.querySelector<HTMLElement>(".gx-story-grid");
          if (!section || !track) return;
          const distance = () => Math.max(0, track.scrollWidth - section.clientWidth);
          const horizontal = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top+=72",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.85,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });
          gsap.fromTo(".gx-story-meter span", { scaleX: 0 }, {
            scaleX: 1,
            transformOrigin: "left center",
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top+=72",
              end: () => `+=${distance()}`,
              scrub: 0.85,
              invalidateOnRefresh: true,
            },
          });
          const cardsIn = gsap.fromTo(track.children, { opacity: 0.45, y: 24 }, {
            opacity: 1,
            y: 0,
            stagger: 0.12,
            ease: "none",
            scrollTrigger: {
              trigger: section,
              start: "top top+=72",
              end: () => `+=${distance()}`,
              scrub: 0.6,
              invalidateOnRefresh: true,
            },
          });
          return () => { horizontal.scrollTrigger?.kill(); cardsIn.scrollTrigger?.kill(); };
        });
        gsap.fromTo(
          ".route-line",
          { strokeDashoffset: 1200 },
          {
            strokeDashoffset: 0,
            ease: "none",
            scrollTrigger: {
              trigger: ".route-shell",
              start: "top 75%",
              end: "bottom 60%",
              scrub: 1,
            },
          },
        );
        gsap.fromTo(
          ".timeline-progress",
          { scaleY: 0 },
          {
            scaleY: 1,
            transformOrigin: "top center",
            ease: "none",
            scrollTrigger: {
              trigger: ".timeline-shell",
              start: "top 65%",
              end: "bottom 70%",
              scrub: 1,
            },
          },
        );
        gsap.utils
          .toArray<HTMLElement>(".timeline-card")
          .forEach((card, i) =>
            gsap.from(card, {
              x: i % 2 ? 70 : -70,
              opacity: 0,
              ease: "power3.out",
              scrollTrigger: { trigger: card, start: "top 85%", end: "top 60%", scrub: 1 },
            }),
          );
        gsap.utils.toArray<HTMLElement>(".count-up").forEach((el) => {
          const end = Number(el.dataset["to"] ?? 0);
          const obj = { v: 0 };
          gsap.to(obj, {
            v: end,
            duration: 1.6,
            ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
            onUpdate: () => {
              el.textContent =
                Math.round(obj.v).toLocaleString("en-IN") + (el.dataset["suffix"] ?? "");
            },
          });
        });
      }, root);
      cleanup = () => {
        cancelAnimationFrame(frame);
        storyMatchMedia.revert();
        lenis.destroy();
        ctx.revert();
      };
    })();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);
}
