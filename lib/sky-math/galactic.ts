// Galactic (l, b) → equatorial (RA, Dec), J2000. Used to lay the Milky Way
// band onto the same celestial sphere as the catalog stars so it tracks the
// observer and time exactly as the star field does.

const DEG = Math.PI / 180;

// J2000 reference directions (Hipparcos/ESA conventions).
const RA_NGP = 192.85948 * DEG; // RA of the North Galactic Pole
const DEC_NGP = 27.12825 * DEG; // Dec of the North Galactic Pole
const L_NCP = 122.93192 * DEG; // Galactic longitude of the North Celestial Pole

export interface Equatorial {
  /** Right ascension in radians, range [0, 2π). */
  ra: number;
  /** Declination in radians, range [-π/2, π/2]. */
  dec: number;
}

export function galacticToEquatorial(
  lRad: number,
  bRad: number
): Equatorial {
  const sinB = Math.sin(bRad);
  const cosB = Math.cos(bRad);
  const dLon = L_NCP - lRad;
  const sinDLon = Math.sin(dLon);
  const cosDLon = Math.cos(dLon);

  const sinDec =
    Math.sin(DEC_NGP) * sinB + Math.cos(DEC_NGP) * cosB * cosDLon;
  const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));

  const y = cosB * sinDLon;
  const x =
    Math.cos(DEC_NGP) * sinB - Math.sin(DEC_NGP) * cosB * cosDLon;
  let ra = RA_NGP + Math.atan2(y, x);
  ra %= 2 * Math.PI;
  if (ra < 0) ra += 2 * Math.PI;

  return { ra, dec };
}
