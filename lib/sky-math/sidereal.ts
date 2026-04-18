import { julianCenturiesSinceJ2000 } from "./julian";

const TWO_PI = Math.PI * 2;
const SECONDS_PER_DAY = 86400;

function normalizeRadians(r: number): number {
  return ((r % TWO_PI) + TWO_PI) % TWO_PI;
}

// Greenwich Mean Sidereal Time in radians. Meeus, Astronomical Algorithms
// (2nd ed.) eq. 12.4 — GMST in seconds, then wrapped to [0, 2π).
export function greenwichMeanSiderealTime(date: Date): number {
  const t = julianCenturiesSinceJ2000(date);
  let seconds =
    67310.54841 +
    (876600 * 3600 + 8640184.812866) * t +
    0.093104 * t * t -
    0.0000062 * t * t * t;
  seconds = ((seconds % SECONDS_PER_DAY) + SECONDS_PER_DAY) % SECONDS_PER_DAY;
  return (seconds / SECONDS_PER_DAY) * TWO_PI;
}

// Local apparent sidereal time. longitudeRad is east-positive, so a standard
// signed-decimal longitude (negative for US) passes through directly.
export function localSiderealTime(date: Date, longitudeRad: number): number {
  return normalizeRadians(greenwichMeanSiderealTime(date) + longitudeRad);
}
