import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ConstellationLines } from "@/lib/constellation";
import type { ObserverLocation } from "@/lib/observer";
import { equatorialToHorizontal, localSiderealTime } from "@/lib/sky-math";
import { computeSunPosition } from "@/lib/solar-system";
import type { Star } from "@/lib/star-catalog";
import {
  findTourTime,
  stopDirection,
  type MonthDay,
  type Tour,
  type TourCatalogs,
  type TourStop,
} from "@/lib/tours";

const DEG = Math.PI / 180;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function readJson<T>(file: string): T {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "data", file), "utf8")
  ) as T;
}

const REAL: TourCatalogs = {
  stars: readJson<Star[]>("bsc5.json"),
  lines: readJson<ConstellationLines>("constellation-lines.json"),
};

const KANSAS: ObserverLocation = { lat: 40, lng: -98.6 };
const NORTH: ObserverLocation = { lat: 49, lng: -98.6 };

// Inline stars where the test needs exact control over where a stop sits.
const NEAR_POLE: Star = { id: 1, ra: 0, dec: 89 * DEG, mag: 2 }; // ~40° up all night from 40°N
const DEEP_SOUTH: Star = { id: 2, ra: 0, dec: -80 * DEG, mag: 2 }; // never rises from 40°N

const ALL_YEAR = { from: md(1, 1), to: md(12, 31) };

function md(month: number, day: number): MonthDay {
  return { month, day };
}

function star(id: number): TourStop {
  return { kind: "star", id, heading: "h", body: "b" };
}

function tour(stops: TourStop[], window = ALL_YEAR): Tour {
  return { slug: "test", title: "Test", summary: "s", window, stops };
}

function inline(...stars: Star[]): TourCatalogs {
  return { stars, lines: {} };
}

const ORION_STOPS: TourStop[] = [
  { kind: "constellation", id: "Ori", heading: "h", body: "b" },
  star(2061), // Betelgeuse
  star(1713), // Rigel
  { kind: "messier", id: "M42", heading: "h", body: "b" },
];

function altDeg(dir: { ra: number; dec: number }, obs: ObserverLocation, at: Date) {
  const lst = localSiderealTime(at, obs.lng * DEG);
  return equatorialToHorizontal(dir.ra, dir.dec, obs.lat * DEG, lst).alt / DEG;
}

function sunAltDeg(obs: ObserverLocation, at: Date) {
  return altDeg(computeSunPosition(obs, at), obs, at);
}

/** Hours since local mean solar midnight, from longitude alone: [0, 24). */
function solarHour(obs: ObserverLocation, at: Date) {
  const h = (at.getTime() / HOUR + obs.lng / 15) % 24;
  return (h + 24) % 24;
}

/** The local-solar calendar date of an evening instant, as "M-D". */
function solarDate(obs: ObserverLocation, at: Date) {
  const d = new Date(at.getTime() + (obs.lng / 15) * HOUR);
  return `${d.getUTCMonth() + 1}-${d.getUTCDate()}`;
}

/** Local solar noon, as UTC, on the given calendar date. */
function solarNoon(obs: ObserverLocation, y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 12) - (obs.lng / 15) * HOUR);
}

