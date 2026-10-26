import { describe, expect, it } from "vitest";
import { INDIAN_STATES, isSyntheticEmail } from "./india-regions";

describe("onboarding regions", () => {
  it("hides phone-login placeholder emails", () => {
    expect(isSyntheticEmail("919876543210@phone.getxpress.in")).toBe(true);
    expect(isSyntheticEmail("p9000000000@phone.bnoy.app")).toBe(true);
    expect(isSyntheticEmail("priya@gmail.com")).toBe(false);
  });
  it("lists all 36 states and union territories", () => {
    expect(INDIAN_STATES.length).toBe(36);
  });
});
