import { describe, expect, it } from "vitest";
import { searchConstellations } from "@/lib/constellation";

describe("searchConstellations", () => {
  it("returns nothing for an empty query", () => {
    expect(searchConstellations("")).toEqual([]);
    expect(searchConstellations("  ")).toEqual([]);
  });

  it("finds a constellation by name", () => {
    const r = searchConstellations("orion");
    expect(r[0].slug).toBe("orion");
  });

  it("finds a constellation by abbreviation", () => {
    const r = searchConstellations("UMa");
    expect(r[0].name).toBe("Ursa Major");
  });

  it("matches the Latin genitive", () => {
    const r = searchConstellations("orionis");
    expect(r.map((c) => c.name)).toContain("Orion");
  });

  it("ranks prefix matches ahead of substring matches", () => {
    // "ar" prefixes Aries/Ara; appears mid-word in others.
    const r = searchConstellations("ar");
    expect(["Aries", "Ara"]).toContain(r[0].name);
  });

  it("respects the limit", () => {
    expect(searchConstellations("a", 3)).toHaveLength(3);
  });
});
