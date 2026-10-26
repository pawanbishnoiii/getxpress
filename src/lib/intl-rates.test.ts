import { describe, it, expect } from "vitest";
import { basePrice, chargeableKg, withMarkup, zoneFor } from "./intl-rates";
import card from "@/data/intl-rates.json";

const uk = (card as any)["United Kingdom"].rates._;
describe("international pickup rates", () => {
  it("UK 5 kg uses the 5 kg per-kg rate", () => expect(basePrice(uk, 5)).toBe(Math.round(850.78 * 5)));
  it("weight below first slab is charged at the first slab", () => expect(chargeableKg(1.2, uk)).toBe(5));
  it("admin markup is added on top of the base price", () => expect(withMarkup(1000, 10, 50)).toBe(1150));
  it("Canada postal code maps to its FSA zone", () => expect(zoneFor((card as any).Canada, "L0A 1A1")).toBe("Zone 1"));
  it("US state code maps to zone", () => expect(zoneFor((card as any)["United States"], "CA")).toBe("Zone 1"));
});

import { withMarkup as wm } from "./intl-rates";
describe("admin price adjustment", () => {
  it("supports plus and minus percent", () => {
    expect(wm(1000, 10, 0)).toBe(1100);
    expect(wm(1000, -10, 0)).toBe(900);
    expect(wm(1000, -10, 50)).toBe(950);
  });
});

import { toSignedPercent, fromSignedPercent } from "./intl-rates";
describe("one adjustment at a time (+% margin or −% discount)", () => {
  it("margin 15% raises a ₹2,000 live price to ₹2,300", () => expect(wm(2000, toSignedPercent("markup", 15), 0)).toBe(2300));
  it("discount 10% lowers a ₹2,000 live price to ₹1,800", () => expect(wm(2000, toSignedPercent("discount", 10), 0)).toBe(1800));
  it("discount ignores a typed minus sign and stays a discount", () => expect(toSignedPercent("discount", -10)).toBe(-10));
  it("discount is capped at 90%", () => expect(toSignedPercent("discount", 150)).toBe(-90));
  it("margin is capped at 200%", () => expect(toSignedPercent("markup", 500)).toBe(200));
  it("a saved negative value reads back as a discount", () => expect(fromSignedPercent(-12)).toEqual({ mode: "discount", value: 12 }));
});
