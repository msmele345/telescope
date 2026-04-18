import { describe, expect, it } from "vitest";
import {
  DEG,
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";

const EPS = 1e-9;

describe("equatorialToHorizontal", () => {
  it("puts the celestial pole at altitude=latitude", () => {
    // NCP: Dec = π/2, RA irrelevant. At any time, altitude ≈ latitude.
    const latRad = 45 * DEG;
    const { alt, az } = equatorialToHorizontal(
      0,
      Math.PI / 2,
      latRad,
      1.234 // arbitrary LST
    );
    expect(alt).toBeCloseTo(latRad, 9);
    // Azimuth undefined at the pole singularity; any value mod 2π that lands
    // at north is acceptable. Measure angular distance to 0.
    const northDist = Math.min(az, Math.PI * 2 - az);
    expect(northDist).toBeLessThan(1e-9);
  });

  it("transits a Dec=0 star on the meridian at altitude=90°-|lat|", () => {
    const latRad = 30 * DEG;
    const lst = 1.234;
    const { alt, az } = equatorialToHorizontal(lst, 0, latRad, lst);
    expect(alt).toBeCloseTo((90 - 30) * DEG, 6);
    // Transit at H=0 puts the star due south in the northern hemisphere.
    expect(az).toBeCloseTo(Math.PI, 6);
  });

  it("puts rising stars in the eastern half (0 < Az < π)", () => {
    // Equatorial star one hour before transit (H = -15° → east of meridian)
    const latRad = 40 * DEG;
    const lst = 0;
    const ra = 15 * DEG; // H = lst - ra = -15°
    const { az } = equatorialToHorizontal(ra, 0, latRad, lst);
    expect(az).toBeGreaterThan(Math.PI / 2);
    expect(az).toBeLessThan(Math.PI);
  });

  it("puts setting stars in the western half (π < Az < 2π)", () => {
    const latRad = 40 * DEG;
    const lst = 30 * DEG;
    const ra = 15 * DEG; // H = +15° → west of meridian
    const { az } = equatorialToHorizontal(ra, 0, latRad, lst);
    expect(az).toBeGreaterThan(Math.PI);
    expect(az).toBeLessThan((3 * Math.PI) / 2);
  });

  it("matches PRD fixture: Polaris altitude from Minneapolis on 2026-01-01 ≈ 45°", () => {
    // Minneapolis (55401) ≈ 44.98°N, -93.27°E.
    // Polaris: RA ≈ 2h 31m 49.09s = 2.5303h, Dec ≈ +89° 15′ 50.8″.
    const lat = 44.98 * DEG;
    const lng = -93.27 * DEG;
    const raPolaris = (2 + 31 / 60 + 49.09 / 3600) * 15 * DEG;
    const decPolaris = (89 + 15 / 60 + 50.8 / 3600) * DEG;
    const lst = localSiderealTime(new Date("2026-01-01T06:00:00Z"), lng);
    const { alt, az } = equatorialToHorizontal(raPolaris, decPolaris, lat, lst);
    // Polaris sits ~0.74° from the true pole, so altitude is within ~1° of latitude.
    expect(alt / DEG).toBeGreaterThan(44);
    expect(alt / DEG).toBeLessThan(46);
    // And always within ~1.5° of due north.
    const azDeg = (az / DEG) % 360;
    const northDist = Math.min(azDeg, 360 - azDeg);
    expect(northDist).toBeLessThan(2);
  });
});

describe("horizontalToVec3", () => {
  it("places the zenith on +Y", () => {
    const v = horizontalToVec3(Math.PI / 2, 1.234);
    expect(Math.abs(v.x)).toBeLessThan(EPS);
    expect(v.y).toBeCloseTo(1, 9);
    expect(Math.abs(v.z)).toBeLessThan(EPS);
  });

  it("places North (Az=0, Alt=0) on -Z", () => {
    const v = horizontalToVec3(0, 0);
    expect(Math.abs(v.x)).toBeLessThan(EPS);
    expect(Math.abs(v.y)).toBeLessThan(EPS);
    expect(v.z).toBeCloseTo(-1, 9);
  });

  it("places East (Az=π/2, Alt=0) on +X", () => {
    const v = horizontalToVec3(0, Math.PI / 2);
    expect(v.x).toBeCloseTo(1, 9);
    expect(Math.abs(v.y)).toBeLessThan(EPS);
    expect(Math.abs(v.z)).toBeLessThan(EPS);
  });

  it("places South (Az=π, Alt=0) on +Z", () => {
    const v = horizontalToVec3(0, Math.PI);
    expect(Math.abs(v.x)).toBeLessThan(EPS);
    expect(v.z).toBeCloseTo(1, 9);
  });

  it("places West (Az=3π/2, Alt=0) on -X", () => {
    const v = horizontalToVec3(0, (3 * Math.PI) / 2);
    expect(v.x).toBeCloseTo(-1, 9);
  });

  it("scales by radius", () => {
    const v = horizontalToVec3(Math.PI / 2, 0, 50);
    expect(v.y).toBeCloseTo(50, 9);
  });
});
