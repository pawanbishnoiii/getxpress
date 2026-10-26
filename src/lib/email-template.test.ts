import { describe, expect, it } from "vitest";
import { fillTemplate } from "./email.functions";

describe("email templates", () => {
  it("fills placeholders and blanks unknown ones", () => {
    expect(fillTemplate("Hi {{name}}, order {{tracking}} {{x}}", { name: "Asha", tracking: "GX1" })).toBe("Hi Asha, order GX1 ");
  });
});
