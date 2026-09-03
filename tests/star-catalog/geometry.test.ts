import { describe, expect, it } from "vitest";
import {
  buildHorizonStarFieldAttributes,
  buildStarFieldAttributes,
} from "@/lib/star-catalog/geometry";
import type { Star } from "@/lib/star-catalog/types";

const sirius: Star = {
  id: 2491,
  ra: 1.7677930939085398,
  dec: -0.29175117701809655,
  mag: -1.46,
  name: "Sirius",
};

const polaris: Star = {
  id: 424,
  ra: 0.6624033565683645,
  dec: 1.557953612382305,
  mag: 2.02,
  name: "Polaris",
};

const faint: Star = {
  id: 9999,
  ra: 0,
  dec: 0,
  mag: 7,
};

describe("buildStarFieldAttributes", () => {
  it("returns one position triplet, size, and brightness per star", () => {
    const stars = [sirius, polaris, faint];
    const attrs = buildStarFieldAttributes(stars, 50);
    expect(attrs.positions).toHaveLength(stars.length * 3);
    expect(attrs.sizes).toHaveLength(stars.length);
    expect(attrs.brightness).toHaveLength(stars.length);
  });

  it("places stars on a sphere of the given radius", () => {
    const r = 50;
    const attrs = buildStarFieldAttributes([sirius, polaris, faint], r);
    for (let i = 0; i < 3; i++) {
      const x = attrs.positions[i * 3];
      const y = attrs.positions[i * 3 + 1];
      const z = attrs.positions[i * 3 + 2];
      const len = Math.hypot(x, y, z);
      expect(len).toBeCloseTo(r, 4);
    }
  });

  it("places Polaris near +Y (celestial north pole)", () => {
    const attrs = buildStarFieldAttributes([polaris], 1);
    expect(attrs.positions[1]).toBeGreaterThan(0.99);
  });

  it("makes brighter stars larger than faint ones", () => {
    const attrs = buildStarFieldAttributes([sirius, faint], 1);
    expect(attrs.sizes[0]).toBeGreaterThan(attrs.sizes[1]);
  });

  it("makes brighter stars more luminous than faint ones", () => {
    const attrs = buildStarFieldAttributes([sirius, faint], 1);
    expect(attrs.brightness[0]).toBeGreaterThan(attrs.brightness[1]);
  });

  it("handles an empty catalog", () => {
    const attrs = buildStarFieldAttributes([], 50);
    expect(attrs.positions).toHaveLength(0);
    expect(attrs.sizes).toHaveLength(0);
    expect(attrs.brightness).toHaveLength(0);
  });
});

describe("buildHorizonStarFieldAttributes", () => {
  const observer = { lat: 44.98, lng: -93.27 }; // Minneapolis
  const when = new Date("2026-01-01T06:00:00Z");

  it("places each star on a sphere of the given radius", () => {
    const r = 50;
    const attrs = buildHorizonStarFieldAttributes([sirius, polaris, faint], observer, when, r);
    for (let i = 0; i < 3; i++) {
      const x = attrs.positions[i * 3];
      const y = attrs.positions[i * 3 + 1];
      const z = attrs.positions[i * 3 + 2];
      expect(Math.hypot(x, y, z)).toBeCloseTo(r, 4);
    }
  });

  it("places Polaris near altitude=observer latitude (y/r ≈ sin lat)", () => {
    const r = 50;
    const attrs = buildHorizonStarFieldAttributes([polaris], observer, when, r);
    const y = attrs.positions[1];
    const expected = r * Math.sin((observer.lat * Math.PI) / 180);
    // Polaris sits ~0.74° off the pole, so allow ~1% radial slop.
    expect(Math.abs(y - expected)).toBeLessThan(r * 0.02);
  });

  it("places Polaris near due north (x ≈ 0, z < 0)", () => {
    const r = 50;
    const attrs = buildHorizonStarFieldAttributes([polaris], observer, when, r);
    const x = attrs.positions[0];
    const z = attrs.positions[2];
    expect(Math.abs(x)).toBeLessThan(r * 0.03);
    expect(z).toBeLessThan(0);
  });
});
