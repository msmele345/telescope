import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ConstellationLines } from "@/lib/constellation";
import { getMessierById } from "@/lib/messier";
import type { Star } from "@/lib/star-catalog";
import { stopDirection, type TourCatalogs } from "@/lib/tours";

const DEG = Math.PI / 180;
const HOUR = Math.PI / 12;

const REAL_LINES = JSON.parse(
  readFileSync(
    path.join(process.cwd(), "public", "data", "constellation-lines.json"),
    "utf8"
  )
) as ConstellationLines;

const BETELGEUSE: Star = { id: 2061, ra: 1.5497, dec: 0.1293, mag: 0.5 };

function catalogs(lines: ConstellationLines = {}): TourCatalogs {
  return { stars: [BETELGEUSE], lines };
}

const text = { heading: "h", body: "b" };

describe("stopDirection", () => {
  it("uses catalog RA/Dec for a star stop", () => {
    const dir = stopDirection({ kind: "star", id: 2061, ...text }, catalogs());
    expect(dir).toEqual({ ra: BETELGEUSE.ra, dec: BETELGEUSE.dec });
  });

  it("uses catalog RA/Dec for a Messier stop", () => {
    const m42 = getMessierById("M42")!;
    const dir = stopDirection({ kind: "messier", id: "M42", ...text }, catalogs());
    expect(dir).toEqual({ ra: m42.ra, dec: m42.dec });
  });

  it("averages the directions of a constellation's line-figure vertices", () => {
    const lines = { Xyz: [[[0, 0], [90 * DEG, 0]] as const] };
    const dir = stopDirection({ kind: "constellation", id: "Xyz", ...text }, catalogs(lines))!;
    expect(dir.ra).toBeCloseTo(45 * DEG, 10);
    expect(dir.dec).toBeCloseTo(0, 10);
  });

  it("counts a vertex shared by several polylines once", () => {
    const lines = {
      Xyz: [
        [[0, 0], [90 * DEG, 0]] as const,
        [[0, 0], [0, 0]] as const,
      ],
    };
    const dir = stopDirection({ kind: "constellation", id: "Xyz", ...text }, catalogs(lines))!;
    expect(dir.ra).toBeCloseTo(45 * DEG, 10);
  });

  it("puts Pegasus, whose figure straddles RA 0h, between its own stars", () => {
    const dir = stopDirection({ kind: "constellation", id: "Peg", ...text }, catalogs(REAL_LINES))!;
    // The figure runs from about 21.7h through 0h to 0.2h. A naive mean of
    // RAs on [0, 24h) would land near 12h, on the far side of the sky.
    expect(dir.ra).toBeGreaterThan(22 * HOUR);
    expect(dir.ra).toBeLessThan(24 * HOUR);
    expect(dir.dec).toBeGreaterThan(10 * DEG);
    expect(dir.dec).toBeLessThan(30 * DEG);
  });

  it("puts Ursa Major, whose figure straddles the ±12h seam in the line data, near 11h", () => {
    // The line data stores RA on (−12h, 12h], so UMa's stars sit either side
    // of ±12h. A naive mean there would land near 0h.
    const dir = stopDirection({ kind: "constellation", id: "UMa", ...text }, catalogs(REAL_LINES))!;
    expect(dir.ra).toBeGreaterThan(9 * HOUR);
    expect(dir.ra).toBeLessThan(13 * HOUR);
    expect(dir.dec).toBeGreaterThan(40 * DEG);
  });

  it("returns RA on [0, 2π)", () => {
    const lines = { Xyz: [[[-10 * DEG, 0], [-20 * DEG, 0]] as const] };
    const dir = stopDirection({ kind: "constellation", id: "Xyz", ...text }, catalogs(lines))!;
    expect(dir.ra).toBeCloseTo(345 * DEG, 10);
  });

  it("returns null for an ID that is not in its catalog", () => {
    expect(stopDirection({ kind: "star", id: 999_999, ...text }, catalogs())).toBeNull();
    expect(stopDirection({ kind: "messier", id: "M999", ...text }, catalogs())).toBeNull();
    expect(stopDirection({ kind: "constellation", id: "Ori", ...text }, catalogs())).toBeNull();
  });
});
