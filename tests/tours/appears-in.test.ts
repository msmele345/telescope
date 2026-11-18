import { describe, expect, it } from "vitest";
import { toursForConstellation, type Tour, type TourStop } from "@/lib/tours";

const STAR_CONSTELLATIONS: Record<number, string> = {
  2491: "CMa", // Sirius
  2061: "Ori", // Betelgeuse
  7001: "Lyr", // Vega
};
const starConstellation = (id: number) => STAR_CONSTELLATIONS[id];

function stop(ref: Pick<TourStop, "kind" | "id">): TourStop {
  return { ...ref, heading: "", body: "" } as TourStop;
}

function tour(slug: string, stops: TourStop[]): Tour {
  return {
    slug,
    title: slug,
    summary: "",
    window: { from: { month: 1, day: 1 }, to: { month: 12, day: 31 } },
    stops,
  };
}

const WINTER = tour("winter-hexagon", [
  stop({ kind: "constellation", id: "Ori" }),
  stop({ kind: "messier", id: "M42" }),
  stop({ kind: "star", id: 2491 }),
]);
const SUMMER = tour("summer-triangle", [
  stop({ kind: "star", id: 7001 }),
  stop({ kind: "messier", id: "M57" }),
  stop({ kind: "constellation", id: "Cyg" }),
]);
const ALSO_ORION = tour("also-orion", [stop({ kind: "star", id: 2061 })]);
const TOURS = [WINTER, SUMMER, ALSO_ORION];

const slugs = (tours: readonly Tour[]) => tours.map((t) => t.slug);

describe("toursForConstellation", () => {
  it("finds a tour by a constellation stop", () => {
    expect(slugs(toursForConstellation("Cyg", TOURS, starConstellation))).toEqual([
      "summer-triangle",
    ]);
  });

  it("counts a star stop toward its parent constellation", () => {
    expect(slugs(toursForConstellation("CMa", TOURS, starConstellation))).toEqual([
      "winter-hexagon",
    ]);
  });

  it("counts a Messier stop toward its parent constellation", () => {
    // M57, the Ring Nebula, is in Lyra; so is Vega.
    expect(slugs(toursForConstellation("Lyr", TOURS, starConstellation))).toEqual([
      "summer-triangle",
    ]);
  });

  it("lists every tour with a stop there, once each, in registry order", () => {
    // Winter Hexagon reaches Orion twice (Ori and M42) but is listed once.
    expect(slugs(toursForConstellation("Ori", TOURS, starConstellation))).toEqual([
      "winter-hexagon",
      "also-orion",
    ]);
  });

  it("finds nothing for a constellation on no tour", () => {
    expect(toursForConstellation("Cru", TOURS, starConstellation)).toEqual([]);
  });

  it("skips a star whose constellation is unknown", () => {
    const stray = tour("stray", [stop({ kind: "star", id: 999_999 })]);
    expect(toursForConstellation("Ori", [stray], starConstellation)).toEqual([]);
  });
});
