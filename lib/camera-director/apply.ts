import type { PerspectiveCamera } from "three";
import type { OrbitControls } from "three-stdlib";
import type { CameraView } from "./interpolate";

/**
 * The camera's current view. OrbitControls orbits the origin, so the camera
 * looks from its position towards the origin.
 */
export function readView(camera: PerspectiveCamera): CameraView {
  const p = camera.position;
  const len = p.length();
  return { direction: { x: -p.x / len, y: -p.y / len, z: -p.z / len }, fov: camera.fov };
}

/**
 * Point the camera along `view.direction` with `view.fov`, the way
 * OrbitControls itself would place it: at the same small distance from the
 * origin, looking at it, up = zenith. Because the pose is built exactly as
 * `OrbitControls.update()` builds it, the controls take over without a jump.
 */
export function applyView(camera: PerspectiveCamera, view: CameraView): void {
  const distance = camera.position.length();
  const { x, y, z } = view.direction;
  camera.position.set(-x * distance, -y * distance, -z * distance);
  camera.lookAt(0, 0, 0);
  if (camera.fov !== view.fov) {
    camera.fov = view.fov;
    camera.updateProjectionMatrix();
  }
}

/**
 * Drop any drag momentum the controls are still easing out. With damping on,
 * OrbitControls keeps the unfinished part of a flick and keeps applying it,
 * which would pull the view off a target it has just settled on. Its pending
 * rotation is private, but an undamped update applies and clears it in one go.
 * The camera is moved by it, so read the start of a move before calling this.
 */
export function stopMomentum(controls: OrbitControls): void {
  const damping = controls.enableDamping;
  controls.enableDamping = false;
  controls.update();
  controls.enableDamping = damping;
}
