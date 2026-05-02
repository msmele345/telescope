import { describe, expect, it } from "vitest";
import {
  AUTHORED_SLUGS,
  authoredSlugs,
  hasLesson,
} from "@/lib/constellation/lessons";
import { getConstellationBySlug } from "@/lib/constellation";

describe("constellation/lessons", () => {
  it("authors the starter set: 12 zodiac + Orion + Ursa Major + Ursa Minor", () => {
    const expected = new Set([
      "aquarius",
      "aries",
      "cancer",
      "capricornus",
      "gemini",
      "leo",
      "libra",
      "orion",
      "pisces",
      "sagittarius",
      "scorpius",
      "taurus",
      "ursa-major",
      "ursa-minor",
      "virgo",
    ]);
    expect(new Set(AUTHORED_SLUGS)).toEqual(expected);
    expect(AUTHORED_SLUGS).toHaveLength(15);
  });

  it("hasLesson returns true for authored slugs", () => {
    for (const slug of AUTHORED_SLUGS) {
      expect(hasLesson(slug)).toBe(true);
    }
  });

  it("hasLesson returns false for un-authored slugs", () => {
    expect(hasLesson("andromeda")).toBe(false);
    expect(hasLesson("cassiopeia")).toBe(false);
    expect(hasLesson("not-a-real-thing")).toBe(false);
    expect(hasLesson("")).toBe(false);
  });

  it("authoredSlugs returns a defensive copy", () => {
    const a = authoredSlugs();
    const b = authoredSlugs();
    expect(a).toEqual(b);
    a.push("bogus");
    expect(authoredSlugs()).not.toContain("bogus");
  });

  it("every authored slug resolves to a valid IAU constellation", () => {
    for (const slug of AUTHORED_SLUGS) {
      const c = getConstellationBySlug(slug);
      expect(c, `expected ${slug} to be a known constellation slug`).not.toBeNull();
    }
  });
});
