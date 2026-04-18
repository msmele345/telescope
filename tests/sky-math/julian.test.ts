import { describe, expect, it } from "vitest";
import { J2000_JD, julianCenturiesSinceJ2000, toJulianDate } from "@/lib/sky-math";

describe("toJulianDate", () => {
  it("returns J2000.0 JD for 2000-01-01T12:00:00Z", () => {
    const jd = toJulianDate(new Date("2000-01-01T12:00:00Z"));
    expect(jd).toBeCloseTo(J2000_JD, 6);
  });

  it("returns MJD-anchored JD for the Unix epoch", () => {
    const jd = toJulianDate(new Date("1970-01-01T00:00:00Z"));
    expect(jd).toBeCloseTo(2440587.5, 6);
  });

  it("advances by 1 per calendar day", () => {
    const a = toJulianDate(new Date("2026-01-01T00:00:00Z"));
    const b = toJulianDate(new Date("2026-01-02T00:00:00Z"));
    expect(b - a).toBeCloseTo(1, 9);
  });
});

describe("julianCenturiesSinceJ2000", () => {
  it("returns 0 at J2000.0", () => {
    expect(julianCenturiesSinceJ2000(new Date("2000-01-01T12:00:00Z"))).toBeCloseTo(0, 9);
  });

  it("returns ~0.26 for 2026-01-01", () => {
    const t = julianCenturiesSinceJ2000(new Date("2026-01-01T12:00:00Z"));
    expect(t).toBeGreaterThan(0.25);
    expect(t).toBeLessThan(0.27);
  });
});
