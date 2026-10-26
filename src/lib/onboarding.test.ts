import { describe, expect, it } from "vitest";
import { validateOnboarding } from "./onboarding";

const ok = { full_name: "Priya Sharma", gender: "female", age: 24, address: "12 MG Road, Jaipur", pincode: "302001" };
describe("profile onboarding", () => {
  it("accepts a complete profile", () => expect(validateOnboarding(ok)).toBeNull());
  it("rejects age under 13", () => expect(validateOnboarding({ ...ok, age: 12 })).toMatch(/Age/));
  it("rejects missing gender", () => expect(validateOnboarding({ ...ok, gender: "" })).toMatch(/gender/));
  it("rejects a 5-digit pincode", () => expect(validateOnboarding({ ...ok, pincode: "30200" })).toMatch(/pincode/));
});
