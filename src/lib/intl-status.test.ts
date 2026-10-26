import { describe, expect, it } from "vitest";
import { isQuoteRef, quoteStepIndex } from "./intl-status";
import { withDial } from "./countries";

describe("international quote tracking", () => {
  it("treats GXI references as quotes and GX+digits as AWBs", () => {
    expect(isQuoteRef("GXI9F3A21BC")).toBe(true);
    expect(isQuoteRef("GXQ-ABC123")).toBe(true);
    expect(isQuoteRef("GX26100000012")).toBe(false);
  });
  it("moves the timeline forward after the booking form and delivery", () => {
    expect(quoteStepIndex("pending")).toBe(0);
    expect(quoteStepIndex("booking_requested")).toBe(2);
    expect(quoteStepIndex("customs")).toBe(4);
    expect(quoteStepIndex("delivered")).toBe(5);
  });
});

describe("phone country code", () => {
  it("adds the picked country's code and swaps it when the country changes", () => {
    expect(withDial("", "+44")).toBe("+44");
    expect(withDial("+44 7700900123", "+1", "+44")).toBe("+1 7700900123");
    expect(withDial("07700900123", "+44")).toBe("+447700900123");
  });
});
