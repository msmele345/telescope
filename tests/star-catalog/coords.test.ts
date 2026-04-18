import { describe, expect, it } from "vitest";
import { celestialToVec3 } from "@/lib/star-catalog/coords";

const EPS = 1e-9;

function close(a: number, b: number, eps = EPS) {
  return Math.abs(a - b) < eps;
}

describe("celestialToVec3", () => {
  it("places RA=0, Dec=0 on +X axis", () => {
    const v = celestialToVec3(0, 0);
    expect(close(v.x, 1)).toBe(true);
    expect(close(v.y, 0)).toBe(true);
    expect(close(v.z, 0)).toBe(true);
  });

  it("places celestial north pole on +Y axis", () => {
    const v = celestialToVec3(0, Math.PI / 2);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, 1)).toBe(true);
    expect(close(v.z, 0)).toBe(true);
  });

  it("places celestial south pole on -Y axis", () => {
    const v = celestialToVec3(1.234, -Math.PI / 2);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, -1)).toBe(true);
    expect(close(v.z, 0)).toBe(true);
  });

  it("places RA=π/2, Dec=0 on +Z axis", () => {
    const v = celestialToVec3(Math.PI / 2, 0);
    expect(close(v.x, 0)).toBe(true);
    expect(close(v.y, 0)).toBe(true);
    expect(close(v.z, 1)).toBe(true);
  });

  it("scales output by radius", () => {
    const v = celestialToVec3(0, 0, 50);
    expect(close(v.x, 50)).toBe(true);
  });

  it("returns unit vectors when radius=1 (any direction)", () => {
    const cases: Array<[number, number]> = [
      [0.1, 0.2],
      [-1.0, 1.2],
      [Math.PI, -0.5],
      [2 * Math.PI, 0],
    ];
    for (const [ra, dec] of cases) {
      const v = celestialToVec3(ra, dec);
      const len = Math.hypot(v.x, v.y, v.z);
      expect(close(len, 1, 1e-12)).toBe(true);
    }
  });
});
