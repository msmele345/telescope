import { describe, expect, it } from "vitest";
// Build-time distance-resolution helpers. Imported from the data-pipeline
// script directly — they are pure and framework-agnostic.
import {
  CURATED_DISTANCES,
  PARSEC_TO_LY,
  bscParallaxToLy,
  hipparcosToLy,
  resolveDistanceLy,
} from "@/scripts/lib/star-distance.mjs";

describe("bscParallaxToLy", () => {
  it("converts a positive arcsecond parallax to light-years", () => {
    // 0.1" → 10 pc → 32.6 ly
    expect(bscParallaxToLy("+.1")).toBeCloseTo(10 * PARSEC_TO_LY, 3);
  });

  it("treats zero, negative, and missing parallax as unknown", () => {
    expect(bscParallaxToLy("-.001")).toBeNull();
    expect(bscParallaxToLy("0")).toBeNull();
    expect(bscParallaxToLy(null)).toBeNull();
    expect(bscParallaxToLy("")).toBeNull();
  });
});

describe("hipparcosToLy", () => {
  it("converts a milliarcsecond parallax to light-years", () => {
    // 100 mas = 0.1" → 10 pc → 32.6 ly
    expect(hipparcosToLy(100)).toBeCloseTo(10 * PARSEC_TO_LY, 3);
  });

  it("rejects non-positive and non-finite parallax", () => {
    expect(hipparcosToLy(0)).toBeNull();
    expect(hipparcosToLy(-3.2)).toBeNull();
    expect(hipparcosToLy(NaN)).toBeNull();
  });
});

describe("resolveDistanceLy fallback chain", () => {
  it("prefers a curated override over any parallax source", () => {
    // HR 2061 is Betelgeuse — curated because its parallax is unreliable.
    const result = resolveDistanceLy({
      hr: 2061,
      hipPlx: 7.63, // would yield ~427 ly
      bscParallax: "+.005",
    });
    expect(result).toEqual({
      distLy: CURATED_DISTANCES[2061].ly,
      source: "curated",
    });
  });

  it("uses Hipparcos when no curated value exists", () => {
    const result = resolveDistanceLy({
      hr: 9999,
      hipPlx: 379.21, // Proxima-like — ~8.6 ly
      bscParallax: "+.30",
    });
    expect(result?.source).toBe("hipparcos");
    expect(result?.distLy).toBeCloseTo(8.6, 1);
  });

  it("falls back to BSC parallax when Hipparcos is missing", () => {
    const result = resolveDistanceLy({
      hr: 9999,
      hipPlx: null,
      bscParallax: "+.1",
    });
    expect(result?.source).toBe("bsc");
    expect(result?.distLy).toBeCloseTo(10 * PARSEC_TO_LY, 1);
  });

  it("returns null when no source yields a usable parallax", () => {
    expect(
      resolveDistanceLy({ hr: 9999, hipPlx: -1, bscParallax: "-.002" })
    ).toBeNull();
    expect(
      resolveDistanceLy({ hr: 9999, hipPlx: null, bscParallax: null })
    ).toBeNull();
  });

  it("rounds resolved distances to one decimal place", () => {
    const result = resolveDistanceLy({ hr: 9999, hipPlx: 7, bscParallax: null });
    expect(result?.distLy).toBe(Math.round(result!.distLy * 10) / 10);
  });
});
