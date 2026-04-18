import { describe, expect, it } from "vitest";
import { magnitudeToBrightness, magnitudeToSize } from "@/lib/star-catalog/magnitude";

describe("magnitudeToSize", () => {
  it("clamps very bright stars to maxSize", () => {
    expect(magnitudeToSize(-5)).toBe(14.0);
    expect(magnitudeToSize(-1.5)).toBe(14.0);
  });

  it("clamps very faint stars to minSize", () => {
    expect(magnitudeToSize(7)).toBe(1.5);
    expect(magnitudeToSize(6.5)).toBe(1.5);
  });

  it("interpolates linearly between minMag and maxMag", () => {
    // (2.5 - (-1.5)) / (6.5 - (-1.5)) = 0.5; 14 - 0.5 * (14 - 1.5) = 7.75
    const mid = magnitudeToSize(2.5);
    expect(mid).toBeCloseTo(7.75, 2);
  });

  it("respects custom min/max overrides", () => {
    expect(magnitudeToSize(0, { minMag: 0, maxMag: 6, minSize: 1, maxSize: 10 })).toBe(10);
    expect(magnitudeToSize(6, { minMag: 0, maxMag: 6, minSize: 1, maxSize: 10 })).toBe(1);
    expect(magnitudeToSize(3, { minMag: 0, maxMag: 6, minSize: 1, maxSize: 10 })).toBeCloseTo(5.5);
  });

  it("monotonically decreases as magnitude increases", () => {
    let prev = magnitudeToSize(-2);
    for (let m = -2; m <= 7; m += 0.25) {
      const cur = magnitudeToSize(m);
      expect(cur).toBeLessThanOrEqual(prev + 1e-9);
      prev = cur;
    }
  });
});

describe("magnitudeToBrightness", () => {
  it("returns 1 at the reference magnitude", () => {
    expect(magnitudeToBrightness(-1.5)).toBe(1);
  });

  it("clamps brighter-than-reference stars to 1", () => {
    expect(magnitudeToBrightness(-5)).toBe(1);
  });

  it("returns >0 for any finite magnitude", () => {
    expect(magnitudeToBrightness(7)).toBeGreaterThan(0);
    expect(magnitudeToBrightness(15)).toBeGreaterThan(0);
  });

  it("follows Pogson scaling (5 mag dimmer = factor of 100 less brightness)", () => {
    // Use unclamped range: ref=0 → brightness(2.5)=0.1, brightness(7.5)=0.001
    const a = magnitudeToBrightness(2.5, 0);
    const b = magnitudeToBrightness(7.5, 0);
    expect(a / b).toBeCloseTo(100, 4);
  });

  it("monotonically decreases as magnitude increases", () => {
    let prev = magnitudeToBrightness(-2);
    for (let m = -2; m <= 7; m += 0.25) {
      const cur = magnitudeToBrightness(m);
      expect(cur).toBeLessThanOrEqual(prev + 1e-9);
      prev = cur;
    }
  });
});
