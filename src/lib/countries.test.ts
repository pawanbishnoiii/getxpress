import { describe, expect, it } from "vitest";
import { allCountries, flagOf, searchCountries } from "./countries";

describe("countries", () => {
  it("lists over 200 countries", () => expect(allCountries().length).toBeGreaterThan(200));
  it("finds India by ISO code", () => expect(searchCountries("IN")[0]?.name).toBe("India"));
  it("finds UK by dial code +44", () => expect(searchCountries("+44").some((c) => c.code === "GB")).toBe(true));
  it("builds flag emoji", () => expect(flagOf("in")).toBe("🇮🇳"));
});

import { searchCountries as sc } from "./countries";
describe("country search order", () => {
  it("typing India picks India first, not British Indian Ocean Territory", () => expect(sc("india")[0]?.name).toBe("India"));
  it("typing United picks a country starting with United first", () => expect(sc("united")[0]?.name.startsWith("United")).toBe(true));
});
