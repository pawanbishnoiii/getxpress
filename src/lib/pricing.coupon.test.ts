import { describe, expect, it } from "vitest";
import { couponDiscount } from "./pricing";

describe("couponDiscount", () => {
  it("percent with cap", () => expect(couponDiscount(1000, { discount_type: "percent", discount_value: 20, max_discount: 100, min_order: 0 })).toBe(100));
  it("flat", () => expect(couponDiscount(300, { discount_type: "flat", discount_value: 50, max_discount: null, min_order: 0 })).toBe(50));
  it("below minimum gives 0", () => expect(couponDiscount(99, { discount_type: "flat", discount_value: 50, max_discount: null, min_order: 199 })).toBe(0));
  it("never exceeds total", () => expect(couponDiscount(40, { discount_type: "flat", discount_value: 50, max_discount: null, min_order: 0 })).toBe(40));
});
