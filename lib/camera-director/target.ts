import type { ObserverLocation } from "@/lib/observer";
import {
  DEG,
  equatorialToHorizontal,
  horizontalToVec3,
  localSiderealTime,
  type Equatorial,
} from "@/lib/sky-math";
import { stopDirection, type StopRef, type TourCatalogs } from "@/lib/tours";
import type { CameraView, Vec3 } from "./interpolate";

/**
 * What the camera can be pointed at: a tour stop's object, or (for the dev
 * harness and anything else that needs it) a raw altitude/azimuth in degrees.
 */
export type CameraTarget =
  | StopRef
  | { kind: "horizontal"; alt: number; az: number; fov: number };

/** Star and Messier targets. */
export const POINT_FOV = 15;
/** A constellation is fitted to its outline within these bounds. */
export const CONSTELLATION_FOV_MIN = 30;
export const CONSTELLATION_FOV_MAX = 70;
/** Room left around a constellation's outermost vertex. */
const FIT_MARGIN = 1.2;
/** Keeps tan() finite for a figure that spans most of the sky. */
const MAX_FIT_HALF_ANGLE = 85 * DEG;

/** A celestial position's direction in the observer's sky at `when` (scene frame, unit). */
export function skyDirection(eq: Equatorial, observer: ObserverLocation, when: Date): Vec3 {
  const lst = localSiderealTime(when, observer.lng * DEG);
  const { alt, az } = equatorialToHorizontal(eq.ra, eq.dec, observer.lat * DEG, lst);
  return horizontalToVec3(alt, az);
}

function angularDistance(a: Equatorial, b: Equatorial): number {
  const cos =
    Math.sin(a.dec) * Math.sin(b.dec) +
    Math.cos(a.dec) * Math.cos(b.dec) * Math.cos(a.ra - b.ra);
  return Math.acos(Math.max(-1, Math.min(1, cos)));
}

/**
 * The vertical FOV that fits a figure of angular radius `radius` (from its
 * centre to its furthest vertex) across the narrower screen dimension.
 */
function fitFov(radius: number, aspect: number): number {
  const half = Math.min(radius * FIT_MARGIN, MAX_FIT_HALF_ANGLE);
  const vertical = 2 * Math.atan(Math.tan(half) / Math.min(aspect, 1)) / DEG;
  return Math.max(CONSTELLATION_FOV_MIN, Math.min(CONSTELLATION_FOV_MAX, vertical));
}

/** Catalogs that may still be loading. */
export interface LoadingCatalogs {
  stars: TourCatalogs["stars"] | null;
  lines: TourCatalogs["lines"] | null;
}

/**
 * Whether the catalog `target` is looked up in has arrived. Only stars and
 * constellations need a fetched catalog; Messier objects are built in.
 */
export function canResolveTarget(target: CameraTarget, catalogs: LoadingCatalogs): boolean {
  if (target.kind === "star") return catalogs.stars !== null;
  if (target.kind === "constellation") return catalogs.lines !== null;
  return true;
}

/**
 * The view that frames `target` for `observer` at `when`, or null when the
 * target's ID is not in its catalog. `aspect` is the canvas width / height.
 */
export function viewForTarget(
  target: CameraTarget,
  catalogs: TourCatalogs,
  observer: ObserverLocation,
  when: Date,
  aspect: number
): CameraView | null {
  if (target.kind === "horizontal") {
    return { direction: horizontalToVec3(target.alt * DEG, target.az * DEG), fov: target.fov };
  }
  const centre = stopDirection(target, catalogs);
  if (!centre) return null;
  const direction = skyDirection(centre, observer, when);
  if (target.kind !== "constellation") return { direction, fov: POINT_FOV };

  let radius = 0;
  for (const polyline of catalogs.lines[target.id] ?? []) {
    for (const [ra, dec] of polyline) {
      radius = Math.max(radius, angularDistance(centre, { ra, dec }));
    }
  }
  return { direction, fov: fitFov(radius, aspect) };
}
