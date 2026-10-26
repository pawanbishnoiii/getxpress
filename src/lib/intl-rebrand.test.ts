import { describe, it, expect } from "vitest";
import { rebrand } from "./intl-rates.functions";
describe("international service names", () => {
  it("shows GetXpress.in instead of ShipGlobal", () => {
    expect(rebrand("ShipGlobal Direct")).toBe("GetXpress.in Direct");
    expect(rebrand("Shipglobal Express")).toBe("GetXpress.in Express");
    expect(rebrand("ShipGlobal First Class")).toBe("GetXpress.in First Class");
    expect(rebrand("ShipGlobal Premium")).toBe("GetXpress.in Premium");
  });
});

import { parseServiceNames, renameService } from "./intl-rates.functions";
describe("admin service renames", () => {
  it("uses the admin name when set, else rebrands", () => {
    const m = parseServiceNames("FedEx=GetXpress Priority Air\nDHL = GetXpress Express");
    expect(renameService("fedex", m)).toBe("GetXpress Priority Air");
    expect(renameService("DHL", m)).toBe("GetXpress Express");
    expect(renameService("ShipGlobal Direct", m)).toBe("GetXpress.in Direct");
  });
});
