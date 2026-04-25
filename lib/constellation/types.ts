/** A single polyline as a list of [raRad, decRad] vertex pairs. */
export type Polyline = ReadonlyArray<readonly [number, number]>;

/** Map from IAU 3-letter abbreviation → array of polylines. */
export type ConstellationLines = Record<string, Polyline[]>;
