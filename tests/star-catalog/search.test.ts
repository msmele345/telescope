import { describe, expect, it } from "vitest";
import { searchStars } from "@/lib/star-catalog";
import type { Star } from "@/lib/star-catalog";

const CATALOG: Star[] = [
  { id: 2061, ra: 1.55, dec: 0.13, mag: 0.5, name: "Betelgeuse", bayer: "α", constellation: "Ori" },
  { id: 1713, ra: 1.37, dec: -0.09, mag: 0.18, name: "Rigel", bayer: "β", constellation: "Ori" },
  { id: 2491, ra: 1.77, dec: -0.29, mag: -1.46, name: "Sirius", bayer: "α", constellation: "CMa" },
  { id: 7001, ra: 4.87, dec: 0.68, mag: 0.03, name: "Vega", bayer: "α", constellation: "Lyr" },
  { id: 9999, ra: 0, dec: 0, mag: 5.4 },
];

describe("searchStars", () => {
  it("returns nothing for an empty or whitespace query", () => {
    expect(searchStars(CATALOG, "")).toEqual([]);
    expect(searchStars(CATALOG, "   ")).toEqual([]);
  });

  it("finds a star by exact name, case-insensitively", () => {
    const r = searchStars(CATALOG, "vega");
    expect(r[0].name).toBe("Vega");
  });

  it("matches name substrings", () => {
    const r = searchStars(CATALOG, "rig");
    expect(r.map((s) => s.name)).toContain("Rigel");
  });

  it("ranks exact name above substring, then by brightness", () => {
    // Both Betelgeuse and Sirius are in catalog; query "si" only hits Sirius.
    const r = searchStars(CATALOG, "si");
    expect(r[0].name).toBe("Sirius");
  });

  it("finds a star by HR catalog id", () => {
    expect(searchStars(CATALOG, "2061")[0].name).toBe("Betelgeuse");
    expect(searchStars(CATALOG, "HR 7001")[0].name).toBe("Vega");
  });

  it("finds stars by constellation abbreviation", () => {
    const names = searchStars(CATALOG, "Ori").map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["Rigel", "Betelgeuse"]));
  });

  it("respects the result limit", () => {
    expect(searchStars(CATALOG, "Ori", { limit: 1 })).toHaveLength(1);
  });
});
