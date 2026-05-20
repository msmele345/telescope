import { describe, expect, it } from "vitest";
import { galacticToEquatorial } from "@/lib/sky-math";

const DEG = Math.PI / 180;
const RAD = 180 / Math.PI;

describe("galacticToEquatorial", () => {
  it("maps the galactic centre (l=0, b=0) to ~RA 266.4°, Dec −28.9°", () => {
    const { ra, dec } = galacticToEquatorial(0, 0);
    expect(ra * RAD).toBeCloseTo(266.405, 1);
    expect(dec * RAD).toBeCloseTo(-28.936, 1);
  });

  it("maps the North Galactic Pole (b=+90°) to ~RA 192.86°, Dec +27.13°", () => {
    const { ra, dec } = galacticToEquatorial(123 * DEG, 90 * DEG);
    expect(dec * RAD).toBeCloseTo(27.128, 1);
    expect(ra * RAD).toBeCloseTo(192.859, 1);
  });

  it("keeps RA within [0, 2π)", () => {
    for (let l = 0; l < 360; l += 30) {
      const { ra } = galacticToEquatorial(l * DEG, 0);
      expect(ra).toBeGreaterThanOrEqual(0);
      expect(ra).toBeLessThan(2 * Math.PI);
    }
  });
});
