import { POINT_FOV, type CameraTarget } from "./target";

/**
 * The `/?lookAt=` camera harness runs in `next dev` and on Vercel preview
 * deploys (so the move can be checked by eye there), never in production.
 * Tickets 3 onwards drive the camera from the tour player; remove the
 * harness once that lands.
 *
 * Both values are inlined at build time.
 */
export const CAMERA_HARNESS_ENABLED =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

const ALT_AZ = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/;

/**
 * Read a `?lookAt=` value: `M42`, a BSC star ID like `7001`, an IAU
 * abbreviation like `Ori`, or `alt,az` in degrees. Anything else, including
 * `reset`, means no target (zoom back out).
 */
export function parseLookAt(value: string | null): CameraTarget | null {
  if (!value) return null;
  if (/^m\d+$/i.test(value)) return { kind: "messier", id: value.toUpperCase() };
  if (/^\d+$/.test(value)) return { kind: "star", id: Number(value) };
  if (/^[A-Z][A-Za-z]{2}$/.test(value)) return { kind: "constellation", id: value };
  const altAz = ALT_AZ.exec(value);
  if (altAz) {
    const alt = Number(altAz[1]);
    const az = Number(altAz[2]);
    if (Math.abs(alt) <= 90) return { kind: "horizontal", alt, az, fov: POINT_FOV };
  }
  return null;
}
