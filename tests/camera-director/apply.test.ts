import { describe, expect, it } from "vitest";
import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three-stdlib";
import {
  applyView,
  readView,
  stopMomentum,
  viewAt,
  type CameraView,
  type Vec3,
} from "@/lib/camera-director";
import { horizontalToVec3 } from "@/lib/sky-math";

const DEG = Math.PI / 180;

/** The canvas's initial camera: just off the origin, looking north and a little up. */
function makeRig() {
  const camera = new PerspectiveCamera(75, 16 / 9, 0.00001, 1000);
  camera.position.set(0, -0.00004, 0.0001);
  camera.lookAt(0, 0, 0);
  const controls = new OrbitControls(camera);
  controls.enableDamping = true; // drei's default
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.update();
  return { camera, controls };
}

function dir(altDeg: number, azDeg: number): Vec3 {
  return horizontalToVec3(altDeg * DEG, azDeg * DEG);
}

function angleBetween(a: Vec3, b: Vec3): number {
  const d = a.x * b.x + a.y * b.y + a.z * b.z;
  return Math.acos(Math.max(-1, Math.min(1, d)));
}

function isFiniteVec(v: Vec3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

/** Run a transition the way the canvas does: one frame every 1/60 s. */
function runTransition(rig: ReturnType<typeof makeRig>, to: CameraView) {
  const from = readView(rig.camera);
  stopMomentum(rig.controls);
  rig.controls.enabled = false;
  for (let ms = 0; ; ms += 1000 / 60) {
    const { view, done } = viewAt(from, to, ms, { reducedMotion: false });
    applyView(rig.camera, view);
    if (done) break;
  }
  rig.controls.enabled = true;
}

describe("applyView / readView", () => {
  it("points the camera along the view direction and sets its FOV", () => {
    const { camera } = makeRig();
    const target: CameraView = { direction: dir(40, 120), fov: 15 };
    applyView(camera, target);
    const world = camera.getWorldDirection(new Vector3());
    expect(angleBetween(world, target.direction)).toBeLessThan(1e-9);
    expect(camera.fov).toBe(15);
    expect(camera.projectionMatrix.elements[5]).toBeCloseTo(1 / Math.tan(7.5 * DEG), 6);
  });

  it("reads back the view it applied", () => {
    const { camera } = makeRig();
    const target: CameraView = { direction: dir(-5, 300), fov: 50 };
    applyView(camera, target);
    const back = readView(camera);
    expect(angleBetween(back.direction, target.direction)).toBeLessThan(1e-9);
    expect(back.fov).toBe(50);
  });

  it("keeps the camera's distance from the orbit centre", () => {
    const { camera } = makeRig();
    const before = camera.position.length();
    applyView(camera, { direction: dir(60, 45), fov: 15 });
    expect(camera.position.length()).toBeCloseTo(before, 15);
  });
});

describe("handing back to OrbitControls", () => {
  for (const [label, target] of [
    ["an ordinary target", { direction: dir(35, 200), fov: 15 }],
    ["a target within 1° of the zenith", { direction: dir(89.3, 180), fov: 15 }],
    ["a target within 1° of the zenith, the other side", { direction: dir(89.5, 37), fov: 15 }],
  ] as const) {
    it(`ends settled on ${label}`, () => {
      const rig = makeRig();
      runTransition(rig, target);
      for (let i = 0; i < 100; i++) rig.controls.update();
      const end = readView(rig.camera).direction;
      expect(isFiniteVec(end)).toBe(true);
      expect(angleBetween(end, target.direction)).toBeLessThan(1e-6);
    });

    it(`lets the controls turn the view after ${label}`, () => {
      const rig = makeRig();
      runTransition(rig, target);
      rig.controls.enableDamping = false;
      rig.controls.setAzimuthalAngle(rig.controls.getAzimuthalAngle() + 10 * DEG);
      const end = readView(rig.camera).direction;
      expect(isFiniteVec(end)).toBe(true);
      expect(angleBetween(end, target.direction)).toBeGreaterThan(1e-4);
    });
  }

  it("drops drag momentum left over from before the move", () => {
    const rig = makeRig();
    // A damped azimuth change leaves most of it pending, like a flick.
    rig.controls.setAzimuthalAngle(rig.controls.getAzimuthalAngle() + 30 * DEG);
    const target: CameraView = { direction: dir(45, 90), fov: 15 };
    runTransition(rig, target);
    for (let i = 0; i < 100; i++) rig.controls.update();
    expect(angleBetween(readView(rig.camera).direction, target.direction)).toBeLessThan(1e-6);
  });
});
