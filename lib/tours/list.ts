import { formatClock } from "./labels";
import { formatNightOf } from "./night-of";
import type { Tour, TourTime } from "./types";

/** The deep link that starts a tour, the one entry point every link uses. */
export function tourHref(slug: string): string {
  return `/?tour=${encodeURIComponent(slug)}`;
}

/** One row of the tours list: a tour and its tour time for the current observer. */
export interface TourListEntry {
  tour: Tour;
  /** Null when the tour can't be seen from this observer, so it can't be started. */
  time: TourTime | null;
}

/**
 * The tours list order: soonest tour time first, so tonight's tours lead, and
 * tours with no tour time last. Ties keep registry order. Returns a new array.
 */
export function sortByTourTime(entries: readonly TourListEntry[]): TourListEntry[] {
  const key = (e: TourListEntry) => e.time?.at.getTime() ?? Number.POSITIVE_INFINITY;
  return [...entries].sort((a, b) => key(a) - key(b));
}

/**
 * When a tour is next visible, e.g. "Next: Tonight 8:40pm" or "Next: Jan 12".
 * "Tonight" comes from the tour time's own flag, never a calendar-date
 * comparison, because an evening can run past 12am on the clock. Later
 * evenings are named by their night-of date.
 */
export function nextTourLabel(time: TourTime | null): string {
  if (!time) return "Not visible from your location";
  if (time.tonight) return `Next: Tonight ${formatClock(time.at)}`;
  return `Next: ${formatNightOf(time.at)}`;
}
