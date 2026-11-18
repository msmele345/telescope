/**
 * How drag speed and click targets scale with the field of view.
 *
 * Both were tuned for the default 75° view. Zooming in magnifies the sky, so
 * left alone a drag would throw the sky across the screen and a click would
 * catch stars several neighbours away.
 */

const DEG = Math.PI / 180;

/** The default view, and the one a tour returns to. */
export const RESET_FOV = 75;
/** OrbitControls' rotate speed at 75° (negative: drag the sky, not the camera). */
export const BASE_ROTATE_SPEED = -0.4;
/** Points raycast threshold at 75°, in world units at the 50-unit sphere. */
export const BASE_PICK_THRESHOLD = 1.2;

/**
 * How much smaller one degree of sky is on screen at `fov` than at 75°,
 * measured at the centre of the view.
 *
 * The spec suggests `fov / 75`. That is a linear stand-in for this ratio and
 * is about 17% too fast at 15°; the tangent ratio is exact at screen centre,
 * which is what "the same distance on screen" asks for.
 */
function zoomFactor(fov: number): number {
  return Math.tan((fov * DEG) / 2) / Math.tan((RESET_FOV * DEG) / 2);
}

/** OrbitControls `rotateSpeed` that keeps a drag moving the sky as far on screen as at 75°. */
export function rotateSpeedForFov(fov: number): number {
  return BASE_ROTATE_SPEED * zoomFactor(fov);
}

/** Points raycast threshold that keeps the click target as big on screen as at 75°. */
export function pickThresholdForFov(fov: number): number {
  return BASE_PICK_THRESHOLD * zoomFactor(fov);
}
