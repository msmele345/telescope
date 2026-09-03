import {
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
} from "@/lib/sky-math";
import type { ObserverLocation } from "@/lib/observer";
import type { ConstellationLines } from "./types";

const DEG = Math.PI / 180;

/**
 * Build a flat positions Float32Array suitable for THREE.LineSegments,
 * transforming each polyline vertex through the equatorial → horizontal
 * pipeline for the given observer/time. A polyline of N vertices yields
 * (N-1) line segments × 2 endpoints × 3 components.
 */
export function buildConstellationLineAttributes(
  lines: ConstellationLines,
  observer: ObserverLocation,
  when: Date,
  radius: number
): Float32Array {
  const latRad = observer.lat * DEG;
  const lngRad = observer.lng * DEG;
  const lst = localSiderealTime(when, lngRad);

  let segCount = 0;
  for (const polylines of Object.values(lines)) {
    for (const line of polylines) {
      if (line.length >= 2) segCount += line.length - 1;
    }
  }

  const positions = new Float32Array(segCount * 6);
  let p = 0;

  for (const polylines of Object.values(lines)) {
    for (const line of polylines) {
      if (line.length < 2) continue;
      let prev = projectVertex(line[0], latRad, lst, radius);
      for (let i = 1; i < line.length; i++) {
        const next = projectVertex(line[i], latRad, lst, radius);
        positions[p++] = prev.x;
        positions[p++] = prev.y;
        positions[p++] = prev.z;
        positions[p++] = next.x;
        positions[p++] = next.y;
        positions[p++] = next.z;
        prev = next;
      }
    }
  }

  return positions;
}

function projectVertex(
  vertex: readonly [number, number],
  latRad: number,
  lst: number,
  radius: number
) {
  const [ra, dec] = vertex;
  const { alt, az } = equatorialToHorizontal(ra, dec, latRad, lst);
  return horizontalToVec3(alt, az, radius);
}
