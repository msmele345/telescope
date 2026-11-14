import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isKnownAbbr, type ConstellationLines } from "@/lib/constellation";
import { getMessierById } from "@/lib/messier";
import type { ObserverLocation } from "@/lib/observer";
import type { Star } from "@/lib/star-catalog";
import { TOURS, findTourTime, getTourBySlug, type Tour } from "@/lib/tours";

const CONTENT_DIR = path.resolve(__dirname, "../../content/tours");
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function readJson<T>(file: string): T {
  return JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "data", file), "utf8")
  ) as T;
}

const STARS = readJson<Star[]>("bsc5.json");
const LINES = readJson<ConstellationLines>("constellation-lines.json");
const STAR_IDS = new Set(STARS.map((s) => s.id));

// The contiguous-US latitude extremes.
const SOUTH: ObserverLocation = { lat: 25, lng: -80.5 };
const NORTH: ObserverLocation = { lat: 49, lng: -97 };

// A fixed year, so the test does not drift with the calendar.
const YEAR = 2027;

/** Local solar noon on the first day of the tour window. */
function windowStart(tour: Tour, obs: ObserverLocation): Date {
  const { month, day } = tour.window.from;
  return new Date(Date.UTC(YEAR, month - 1, day, 12) - (obs.lng / 15) * HOUR);
}

const files = readdirSync(CONTENT_DIR);

describe("tour content", () => {
  it("holds tours", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("registers every tour file, and every registered tour has a file", async () => {
    const fromFiles: Tour[] = [];
    for (const file of files) {
      expect(file, `${file} is not a .ts tour file`).toMatch(/\.ts$/);
      const mod = (await import(path.join(CONTENT_DIR, file))) as { default: Tour };
      expect(TOURS, `${file} is not in the registry`).toContain(mod.default);
      fromFiles.push(mod.default);
    }
    expect(TOURS).toHaveLength(fromFiles.length);
  });

  it("finds a registered tour by slug, and nothing for an unknown slug", () => {
    for (const tour of TOURS) expect(getTourBySlug(tour.slug)).toBe(tour);
    expect(getTourBySlug("not-a-tour")).toBeNull();
  });

  describe.each(files.map((f) => [f.replace(/\.ts$/, ""), f]))("%s", (slug, file) => {
    const load = async () =>
      ((await import(path.join(CONTENT_DIR, file))) as { default: Tour }).default;

    it("has a slug that matches its file name", async () => {
      expect((await load()).slug).toBe(slug);
    });

    it("has 5–7 stops", async () => {
      const { stops } = await load();
      expect(stops.length).toBeGreaterThanOrEqual(5);
      expect(stops.length).toBeLessThanOrEqual(7);
    });

    it("names only objects that exist in their catalogs", async () => {
      for (const stop of (await load()).stops) {
        switch (stop.kind) {
          case "constellation":
            expect(isKnownAbbr(stop.id), `${stop.id} is not a constellation`).toBe(true);
            expect(LINES[stop.id]?.length, `${stop.id} has no line figure`).toBeGreaterThan(0);
            break;
          case "star":
            expect(STAR_IDS.has(stop.id), `star ${stop.id} is not in bsc5.json`).toBe(true);
            break;
          case "messier":
            expect(getMessierById(stop.id), `${stop.id} is not in the Messier catalog`).not.toBeNull();
            break;
        }
      }
    });

    it.each([
      ["25°N", SOUTH],
      ["49°N", NORTH],
    ] as const)("is visible within 14 days of its window start from %s", async (_, obs) => {
      const tour = await load();
      const after = windowStart(tour, obs);
      const result = findTourTime(tour, obs, after, { stars: STARS, lines: LINES });
      expect(result, `${tour.slug} is never visible from ${obs.lat}°N`).not.toBeNull();
      expect(result!.at.getTime() - after.getTime()).toBeLessThan(14 * DAY);
    });
  });
});
