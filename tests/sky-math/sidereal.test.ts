import { describe, expect, it } from "vitest";
import {
  DEG,
  greenwichMeanSiderealTime,
  localSiderealTime,
} from "@/lib/sky-math";

const RAD_TO_HOURS = 24 / (Math.PI * 2);

function toHours(rad: number): number {
  const h = rad * RAD_TO_HOURS;
  return ((h % 24) + 24) % 24;
}

describe("greenwichMeanSiderealTime", () => {
  // Meeus example 12.a: 1987 April 10, 0h UT → GMST ≈ 13h 10m 46.3668s
  it("matches Meeus example 12.a (1987-04-10 0h UT)", () => {
    const gmst = greenwichMeanSiderealTime(new Date("1987-04-10T00:00:00Z"));
    const hours = toHours(gmst);
    const expected = 13 + 10 / 60 + 46.3668 / 3600;
    expect(hours).toBeCloseTo(expected, 3);
  });

  it("increases by ~1.00274 sidereal days per solar day", () => {
    const a = greenwichMeanSiderealTime(new Date("2026-01-01T00:00:00Z"));
    const b = greenwichMeanSiderealTime(new Date("2026-01-02T00:00:00Z"));
    // 24h solar → 24h × (1 + 1/365.25) sidereal ≈ 24.06571h
    const deltaHours = ((toHours(b) - toHours(a) + 24) % 24);
    expect(deltaHours).toBeCloseTo(24 * (1 / 365.25), 2);
  });

  it("stays in [0, 2π)", () => {
    const vals = [
      "1900-01-01T00:00:00Z",
      "2000-01-01T12:00:00Z",
      "2026-06-15T18:30:00Z",
      "2099-12-31T23:59:59Z",
    ].map((s) => greenwichMeanSiderealTime(new Date(s)));
    for (const v of vals) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(Math.PI * 2);
    }
  });
});

describe("localSiderealTime", () => {
  it("equals GMST at Greenwich (longitude 0)", () => {
    const d = new Date("2026-03-20T12:00:00Z");
    expect(localSiderealTime(d, 0)).toBeCloseTo(greenwichMeanSiderealTime(d), 9);
  });

  it("subtracts ~6h for longitude -90° (US central)", () => {
    const d = new Date("2026-03-20T12:00:00Z");
    const gmst = greenwichMeanSiderealTime(d);
    const lst = localSiderealTime(d, -90 * DEG);
    const diff = ((toHours(gmst) - toHours(lst) + 24) % 24);
    expect(diff).toBeCloseTo(6, 3);
  });

  it("wraps into [0, 2π)", () => {
    const d = new Date("2026-01-01T00:00:00Z");
    const lst = localSiderealTime(d, -180 * DEG);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(Math.PI * 2);
  });
});
