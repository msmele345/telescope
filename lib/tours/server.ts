import { getStarsByIds } from "@/lib/star-catalog/server";
import { toursForConstellation } from "./appears-in";
import { TOURS } from "./registry";
import type { Tour } from "./types";

/**
 * Server-only: the registered tours with a stop in the constellation `abbr`,
 * for the "Appears in" links on its lesson page. Reads the star catalog from
 * disk to place star stops in their parent constellation.
 */
export async function getToursForConstellation(abbr: string): Promise<Tour[]> {
  const starIds = TOURS.flatMap((tour) =>
    tour.stops.flatMap((stop) => (stop.kind === "star" ? [String(stop.id)] : []))
  );
  const stars = await getStarsByIds(starIds);
  const constellationOf = new Map(stars.map((s) => [s.id, s.constellation]));
  return toursForConstellation(abbr, TOURS, (id) => constellationOf.get(id));
}
