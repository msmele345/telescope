import type { Star } from "./types";
import { celestialToVec3 } from "./coords";
import { magnitudeToBrightness, magnitudeToSize } from "./magnitude";

export interface StarFieldAttributes {
  positions: Float32Array;
  sizes: Float32Array;
  brightness: Float32Array;
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
    // Floor at 0.35 so faint stars (mag 5-7) remain visible. Pure Pogson
    // scaling drives them to ~0, which reads as black on screen.
    brightness[i] = Math.max(0.35, magnitudeToBrightness(s.mag, 1));
  }

  return { positions, sizes, brightness };
}
