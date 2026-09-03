export interface Horizontal {
  alt: number;
  az: number;
}

// Equatorial (RA, Dec) → horizontal (alt, az) for an observer at geodetic
// latitude latRad and local sidereal time lstRad. Azimuth is measured from
// North, clockwise through East (Az=0 → N, π/2 → E, π → S, 3π/2 → W).
export function equatorialToHorizontal(
  ra: number,
  dec: number,
  latRad: number,
  lstRad: number
): Horizontal {
  const h = lstRad - ra;
  const sinDec = Math.sin(dec);
  const cosDec = Math.cos(dec);
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const cosH = Math.cos(h);
  const sinH = Math.sin(h);

  const sinAlt = sinLat * sinDec + cosLat * cosDec * cosH;
  const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));

  const y = -cosDec * sinH;
  const x = sinDec * cosLat - cosDec * sinLat * cosH;
  let az = Math.atan2(y, x);
  if (az < 0) az += Math.PI * 2;
  return { alt, az };
}

// Horizontal (alt, az) → cartesian in the three.js scene frame.
// Convention: +Y = zenith, +X = East, -Z = North. Radius defaults to unit.
export function horizontalToVec3(
  alt: number,
  az: number,
  radius = 1
): { x: number; y: number; z: number } {
  const cosAlt = Math.cos(alt);
  return {
    x: radius * cosAlt * Math.sin(az),
    y: radius * Math.sin(alt),
    z: -radius * cosAlt * Math.cos(az),
  };
}
