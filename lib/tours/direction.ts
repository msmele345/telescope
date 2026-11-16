import type { Polyline } from "@/lib/constellation/types";
import { getMessierById } from "@/lib/messier";
import type { Equatorial } from "@/lib/sky-math";
import type { StopRef, TourCatalogs } from "./types";

const TWO_PI = Math.PI * 2;

/**
 * Where a stop sits on the celestial sphere, or null when its ID is not in
 * its catalog. Stars and Messier objects use their catalog position. A
 * constellation uses the average direction of its line-figure vertices.
 * RA is on [0, 2π).
 */
export function stopDirection(
  stop: StopRef,
  catalogs: TourCatalogs
): Equatorial | null {
  switch (stop.kind) {
    case "star": {
      const star = catalogs.stars.find((s) => s.id === stop.id);
      return star ? { ra: star.ra, dec: star.dec } : null;
    }
    case "messier": {
      const obj = getMessierById(stop.id);
      return obj ? { ra: obj.ra, dec: obj.dec } : null;
    }
    case "constellation": {
      const figure = catalogs.lines[stop.id];
      return figure && figure.length > 0 ? meanDirection(figure) : null;
    }
  }
}

/**
 * The mean of the vertices as 3D unit vectors, so a figure that straddles an
 * RA seam (0h, or ±12h in the line data) averages to its middle, not to the
 * far side of the sky. A vertex shared by several polylines counts once.
 */
function meanDirection(figure: readonly Polyline[]): Equatorial | null {
  const seen = new Set<string>();
  let x = 0;
  let y = 0;
  let z = 0;
  for (const polyline of figure) {
    for (const [ra, dec] of polyline) {
      const key = `${ra},${dec}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const cosDec = Math.cos(dec);
      x += cosDec * Math.cos(ra);
      y += cosDec * Math.sin(ra);
      z += Math.sin(dec);
    }
  }
  if (seen.size === 0) return null;
  const ra = ((Math.atan2(y, x) % TWO_PI) + TWO_PI) % TWO_PI;
  const dec = Math.atan2(z, Math.hypot(x, y));
  return { ra, dec };
}
