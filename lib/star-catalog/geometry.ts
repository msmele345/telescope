import type { Star } from "./types";
import { celestialToVec3 } from "./coords";
import { magnitudeToBrightness, magnitudeToSize } from "./magnitude";
import {
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import type { ObserverLocation } from "@/lib/observer";

export interface StarFieldAttributes {
  positions: Float32Array;
  sizes: Float32Array;
  brightness: Float32Array;
}

const DEG = Math.PI / 180;

function magnitudeBrightness(mag: number): number {
  // Floor at 0.35 so faint stars (mag 5-7) remain visible. Pure Pogson
  // scaling drives them to ~0, which reads as black on screen.
  return Math.max(0.35, magnitudeToBrightness(mag, 1));
}

export function buildStarFieldAttributes(
  stars: Star[],
  radius: number
): StarFieldAttributes {
  const n = stars.length;
  const positions = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const brightness = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const v = celestialToVec3(s.ra, s.dec, radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    sizes[i] = magnitudeToSize(s.mag);
    brightness[i] = magnitudeBrightness(s.mag);
  }

  return { positions, sizes, brightness };
}

// Build point attributes in the local horizontal frame: +Y = zenith, +X = east,
// -Z = north. Stars below the horizon are still placed (negative Y) so the
// ground disk overlay hides them — no need to filter in the attribute buffer.
export function buildHorizonStarFieldAttributes(
  stars: Star[],
  observer: ObserverLocation,
  when: Date,
  radius: number
): StarFieldAttributes {
  const n = stars.length;
  const positions = new Float32Array(n * 3);
  const sizes = new Float32Array(n);
  const brightness = new Float32Array(n);

  const latRad = observer.lat * DEG;
  const lngRad = observer.lng * DEG;
  const lst = localSiderealTime(when, lngRad);

  for (let i = 0; i < n; i++) {
    const s = stars[i];
    const { alt, az } = equatorialToHorizontal(s.ra, s.dec, latRad, lst);
    const v = horizontalToVec3(alt, az, radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    sizes[i] = magnitudeToSize(s.mag);
    brightness[i] = magnitudeBrightness(s.mag);
  }

  return { positions, sizes, brightness };
}
