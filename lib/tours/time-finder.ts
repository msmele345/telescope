import type { ObserverLocation } from "@/lib/observer";
import { equatorialToHorizontal, localSiderealTime } from "@/lib/sky-math";
import { computeSunPosition } from "@/lib/solar-system";
import { stopDirection, type Direction } from "./direction";
import type { MonthDay, Tour, TourCatalogs, TourStop, TourTime } from "./types";

const DEG = Math.PI / 180;
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Every stop must be strictly above this altitude. */
const MIN_STOP_ALT = 20 * DEG;
/** The Sun must be strictly below this altitude (nautical darkness). */
const MAX_SUN_ALT = -12 * DEG;
/** Evenings are sampled on a 10-minute UTC grid, so results read as round clock times. */
const STEP_MS = 10 * MINUTE_MS;
/** How many evenings to search: a full year, leap day included. */
const SEARCH_NIGHTS = 366;

/**
 * The earliest evening instant, at or after `after` and within the tour
 * window, at which every stop is above 20° from `observer`. Null when no
 * evening in the coming year qualifies.
 *
 * "Evening" is defined by the sky, not the clock: the Sun is more than 12°
 * below the horizon, and the time is before local solar midnight. Solar
 * midnight is *mean* solar time from longitude alone (UTC − lng/15 h),
 * ignoring the equation of time (±16 min). Neither part needs a timezone.
 *
 * Throws if a stop's ID is not in its catalog. The tour content test rules
 * that out for every shipped tour.
 */
export function findTourTime(
  tour: Tour,
  observer: ObserverLocation,
  after: Date,
  catalogs: TourCatalogs
): TourTime | null {
  const directions = tour.stops.map((stop) => resolve(tour, stop, catalogs));
  const latRad = observer.lat * DEG;
  const lngRad = observer.lng * DEG;
  const afterMs = after.getTime();
  const tonightEnds = nextSolarMidnight(afterMs, observer.lng);

  const allStopsUp = (t: Date) => {
    const lst = localSiderealTime(t, lngRad);
    return directions.every(
      (d) => equatorialToHorizontal(d.ra, d.dec, latRad, lst).alt > MIN_STOP_ALT
    );
  };
  const sunIsDown = (t: Date) => {
    const sun = computeSunPosition(observer, t);
    const lst = localSiderealTime(t, lngRad);
    return equatorialToHorizontal(sun.ra, sun.dec, latRad, lst).alt < MAX_SUN_ALT;
  };

  for (let night = 0; night < SEARCH_NIGHTS; night++) {
    const midnight = tonightEnds + night * DAY_MS;
    const noon = midnight - 12 * HOUR_MS;
    if (!inWindow(solarDateOf(noon, observer.lng), tour.window)) continue;

    const start = Math.max(noon, afterMs);
    for (let t = ceilToStep(start); t < midnight; t += STEP_MS) {
      const at = new Date(t);
      // Stops first: it is cheap trig, and the Sun is the costly check.
      if (allStopsUp(at) && sunIsDown(at)) {
        return { at, tonight: night === 0 };
      }
    }
  }
  return null;
}

function resolve(tour: Tour, stop: TourStop, catalogs: TourCatalogs): Direction {
  const dir = stopDirection(stop, catalogs);
  if (!dir) {
    throw new Error(
      `Tour "${tour.slug}": ${stop.kind} stop "${stop.id}" is not in its catalog`
    );
  }
  return dir;
}

/** Offset of local mean solar time from UTC, in ms. East-positive longitude. */
function solarOffsetMs(lngDeg: number): number {
  return (lngDeg / 360) * DAY_MS;
}

/** The first local solar midnight strictly after `ms`. */
function nextSolarMidnight(ms: number, lngDeg: number): number {
  const local = ms + solarOffsetMs(lngDeg);
  const nextLocalMidnight = Math.floor(local / DAY_MS) * DAY_MS + DAY_MS;
  return nextLocalMidnight - solarOffsetMs(lngDeg);
}

/** The local solar calendar date of an instant. */
function solarDateOf(ms: number, lngDeg: number): MonthDay {
  const d = new Date(ms + solarOffsetMs(lngDeg));
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Both ends inclusive. A window whose start falls after its end wraps the year end. */
function inWindow(date: MonthDay, window: Tour["window"]): boolean {
  const key = (d: MonthDay) => d.month * 100 + d.day;
  const k = key(date);
  const from = key(window.from);
  const to = key(window.to);
  return from <= to ? k >= from && k <= to : k >= from || k <= to;
}

function ceilToStep(ms: number): number {
  return Math.ceil(ms / STEP_MS) * STEP_MS;
}
