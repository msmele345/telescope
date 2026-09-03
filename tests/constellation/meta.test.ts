import { describe, expect, it } from "vitest";
import {
  CONSTELLATIONS,
  getConstellationByAbbr,
  getConstellationBySlug,
  isKnownAbbr,
} from "@/lib/constellation";

describe("constellation/meta", () => {
  it("contains all 88 IAU constellations", () => {
    expect(CONSTELLATIONS).toHaveLength(88);
  });

  it("has unique abbreviations", () => {
    const abbrs = new Set(CONSTELLATIONS.map((c) => c.abbr));
    expect(abbrs.size).toBe(88);
  });

  it("has unique URL slugs", () => {
    const slugs = new Set(CONSTELLATIONS.map((c) => c.slug));
    expect(slugs.size).toBe(88);
  });

  it("produces lowercase, hyphenated, diacritic-free slugs", () => {
    for (const c of CONSTELLATIONS) {
      expect(c.slug).toBe(c.slug.toLowerCase());
      expect(c.slug).toMatch(/^[a-z][a-z-]*$/);
    }
  });

  it("strips diacritics from names", () => {
    const boo = getConstellationByAbbr("Boo");
    expect(boo?.name).toBe("Boötes");
    expect(boo?.slug).toBe("bootes");
  });

  it("resolves Orion, Ursa Major, and zodiac signs", () => {
    expect(getConstellationByAbbr("Ori")?.name).toBe("Orion");
    expect(getConstellationByAbbr("UMa")?.name).toBe("Ursa Major");
    expect(getConstellationByAbbr("Sgr")?.name).toBe("Sagittarius");
    expect(getConstellationByAbbr("Sgr")?.slug).toBe("sagittarius");
  });

  it("getConstellationBySlug round-trips", () => {
    for (const c of CONSTELLATIONS) {
      expect(getConstellationBySlug(c.slug)).toEqual(c);
    }
  });

  it("returns null for unknown abbreviations and slugs", () => {
    expect(getConstellationByAbbr("Zzz")).toBeNull();
    expect(getConstellationByAbbr("")).toBeNull();
    expect(getConstellationByAbbr(null)).toBeNull();
    expect(getConstellationBySlug("not-a-real-thing")).toBeNull();
    expect(isKnownAbbr("Zzz")).toBe(false);
    expect(isKnownAbbr("Ori")).toBe(true);
  });

  it("includes the four-letter abbreviations CrA/CrB/CMa/CMi/CVn/LMi/PsA/TrA/UMa/UMi", () => {
    const expected = [
      "CrA",
      "CrB",
      "CMa",
      "CMi",
      "CVn",
      "LMi",
      "PsA",
      "TrA",
      "UMa",
      "UMi",
    ];
    for (const abbr of expected) {
      expect(getConstellationByAbbr(abbr)?.abbr).toBe(abbr);
    }
  });
});
