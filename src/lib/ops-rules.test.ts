import { describe, expect, it } from "vitest";
import { classifyException, scoreBooking } from "./ops-rules";

const base = { weight_kg: 1, pieces_count: 1, declared_value: 500, payment_method: "online", serviceable: true, same_city: false, receiver_phone: "9876543210", receiver_address: "12 MG Road, Jaipur, Rajasthan" };

describe("ops rules", () => {
  it("classifies a damaged parcel as high severity", () => {
    expect(classifyException("Box is broken and wet").category).toBe("Damaged parcel");
    expect(classifyException("Box is broken and wet").severity).toBe("high");
  });
  it("routes refusals to RTO", () => {
    expect(classifyException("Customer refused the parcel").action).toMatch(/RTO/);
  });
  it("scores a clean booking 100", () => {
    expect(scoreBooking(base).score).toBe(100);
  });
  it("unserviceable pincode is the top reason", () => {
    const r = scoreBooking({ ...base, serviceable: false, weight_kg: 25 });
    expect(r.score).toBe(45);
    expect(r.reason).toBe("Destination pincode not serviceable");
  });
});
