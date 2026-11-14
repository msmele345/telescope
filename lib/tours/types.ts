import type { ConstellationLines } from "@/lib/constellation/types";
import type { Star } from "@/lib/star-catalog/types";

/** A calendar day with no year, e.g. `{ month: 12, day: 1 }` for Dec 1. */
export interface MonthDay {
  /** 1 (January) to 12 (December). */
  month: number;
  day: number;
}

/**
 * The part of the year a tour is meant to be seen, both ends inclusive. It
 * wraps the year end when `from` falls after `to` (e.g. Nov 1 → Feb 28).
 */
export interface TourWindow {
  from: MonthDay;
  to: MonthDay;
}

export type TourStop =
  | {
      kind: "constellation";
      /** IAU abbreviation, e.g. "Ori". */
      id: string;
      heading: string;
      body: string;
    }
  | {
      kind: "star";
      /** BSC catalog id, e.g. 2061 for Betelgeuse. */
      id: number;
      heading: string;
      body: string;
    }
  | {
      kind: "messier";
      /** Messier display id, e.g. "M42". */
      id: string;
      heading: string;
      body: string;
    };

export interface Tour {
  /** Matches the file name in `content/tours/`. */
  slug: string;
  title: string;
  /** One sentence, shown in the tour list. */
  summary: string;
  window: TourWindow;
  /** Five to seven stops. */
  stops: readonly TourStop[];
}

/** The result of the time-finder: when to show the tour, and whether that is tonight. */
export interface TourTime {
  at: Date;
  /** True when `at` falls before the first local solar midnight after the search start. */
  tonight: boolean;
}

/**
 * The catalogs a stop's position comes from. Stars and line figures are
 * loaded at runtime (fetched in the browser, read from disk in tests), so
 * they are passed in. Messier objects come from the static catalog.
 */
export interface TourCatalogs {
  stars: readonly Star[];
  lines: ConstellationLines;
}
