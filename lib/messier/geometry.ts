import {
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import type { ObserverLocation } from "@/lib/observer";
import type { MessierObject } from "./types";

const DEG = Math.PI / 180;

export interface MessierFieldAttributes {
  positions: Float32Array;
  sizes: Float32Array;
}

/**
 * Build positions + sprite sizes for the Messier catalog in the local
 * horizontal frame. Sizes are crude (visually distinct from stars), not
 * proportional to angular extent.
 */
export function buildMessierFieldAttributes(
  catalog: ReadonlyArray<MessierObject>,
  observer: ObserverLocation,
  when: Date,
  radius: number
): MessierFieldAttributes {
  const n = catalog.length;
  const positions = new Float32Array(n * 3);
  const sizes = new Float32Array(n);

  const latRad = observer.lat * DEG;
  const lngRad = observer.lng * DEG;
  const lst = localSiderealTime(when, lngRad);

  for (let i = 0; i < n; i++) {
    const m = catalog[i];
    const { alt, az } = equatorialToHorizontal(m.ra, m.dec, latRad, lst);
    const v = horizontalToVec3(alt, az, radius);
    positions[i * 3] = v.x;
    positions[i * 3 + 1] = v.y;
    positions[i * 3 + 2] = v.z;
    // 8.0 is the largest sprite for the brightest M-objects (Pleiades,
    // Beehive, Andromeda); fainter ones shrink linearly down to 3.5.
    sizes[i] = Math.max(3.5, 8.0 - (m.mag - 1.6) * 0.45);
  }

  return { positions, sizes };
}
