import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Globe2, PackageCheck, Smartphone, Truck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { requestLoginOtp, verifyLoginOtp } from "@/lib/phone-login.functions";
import sellerHero from "@/assets/getxpress-hero-v2-seller.png";
import doorstepHero from "@/assets/getxpress-hero-v2-doorstep.png";
import globalHero from "@/assets/getxpress-hero-v2-global.png";

const SLIDES = [
  {
    eyebrow: "Shipping for growing businesses",
    title: <>Your next order<br /><span>is going places.</span></>,
    copy: "Get pickups, delivery choices and parcel updates into one simple flow. Spend more of your day growing your business.",
    image: sellerHero,
    imageAlt: "An Indian shop owner handing a parcel to her GetXpress courier",
    icon: PackageCheck,
    imageLabel: "For sellers finding their stride",
    theme: "seller",
  },
  {
    eyebrow: "Pickup that starts at your door",
    title: <>Send with care.<br /><span>Stay in the know.</span></>,
    copy: "From a document that cannot wait to a gift across town, arrange collection and follow each recorded handover.",
    image: doorstepHero,
    imageAlt: "A GetXpress courier collecting a parcel at a home doorstep",
    icon: Truck,
    imageLabel: "A little more peace of mind",
    theme: "doorstep",
  },
  {
    eyebrow: "Make room for your next big idea",
    title: <>Small parcel.<br /><span>Big world.</span></>,
    copy: "Need to ship abroad? Share the destination and parcel details. Our team reviews options and confirms the final quote.",
    image: globalHero,
    imageAlt: "An Indian artisan preparing a parcel for international delivery",
    icon: Globe2,
    imageLabel: "International shipping, guided by people",
    theme: "global",
  },
] as const;

