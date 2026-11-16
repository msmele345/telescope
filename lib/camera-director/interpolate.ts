/**
 * Pure camera-transition maths: where the view points, and how wide it is,
 * at each moment of a move from one view to another.
 *
 * Directions are unit vectors in the scene's horizontal frame (sky-math's
 * convention: +Y = zenith, +X = east, -Z = north).
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Where the camera looks, and its vertical field of view in degrees. */
export interface CameraView {
  direction: Vec3;
  fov: number;
}

/** How long a move takes. */
export const TRANSITION_MS = 1500;

/**
 * Moves whose shortest arc comes within this angle of the zenith are
 * interpolated in altitude/azimuth instead. With the camera's up fixed at the
 * zenith, a great circle passing close overhead spins the heading through up
 * to 180° in a frame or two; stepping altitude and azimuth separately turns
 * it at an even rate.
 */
const ZENITH_GUARD_RAD = (10 * Math.PI) / 180;
const ARC_SAMPLES = 32;
/** Below this, a direction's azimuth is meaningless (it is the zenith). */
const POLE_EPS = 1e-9;

/** Sine ease-in-out on [0, 1], clamped outside it. */
export function easeInOut(t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  return (1 - Math.cos(Math.PI * t)) / 2;
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z);
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

/**
 * Spherical linear interpolation between two unit vectors, along the shorter
 * great-circle arc. Returns the endpoints exactly at s = 0 and s = 1. Opposite
 * directions have no unique shortest arc, so one through a fixed
 * perpendicular is used.
 */
export function slerpDirection(from: Vec3, to: Vec3, s: number): Vec3 {
  if (s <= 0) return from;
  if (s >= 1) return to;
  const cosTheta = Math.max(-1, Math.min(1, dot(from, to)));
  const theta = Math.acos(cosTheta);
  if (theta < 1e-12) return from;

  if (Math.PI - theta < 1e-9) {
    // Rotate `from` by s·π about any axis perpendicular to it.
    const helper = Math.abs(from.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const perp = normalize(cross(from, helper));
    const angle = Math.PI * s;
    const c = Math.cos(angle);
    const sn = Math.sin(angle);
    return normalize({
      x: from.x * c + perp.x * sn,
      y: from.y * c + perp.y * sn,
      z: from.z * c + perp.z * sn,
    });
  }

  const sinTheta = Math.sin(theta);
  const a = Math.sin((1 - s) * theta) / sinTheta;
  const b = Math.sin(s * theta) / sinTheta;
  return normalize({
    x: a * from.x + b * to.x,
    y: a * from.y + b * to.y,
    z: a * from.z + b * to.z,
  });
}

/** True when the shortest arc from `from` to `to` passes near the zenith. */
function arcPassesNearZenith(from: Vec3, to: Vec3): boolean {
  const minY = Math.cos(ZENITH_GUARD_RAD);
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    if (slerpDirection(from, to, i / ARC_SAMPLES).y > minY) return true;
  }
  return false;
}

function altitudeOf(v: Vec3): number {
  return Math.asin(Math.max(-1, Math.min(1, v.y)));
}

/** Azimuth from north through east, or null at the zenith/nadir. */
function azimuthOf(v: Vec3): number | null {
  if (Math.hypot(v.x, v.z) < POLE_EPS) return null;
  return Math.atan2(v.x, -v.z);
}

/** Step altitude and azimuth separately, turning the short way round. */
function altAzLerp(from: Vec3, to: Vec3, s: number): Vec3 {
  if (s <= 0) return from;
  if (s >= 1) return to;
  const fromAz = azimuthOf(from);
  const toAz = azimuthOf(to);
  const az0 = fromAz ?? toAz ?? 0;
  const az1 = toAz ?? az0;
  let dAz = az1 - az0;
  dAz = Math.atan2(Math.sin(dAz), Math.cos(dAz));
  const alt = altitudeOf(from) + (altitudeOf(to) - altitudeOf(from)) * s;
  const az = az0 + dAz * s;
  const cosAlt = Math.cos(alt);
  return {
    x: cosAlt * Math.sin(az),
    y: Math.sin(alt),
    z: -cosAlt * Math.cos(az),
  };
}

/**
 * The view at normalised time t ∈ [0, 1] of a move from `from` to `to`, with
 * ease-in-out applied to both direction and FOV. Exact at both ends.
 */
export function interpolateView(from: CameraView, to: CameraView, t: number): CameraView {
  if (t <= 0) return from;
  if (t >= 1) return to;
  const s = easeInOut(t);
  const direction = arcPassesNearZenith(from.direction, to.direction)
    ? altAzLerp(from.direction, to.direction, s)
    : slerpDirection(from.direction, to.direction, s);
  return { direction, fov: from.fov + (to.fov - from.fov) * s };
}

export interface ViewAtOptions {
  /** With `prefers-reduced-motion`, the move is a cut. */
  reducedMotion: boolean;
}

/** The view `elapsedMs` into a move, and whether the move has finished. */
export function viewAt(
  from: CameraView,
  to: CameraView,
  elapsedMs: number,
  { reducedMotion }: ViewAtOptions
): { view: CameraView; done: boolean } {
  if (reducedMotion || elapsedMs >= TRANSITION_MS) return { view: to, done: true };
  return { view: interpolateView(from, to, elapsedMs / TRANSITION_MS), done: false };
}
