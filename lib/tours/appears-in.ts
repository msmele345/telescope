import { getMessierById } from "@/lib/messier";
import type { Tour, TourStop } from "./types";

/**
 * The IAU abbreviation of the constellation a stop belongs to: the stop
 * itself for a constellation, or its parent for a star or Messier object.
 * Undefined when the object is not in its catalog.
 */
function stopConstellation(
  stop: TourStop,
  starConstellation: (id: number) => string | undefined
): string | undefined {
  switch (stop.kind) {
    case "constellation":
      return stop.id;
    case "star":
      return starConstellation(stop.id);
    case "messier":
      return getMessierById(stop.id)?.constellation;
  }
}

/**
 * The tours with a stop in the constellation `abbr`, in registry order. A
 * star or Messier stop counts toward its parent constellation (Sirius puts a
 * tour on Canis Major's page). Star constellations come from the star
 * catalog, which is loaded at runtime, so the caller supplies the lookup.
 */
export function toursForConstellation(
  abbr: string,
  tours: readonly Tour[],
  starConstellation: (id: number) => string | undefined
): Tour[] {
  return tours.filter((tour) =>
    tour.stops.some((stop) => stopConstellation(stop, starConstellation) === abbr)
  );
}
