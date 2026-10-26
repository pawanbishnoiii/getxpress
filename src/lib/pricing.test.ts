import { describe, it, expect } from "vitest";
import { billableWeight, quote, zoneOf } from "./pricing";

describe("pricing", () => {
  it("uses volumetric weight when larger", () => {
    expect(billableWeight(1, { l: 40, w: 30, h: 20 })).toBe(5); // 24000/5000=4.8 -> 5
  });
  it("detects zones by pincode", () => {
    expect(zoneOf("302010", "302021")).toBe("local");
    expect(zoneOf("302010", "342001")).toBe("regional");
    expect(zoneOf("302010", "560001")).toBe("national");
  });
  it("adds 18% GST", () => {
    const q = quote({ fromPin: "302010", toPin: "302021", weightKg: 0.5, service: "standard" });
    expect(q.freight).toBe(49);
    expect(q.total).toBe(57.82);
  });
});
