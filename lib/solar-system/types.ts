export type SolarBodyKind = "sun" | "moon" | "planet";

export type SolarBodyId =
  | "sun"
  | "moon"
  | "mercury"
  | "venus"
  | "mars"
  | "jupiter"
  | "saturn"
  | "uranus"
  | "neptune";

export interface SolarBody {
  id: SolarBodyId;
  /** Display name, e.g. "Sun", "Moon", "Jupiter". */
  name: string;
  kind: SolarBodyKind;
  /** Apparent right ascension at the given time, radians. */
  ra: number;
  /** Apparent declination at the given time, radians. */
  dec: number;
  /** Apparent magnitude at the given time. */
  mag: number;
  /** Geocentric/topocentric distance in astronomical units. */
  distAU: number;
}
