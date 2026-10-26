import { ParcelLottie } from "./ParcelLottie";
import { motion, useReducedMotion } from "framer-motion";
import envelope from "@/assets/parcel-flyer.webp";
import docPack from "@/assets/parcel-small.webp";
import pkg from "@/assets/parcel-large.webp";
import doc from "@/assets/parcel-a4.webp";
import hub from "@/assets/sorting-hub.jpg";
import rider from "@/assets/pickup-upgraded.jpg";
import doorstep from "@/assets/doorstep.jpg";

const SIZES = [
  { img: envelope, name: "Envelope", dims: "35 × 25 × 2 cm", kg: "up to 0.5 kg" },
  { img: doc, name: "Documents", dims: "33 × 25 × 5 cm", kg: "up to 1 kg" },
  { img: docPack, name: "Small box", dims: "30 × 20 × 15 cm", kg: "up to 3 kg" },
  { img: pkg, name: "Large box", dims: "50 × 40 × 30 cm", kg: "up to 15 kg" },
];
const STEPS = [
  { img: rider, title: "We pick it up", copy: "Pickup is arranged after your booking is accepted." },
  { img: hub, title: "Sorted & scanned", copy: "Every parcel is barcoded, bagged and sealed at the hub." },
  { img: doorstep, title: "Delivered", copy: "Follow recorded handovers until it reaches their door." },
];

/** Parcel size guide and journey section with scroll-triggered GSAP reveals. */
export function LandingExtras() {
  const reduceMotion = useReducedMotion();
  return (
    <div>
      <section className="gx-size-guide mx-auto max-w-6xl px-5 py-16">
        <motion.p className="text-center text-xs font-bold uppercase text-primary" initial={reduceMotion ? false : { opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>Parcel size guide</motion.p>
        <motion.h2 className="reveal mt-2 text-center text-3xl font-extrabold md:text-4xl" initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .08 }}>Small envelope. Big delivery.</motion.h2>
        <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          {SIZES.map((s) => (
            <motion.div key={s.name} className="gx-size-card reveal rounded-lg border bg-card p-5 text-center transition-shadow hover:shadow-soft" whileHover={reduceMotion ? undefined : { y: -8, rotate: -1, scale: 1.02 }} transition={{ type: "spring", stiffness: 260, damping: 20 }}>
              <img data-float src={s.img} alt={`${s.name} parcel`} loading="lazy" width={160} height={160} className="mx-auto h-28 w-28 object-contain" />
              <p className="mt-4 font-bold">{s.name}</p><p className="text-sm text-muted-foreground">{s.dims}</p><p className="text-xs font-semibold text-primary">{s.kg}</p>
            </motion.div>
          ))}
        </div>
      </section>
      <section className="gx-journey-section bg-ink px-5 py-16 text-ink-foreground">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between"><p className="text-xs font-bold uppercase text-primary">From door to door</p><ParcelLottie className="h-16 w-16"/></div>
          <h2 className="reveal mt-3 text-3xl font-extrabold md:text-4xl">How your parcel travels</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} className="gx-journey-step reveal overflow-hidden rounded-lg bg-ink-foreground/5" whileHover={reduceMotion ? undefined : { y: -7 }} transition={{ type: "spring", stiffness: 240, damping: 22 }}>
                <div className="overflow-hidden"><img src={s.img} alt={s.title} loading="lazy" decoding="async" width={640} height={420} className="parallax-img aspect-[3/2] w-full object-cover" /></div>
                <div className="p-5"><p className="text-xs font-bold text-primary">STEP {i + 1}</p><p className="mt-1 text-xl font-bold">{s.title}</p><p className="mt-2 text-sm text-ink-foreground/70">{s.copy}</p></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