export function HeroCarousel() {
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpMode, setOtpMode] = useState(false);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [paused, setPaused] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const requestOtp = useServerFn(requestLoginOtp);
  const verifyOtp = useServerFn(verifyLoginOtp);
  const slide = SLIDES[active]!;
  const SlideIcon = slide.icon;

  useEffect(() => {
    if (paused || otpMode || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((value) => (value + 1) % SLIDES.length), 9000);
    return () => window.clearInterval(timer);
  }, [paused, otpMode, active]);

  useEffect(() => {
    const next = SLIDES[(active + 1) % SLIDES.length]!;
    const image = new window.Image();
    image.decoding = "async";
    image.src = next.image;
  }, [active]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    let revert = () => {};
    void Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(([{ default: gsap }, { ScrollTrigger }]) => {
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      const context = gsap.context(() => {
        if (imageRef.current) gsap.fromTo(imageRef.current, { opacity: 0, scale: 1.025, y: 9, filter: "blur(5px)" }, { opacity: 1, scale: 1, y: 0, filter: "blur(0px)", duration: 1.65, ease: "power2.inOut", overwrite: true });
        gsap.fromTo(".gx-photo-glass", { opacity: 0, y: 12, backdropFilter: "blur(0px)" }, { opacity: 1, y: 0, backdropFilter: "blur(18px)", duration: 1.1, delay: 0.2, ease: "power2.out", overwrite: true });
      });
      revert = () => context.revert();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    return () => { cancelled = true; revert(); };
  }, [active]);

  const move = (step: number) => setActive((value) => (value + step + SLIDES.length) % SLIDES.length);
  const continueWithPhone = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(value)) {
      setPhoneError("Enter a valid 10-digit mobile number");
      return;
    }
    setPhoneError("");
    setPhone(value);
    setOtpBusy(true);
    try {
      const result = await requestOtp({ data: { phone: value } });
      setDevCode(result.devCode);
      setOtpMode(true);
      setPaused(true);
      toast.success("Verification code ready");
    } catch (error) {
      setPhoneError((error as Error).message);
    } finally {
      setOtpBusy(false);
    }
  };
  const finishSignIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (otp.length !== 6) return;
    setOtpBusy(true);
    try {
      const { tokenHash } = await verifyOtp({ data: { phone, code: otp } });
      const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
      if (error) throw error;
      toast.success("You’re signed in. Welcome to GetXpress!");
      await navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setOtpBusy(false);
    }
  };
  const editPhone = () => {
    setOtpMode(false);
    setOtp("");
    setDevCode(null);
    setPaused(true);
  };

  return (
    <section
      className={`gx-hero gx-theme-${slide.theme} relative isolate overflow-hidden`}
      aria-roledescription="carousel"
      aria-label="GetXpress delivery services"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={(event) => setPaused(otpMode || event.currentTarget.contains(document.activeElement))}
      onFocus={() => setPaused(true)}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight") move(1);
        if (event.key === "ArrowLeft") move(-1);
      }}
      tabIndex={0}
    >
      <div aria-hidden="true" className="gx-hero-glow" />
      <div className="gx-hero-layout">
        <div className="gx-hero-copy">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`copy-block-${active}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}>
              <p className={`gx-hero-eyebrow gx-${slide.theme}`}><span className="gx-live-dot" />{slide.eyebrow}</p>
              <h1 className="gx-hero-title">{slide.title}</h1>
              <p className="gx-hero-description">{slide.copy}</p>
            </motion.div>
          </AnimatePresence>

          {otpMode ? (
            <form onSubmit={finishSignIn} className="gx-phone-form gx-otp-form">
              <label htmlFor="gx-hero-otp">Enter your verification code</label>
              <p className="gx-otp-destination">Code for <b>+91 {phone}</b> <button type="button" onClick={editPhone}>Change number</button></p>
              {devCode && <p className="gx-test-code" role="status">Test mode code <b>{devCode}</b></p>}
              <div className="gx-phone-control gx-otp-control">
                <input id="gx-hero-otp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="6-digit OTP" aria-label="6-digit verification code" />
                <button type="submit" disabled={otpBusy || otp.length !== 6}>{otpBusy ? "Verifying…" : "Verify & continue"}<ChevronRight className="h-4 w-4" /></button>
              </div>
              <p className="gx-phone-note" aria-live="polite">Verified number signs you in or creates your GetXpress account.</p>
            </form>
          ) : (
            <form onSubmit={continueWithPhone} className="gx-phone-form">
              <label htmlFor="gx-hero-phone">Start with your mobile number</label>
              <div className={`gx-phone-control ${phoneError ? "has-error" : ""}`}>
                <span className="gx-phone-prefix">+91</span>
                <input id="gx-hero-phone" type="tel" inputMode="numeric" autoComplete="tel-national" maxLength={10} value={phone} onChange={(event) => { setPhone(event.target.value.replace(/\D/g, "").slice(0, 10)); setPhoneError(""); }} placeholder="Enter 10-digit number" aria-describedby="gx-phone-help" aria-invalid={Boolean(phoneError)} />
                <button type="submit" disabled={otpBusy}>{otpBusy ? "Sending…" : <>Get started <ChevronRight className="h-4 w-4" /></>}</button>
              </div>
              <p id="gx-phone-help" aria-live="polite" className={phoneError ? "gx-phone-error" : "gx-phone-note"}>{phoneError || "We’ll send a one-time code to verify your number."}</p>
            </form>
          )}

          <div className="gx-hero-secondary">
            <span><Check className="h-4 w-4" />Doorstep pickup</span>
            <span><Check className="h-4 w-4" />Clear delivery choices</span>
            <span><Check className="h-4 w-4" />Scan-by-scan updates</span>
          </div>

          <div className="gx-hero-bottom">
            <Link to="/track" className="gx-track-link"><Smartphone className="h-4 w-4" />Already sent a parcel? Track it <ArrowRight className="h-3.5 w-3.5" /></Link>
            <div className="gx-carousel-controls" aria-label="Choose a featured service">
              <div className="gx-slide-tabs" role="tablist" aria-label="Featured delivery services">
                {SLIDES.map((item, index) => {
                  const Icon = item.icon;
                  return <button type="button" role="tab" aria-selected={active === index} aria-label={`Show ${item.eyebrow}`} key={item.eyebrow} onClick={() => setActive(index)}><Icon className="h-4 w-4" /><span>{`0${index + 1}`}</span></button>;
                })}
              </div>
              <div className="gx-slide-arrows">
                <button type="button" aria-label="Previous slide" onClick={() => move(-1)}><ArrowLeft className="h-4 w-4" /></button>
                <button type="button" aria-label="Next slide" onClick={() => move(1)}><ArrowRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        </div>

        <div className="gx-hero-art-stage" aria-live="polite">
          <div className="gx-art-orbit gx-art-orbit-one" aria-hidden="true" />
          <div className="gx-art-orbit gx-art-orbit-two" aria-hidden="true" />
          <img ref={imageRef} key={slide.image} src={slide.image} alt={slide.imageAlt} fetchPriority={active === 0 ? "high" : "auto"} decoding="async" />
          <div className="gx-photo-caption gx-photo-glass"><span className="gx-photo-icon"><SlideIcon className="h-4 w-4" /></span><span>{slide.imageLabel}</span><b>0{active + 1}<i> / 0{SLIDES.length}</i></b></div>
        </div>
      </div>
      <div className="gx-hero-progress" aria-hidden="true"><span key={active} className={paused ? "is-paused" : ""} /></div>
    </section>
  );
}