describe("findTourTime", () => {
  it("returns an instant at or after `after` where every stop is above 20° and the Sun is below −12°", () => {
    const after = solarNoon(KANSAS, 2027, 1, 10);
    const result = findTourTime(tour(ORION_STOPS), KANSAS, after, REAL)!;

    expect(result).not.toBeNull();
    expect(result.at.getTime()).toBeGreaterThanOrEqual(after.getTime());
    for (const stop of ORION_STOPS) {
      expect(altDeg(stopDirection(stop, REAL)!, KANSAS, result.at)).toBeGreaterThan(20);
    }
    expect(sunAltDeg(KANSAS, result.at)).toBeLessThan(-12);
  });

  it("returns the first instant of the evening at which the sky qualifies", () => {
    // The stop is up all night, so the only gate is the Sun: the answer is
    // the first 10-minute step after nautical dusk.
    const after = solarNoon(KANSAS, 2027, 3, 1);
    const { at } = findTourTime(tour([star(1)]), KANSAS, after, inline(NEAR_POLE))!;

    expect(solarDate(KANSAS, at)).toBe("3-1");
    expect(sunAltDeg(KANSAS, at)).toBeLessThan(-12);
    expect(sunAltDeg(KANSAS, new Date(at.getTime() - 10 * MINUTE))).toBeGreaterThanOrEqual(-12);
  });

  it("returns the earliest qualifying evening, skipping none", () => {
    // In early October Rigel climbs past 20° only after local solar
    // midnight from 49°N. The first evening that qualifies is weeks later.
    const after = solarNoon(NORTH, 2027, 10, 1);
    const stops = ORION_STOPS;
    const { at } = findTourTime(tour(stops), NORTH, after, REAL)!;
    expect(at.getTime() - after.getTime()).toBeGreaterThan(7 * DAY);

    const dirs = stops.map((s) => stopDirection(s, REAL)!);
    const qualifies = (t: Date) =>
      solarHour(NORTH, t) >= 12 &&
      dirs.every((d) => altDeg(d, NORTH, t) > 20) &&
      sunAltDeg(NORTH, t) < -12;

    for (let t = after.getTime(); t < at.getTime(); t += 10 * MINUTE) {
      if (qualifies(new Date(t))) {
        throw new Error(`an earlier instant qualifies: ${new Date(t).toISOString()}`);
      }
    }
  });

  it("never returns a pre-dawn time", () => {
    // In September Orion is high before dawn, but not in the evening.
    const after = solarNoon(KANSAS, 2027, 9, 1);
    const { at } = findTourTime(tour(ORION_STOPS), KANSAS, after, REAL)!;

    const hour = solarHour(KANSAS, at);
    expect(hour).toBeGreaterThanOrEqual(12);
    expect(hour).toBeLessThan(24);
    expect(at.getTime() - after.getTime()).toBeGreaterThan(30 * DAY);
  });

  it("starts at the window's first evening when searching from before it", () => {
    const june = { from: md(6, 1), to: md(6, 30) };
    const after = solarNoon(KANSAS, 2027, 3, 1);
    const { at } = findTourTime(tour([star(1)], june), KANSAS, after, inline(NEAR_POLE))!;
    expect(solarDate(KANSAS, at)).toBe("6-1");
  });

  describe("with a window that wraps the year end (Nov 1 – Feb 28)", () => {
    const winter = { from: md(11, 1), to: md(2, 28) };

    it("finds tonight when tonight is in January", () => {
      const after = solarNoon(KANSAS, 2027, 1, 15);
      const { at } = findTourTime(tour([star(1)], winter), KANSAS, after, inline(NEAR_POLE))!;
      expect(solarDate(KANSAS, at)).toBe("1-15");
    });

    it("includes the window's last day", () => {
      const after = solarNoon(KANSAS, 2027, 2, 28);
      const { at } = findTourTime(tour([star(1)], winter), KANSAS, after, inline(NEAR_POLE))!;
      expect(solarDate(KANSAS, at)).toBe("2-28");
    });

    it("jumps to November when searching from March", () => {
      const after = solarNoon(KANSAS, 2027, 3, 10);
      const { at } = findTourTime(tour([star(1)], winter), KANSAS, after, inline(NEAR_POLE))!;
      expect(solarDate(KANSAS, at)).toBe("11-1");
      expect(at.getUTCFullYear()).toBe(2027);
    });
  });

  it("returns null for a tour with a stop that never gets above 20° from the observer", () => {
    const after = solarNoon(KANSAS, 2027, 1, 1);
    const result = findTourTime(
      tour([star(1), star(2)]),
      KANSAS,
      after,
      inline(NEAR_POLE, DEEP_SOUTH)
    );
    expect(result).toBeNull();
  });

  it("throws for a stop that is not in its catalog", () => {
    const after = solarNoon(KANSAS, 2027, 1, 1);
    expect(() => findTourTime(tour([star(42)]), KANSAS, after, inline(NEAR_POLE))).toThrow(
      /42/
    );
  });

  describe("tonight", () => {
    it("is true for an instant later this evening", () => {
      const after = solarNoon(KANSAS, 2027, 3, 1);
      const result = findTourTime(tour([star(1)]), KANSAS, after, inline(NEAR_POLE))!;
      expect(result.tonight).toBe(true);
    });

    it("is true for this coming evening when searching from before dawn", () => {
      const preDawn = new Date(solarNoon(KANSAS, 2027, 3, 1).getTime() - 9 * HOUR); // 3am solar
      const result = findTourTime(tour([star(1)]), KANSAS, preDawn, inline(NEAR_POLE))!;
      expect(solarDate(KANSAS, result.at)).toBe("3-1");
      expect(result.tonight).toBe(true);
    });

    // An observer at 120°W keeps Pacific Daylight Time (UTC−7) in summer, so
    // the clock reads an hour ahead of local solar time: solar midnight is
    // 1am on the clock. A stop that rises past 20° at solar 11:25pm reaches
    // its tour time at 12:30am on the clock — still tonight.
    const WEST: ObserverLocation = { lat: 35, lng: -120 };
    const PDT_OFFSET = -7 * HOUR;
    const crossing = new Date("2027-06-21T07:25:00Z"); // solar 11:25pm on Jun 20
    const lateRiser: Star = (() => {
      // A star on the equator is above 20° within this hour angle of transit.
      const h0 = Math.acos(Math.sin(20 * DEG) / Math.cos(WEST.lat * DEG));
      const lst = localSiderealTime(crossing, WEST.lng * DEG);
      return { id: 3, ra: (lst + h0) % (2 * Math.PI), dec: 0, mag: 1 };
    })();

    it("is true for an instant after 12am on the clock but before local solar midnight", () => {
      const after = new Date("2027-06-21T03:00:00Z"); // 8pm PDT on Jun 20
      const result = findTourTime(tour([star(3)]), WEST, after, inline(lateRiser))!;

      const clock = new Date(result.at.getTime() + PDT_OFFSET);
      expect(clock.getUTCDate()).toBe(21);
      expect(clock.getUTCHours()).toBe(0); // 12am on the clock
      expect(solarHour(WEST, result.at)).toBeGreaterThan(23);
      expect(result.tonight).toBe(true);
    });

    it("is false for tomorrow evening", () => {
      // From solar 11:55pm, no step is left before solar midnight tonight.
      const after = new Date("2027-06-21T07:55:00Z");
      const result = findTourTime(tour([star(3)]), WEST, after, inline(lateRiser))!;

      expect(result.at.getTime() - after.getTime()).toBeGreaterThan(20 * HOUR);
      expect(result.tonight).toBe(false);
    });
  });
});
