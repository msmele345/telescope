export type MessierType =
  | "galaxy"
  | "globular-cluster"
  | "open-cluster"
  | "nebula"
  | "planetary-nebula"
  | "supernova-remnant"
  | "double-star"
  | "asterism";

export interface MessierObject {
  /** Messier number, 1..110. */
  m: number;
  /** Display id, e.g. "M31". */
  id: string;
  /** Common name, e.g. "Andromeda Galaxy". null when no popular name exists. */
  name: string | null;
  type: MessierType;
  /** Right ascension, radians. */
  ra: number;
  /** Declination, radians. */
  dec: number;
  /** Apparent visual magnitude. */
  mag: number;
  /** IAU 3-letter constellation abbreviation. */
  constellation: string;
}
