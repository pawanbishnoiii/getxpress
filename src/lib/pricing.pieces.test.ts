import { describe, expect, it } from "vitest";
import { piecesBillable, quote } from "./pricing";

describe("per-parcel billable weight", () => {
  it("bills each parcel on the higher of actual or volumetric weight", () => {
    // 2 kg actual vs 33.7x32.2x18/5000 = 3.9 kg volumetric -> 3.9; plus 1 kg parcel -> 4.9 -> 5
    expect(piecesBillable([{ weight_kg: 2, dims: { l: 33.7, w: 32.2, h: 18 } }, { weight_kg: 1 }])).toBe(5);
  });
  it("uses pieces when given to price the shipment", () => {
    const q = quote({ fromPin: "302001", toPin: "302005", weightKg: 0, service: "standard", pieces: [{ weight_kg: 1 }, { weight_kg: 1 }] });
    expect(q.weight).toBe(2);
    expect(q.freight).toBe(94); // 49 + 30*1.5, local zone
  });
});
