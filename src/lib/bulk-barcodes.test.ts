import { describe, expect, it } from "vitest";
import { isValidCode, makeCodes } from "./bulk-barcodes";

describe("bulk barcodes", () => {
  it("generates exactly the requested quantity, all unique", () => {
    const c = makeCodes("seal", 100);
    expect(c).toHaveLength(100);
    expect(new Set(c).size).toBe(100);
  });
  it("uses the right prefix per item type", () => {
    const d = new Date(2026, 9, 1);
    expect(makeCodes("bag", 1, "", d)[0]).toMatch(/^BAG-2610-/);
    expect(makeCodes("envelope", 1, "JPR01", d)[0]).toMatch(/^ENV-2610-JPR01-/);
  });
  it("rejects a mistyped code via the check letter", () => {
    const code = makeCodes("seal", 1)[0]!;
    expect(isValidCode(code)).toBe(true);
    const last = code.slice(-1);
    expect(isValidCode(code.slice(0, -1) + (last === "A" ? "B" : "A"))).toBe(false);
  });
});
