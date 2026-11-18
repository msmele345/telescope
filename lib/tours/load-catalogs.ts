import { loadConstellationLines } from "@/lib/constellation";
import { loadCatalog } from "@/lib/star-catalog";
import type { TourCatalogs } from "./types";

let pending: Promise<TourCatalogs> | null = null;

/**
 * The star catalog and line figures a tour's stops are looked up in, fetched
 * once per page load. A failed fetch is not cached, so the next tour retries.
 */
export function loadTourCatalogs(): Promise<TourCatalogs> {
  if (!pending) {
    pending = Promise.all([loadCatalog(), loadConstellationLines()]).then(
      ([stars, lines]) => ({ stars, lines }),
      (err) => {
        pending = null;
        throw err;
      }
    );
  }
  return pending;
}
