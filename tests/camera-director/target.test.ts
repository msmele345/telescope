import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CONSTELLATION_FOV_MAX,
  CONSTELLATION_FOV_MIN,
  POINT_FOV,
  RESET_FOV,
  viewForTarget,
  type Vec3,
} from "@/lib/camera-director";
import type { ConstellationLines } from "@/lib/constellation";
import { getMessierById } from "@/lib/messier";
import type { ObserverLocation } from "@/lib/observer";
import {
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import type { Star } from "@/lib/star-catalog";
import { stopDirection } from "@/lib/tours";

const DEG = Math.PI / 180;

const LINES = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "constellation-lines.json"), "utf8")
) as ConstellationLines;

const BETELGEUSE: Star = { id: 2061, ra: 1.5497, dec: 0.1293, mag: 0.5 };
const CATALOGS = { stars: [BETELGEUSE], lines: LINES };

const OBSERVER: ObserverLocation = { lat: 39.8283, lng: -98.5795 };
const WHEN = new Date("2027-01-15T04:00:00Z");
const LANDSCAPE = 16 / 9;
const PORTRAIT = 9 / 19.5;

function expectedDirection(ra: number, dec: number): Vec3 {
  const lst = localSiderealTime(WHEN, OBSERVER.lng * DEG);
  const { alt, az } = equatorialToHorizontal(ra, dec, OBSERVER.lat * DEG, lst);
  return horizontalToVec3(alt, az);
}

function expectVecClose(actual: Vec3, expected: Vec3) {
  expect(actual.x).toBeCloseTo(expected.x, 10);
  expect(actual.y).toBeCloseTo(expected.y, 10);
  expect(actual.z).toBeCloseTo(expected.z, 10);
}

function view(target: Parameters<typeof viewForTarget>[0], aspect = LANDSCAPE) {
  return viewForTarget(target, CATALOGS, OBSERVER, WHEN, aspect);
}

describe("viewForTarget", () => {
  it("points at a star's position in the observer's sky and zooms to about 15°", () => {
    const v = view({ kind: "star", id: 2061 })!;
    expectVecClose(v.direction, expectedDirection(BETELGEUSE.ra, BETELGEUSE.dec));
    expect(v.fov).toBe(POINT_FOV);
    expect(POINT_FOV).toBeCloseTo(15, 0);
  });

  it("points at a Messier object's position and zooms to about 15°", () => {
    const m42 = getMessierById("M42")!;
    const v = view({ kind: "messier", id: "M42" })!;
    expectVecClose(v.direction, expectedDirection(m42.ra, m42.dec));
    expect(v.fov).toBe(POINT_FOV);
  });

  it("points at the middle of a constellation's line figure", () => {
    const centre = stopDirection({ kind: "constellation", id: "Ori" }, CATALOGS)!;
    const v = view({ kind: "constellation", id: "Ori" })!;
    expectVecClose(v.direction, expectedDirection(centre.ra, centre.dec));
  });

  it("frames a mid-sized constellation at about 50°", () => {
    const fov = view({ kind: "constellation", id: "Ori" })!.fov;
    expect(fov).toBeGreaterThanOrEqual(35);
    expect(fov).toBeLessThanOrEqual(55);
  });

  it("fits the outline: a big figure gets a wider view than a small one", () => {
    const big = view({ kind: "constellation", id: "UMa" })!.fov;
    const small = view({ kind: "constellation", id: "Aql" })!.fov;
    expect(big).toBeGreaterThan(small);
  });

  it("keeps a tiny figure from zooming in as far as a star", () => {
    expect(view({ kind: "constellation", id: "Lyr" })!.fov).toBe(CONSTELLATION_FOV_MIN);
    expect(CONSTELLATION_FOV_MIN).toBeGreaterThan(POINT_FOV);
  });

  it("keeps a huge figure zoomed in a little", () => {
    expect(view({ kind: "constellation", id: "Hya" })!.fov).toBe(CONSTELLATION_FOV_MAX);
    expect(CONSTELLATION_FOV_MAX).toBeLessThan(RESET_FOV);
  });

  it("widens the vertical view on a portrait screen so the figure fits across", () => {
    const landscape = view({ kind: "constellation", id: "Ori" }, LANDSCAPE)!.fov;
    const portrait = view({ kind: "constellation", id: "Ori" }, PORTRAIT)!.fov;
    expect(portrait).toBeGreaterThan(landscape);
  });

  it("points at a raw altitude/azimuth with the FOV given", () => {
    const v = view({ kind: "horizontal", alt: 89.3, az: 180, fov: 15 })!;
    expectVecClose(v.direction, horizontalToVec3(89.3 * DEG, 180 * DEG));
    expect(v.fov).toBe(15);
  });

  it("returns null for an ID that is not in its catalog", () => {
    expect(view({ kind: "star", id: -1 })).toBeNull();
    expect(view({ kind: "messier", id: "M999" })).toBeNull();
    expect(view({ kind: "constellation", id: "Xyz" })).toBeNull();
  });

  it("resets to 75°", () => {
    expect(RESET_FOV).toBe(75);
  });
});
