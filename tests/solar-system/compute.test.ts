import { describe, expect, it } from "vitest";
import {
  computeSolarBodies,
  SOLAR_BODY_IDS,
  type SolarBody,
} from "@/lib/solar-system";
import { equatorialToHorizontal, localSiderealTime } from "@/lib/sky-math";

const MINNEAPOLIS = { lat: 44.9833, lng: -93.2706 };
const DEG = Math.PI / 180;

function altOf(body: SolarBody, observer: { lat: number; lng: number }, when: Date) {
  const lst = localSiderealTime(when, observer.lng * DEG);
  return equatorialToHorizontal(body.ra, body.dec, observer.lat * DEG, lst).alt;
}

describe("computeSolarBodies", () => {
  it("returns the Sun, Moon, and 8 planets in a stable order", () => {
    const bodies = computeSolarBodies(MINNEAPOLIS, new Date("2026-06-21T12:00:00Z"));
    expect(bodies).toHaveLength(9);
    expect(bodies.map((b) => b.id)).toEqual([
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ]);
  });

  it("classifies bodies by kind", () => {
    const bodies = computeSolarBodies(MINNEAPOLIS, new Date("2026-06-21T12:00:00Z"));
    const sun = bodies.find((b) => b.id === "sun")!;
    const moon = bodies.find((b) => b.id === "moon")!;
    const mars = bodies.find((b) => b.id === "mars")!;
    expect(sun.kind).toBe("sun");
    expect(moon.kind).toBe("moon");
    expect(mars.kind).toBe("planet");
  });

  it("RA is in [0, 2π) and Dec in [-π/2, π/2]", () => {
    const bodies = computeSolarBodies(MINNEAPOLIS, new Date("2026-03-20T12:00:00Z"));
    for (const b of bodies) {
      // computeSolarBodies emits RA in radians from astronomy-engine's
      // 0..24h hour-angle, so it's already in [0, 2π).
      expect(b.ra).toBeGreaterThanOrEqual(0);
      expect(b.ra).toBeLessThan(2 * Math.PI + 1e-9);
      expect(b.dec).toBeGreaterThanOrEqual(-Math.PI / 2);
      expect(b.dec).toBeLessThanOrEqual(Math.PI / 2);
      expect(Number.isFinite(b.mag)).toBe(true);
      expect(b.distAU).toBeGreaterThan(0);
    }
  });

  it("the Sun is high in the sky at local noon in summer (Minneapolis)", () => {
    // 2026-06-21 17:00 UTC ≈ 12:00 local CDT in Minneapolis on the
    // summer solstice. The Sun should be near its peak altitude (~68°
    // for Minneapolis at lat 45°N).
    const bodies = computeSolarBodies(
      MINNEAPOLIS,
      new Date("2026-06-21T17:00:00Z")
    );
    const sun = bodies.find((b) => b.id === "sun")!;
    const altDeg = altOf(sun, MINNEAPOLIS, new Date("2026-06-21T17:00:00Z")) / DEG;
    expect(altDeg).toBeGreaterThan(60);
    expect(altDeg).toBeLessThan(72);
  });

  it("the Sun is below the horizon at local midnight in winter", () => {
    // 2026-12-21 06:00 UTC ≈ midnight local CST in Minneapolis on the
    // winter solstice. Sun should be well below horizon.
    const when = new Date("2026-12-21T06:00:00Z");
    const bodies = computeSolarBodies(MINNEAPOLIS, when);
    const sun = bodies.find((b) => b.id === "sun")!;
    const altDeg = altOf(sun, MINNEAPOLIS, when) / DEG;
    expect(altDeg).toBeLessThan(-50);
  });

  it("body positions evolve over time (Moon moves several degrees/hour)", () => {
    const t0 = new Date("2026-01-01T00:00:00Z");
    const t1 = new Date("2026-01-01T06:00:00Z");
    const a = computeSolarBodies(MINNEAPOLIS, t0).find((b) => b.id === "moon")!;
    const b = computeSolarBodies(MINNEAPOLIS, t1).find((bb) => bb.id === "moon")!;
    // Moon moves ~13°/day in RA, so 6h ≈ 3°. Just confirm RA/Dec changed
    // detectably, not by zero.
    expect(Math.abs(a.ra - b.ra) + Math.abs(a.dec - b.dec)).toBeGreaterThan(0.01);
  });

  it("magnitude for the Sun is around -27", () => {
    const bodies = computeSolarBodies(MINNEAPOLIS, new Date("2026-06-21T12:00:00Z"));
    const sun = bodies.find((b) => b.id === "sun")!;
    expect(sun.mag).toBeLessThan(-26);
    expect(sun.mag).toBeGreaterThan(-27.5);
  });

  it("SOLAR_BODY_IDS exposes the same id list", () => {
    expect(SOLAR_BODY_IDS).toEqual([
      "sun",
      "moon",
      "mercury",
      "venus",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
    ]);
  });
});
