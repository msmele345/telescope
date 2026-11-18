import { describe, expect, it } from "vitest";
import {
  TRANSITION_MS,
  easeInOut,
  interpolateView,
  slerpDirection,
  viewAt,
  type CameraView,
  type Vec3,
} from "@/lib/camera-director";
import { horizontalToVec3 } from "@/lib/sky-math";

const DEG = Math.PI / 180;

function dir(altDeg: number, azDeg: number): Vec3 {
  return horizontalToVec3(altDeg * DEG, azDeg * DEG);
}

function angleBetween(a: Vec3, b: Vec3): number {
  const dot = a.x * b.x + a.y * b.y + a.z * b.z;
  return Math.acos(Math.max(-1, Math.min(1, dot)));
}

function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function isFiniteVec(v: Vec3): boolean {
  return Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
}

/** Azimuth on [0, 360) degrees, measured like sky-math: N=0, E=90. */
function azimuthDeg(v: Vec3): number {
  const az = Math.atan2(v.x, -v.z) / DEG;
  return (az + 360) % 360;
}

function wrappedDelta(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** The largest change in heading between consecutive 60 fps frames. */
function maxHeadingStepDeg(from: CameraView, to: CameraView): number {
  const frames = Math.round((TRANSITION_MS / 1000) * 60);
  let prev = azimuthDeg(from.direction);
  let max = 0;
  for (let i = 1; i <= frames; i++) {
    const az = azimuthDeg(interpolateView(from, to, i / frames).direction);
    max = Math.max(max, wrappedDelta(az, prev));
    prev = az;
  }
  return max;
}

describe("easeInOut", () => {
  it("starts at 0 and ends at 1", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it("is halfway at the midpoint and symmetric about it", () => {
    expect(easeInOut(0.5)).toBeCloseTo(0.5, 12);
    expect(easeInOut(0.2) + easeInOut(0.8)).toBeCloseTo(1, 12);
  });

  it("starts and ends slowly", () => {
    expect(easeInOut(0.1)).toBeLessThan(0.1);
    expect(easeInOut(0.9)).toBeGreaterThan(0.9);
  });

  it("clamps outside [0, 1]", () => {
    expect(easeInOut(-1)).toBe(0);
    expect(easeInOut(2)).toBe(1);
  });
});

describe("slerpDirection", () => {
  const east = { x: 1, y: 0, z: 0 };
  const zenith = { x: 0, y: 1, z: 0 };

  it("returns the endpoints exactly", () => {
    expect(slerpDirection(east, zenith, 0)).toEqual(east);
    expect(slerpDirection(east, zenith, 1)).toEqual(zenith);
  });

  it("moves along the shortest arc", () => {
    const mid = slerpDirection(east, zenith, 0.5);
    expect(mid.x).toBeCloseTo(Math.SQRT1_2, 12);
    expect(mid.y).toBeCloseTo(Math.SQRT1_2, 12);
    expect(mid.z).toBeCloseTo(0, 12);
  });

  it("takes the short way across the north point, not the long way round", () => {
    const a = dir(10, 350);
    const b = dir(10, 20);
    const mid = slerpDirection(a, b, 0.5);
    expect(angleBetween(a, mid)).toBeCloseTo(angleBetween(a, b) / 2, 10);
    expect(wrappedDelta(azimuthDeg(mid), 5)).toBeLessThan(0.5);
  });

  it("stays on the unit sphere", () => {
    for (const t of [0.1, 0.33, 0.5, 0.77, 0.9]) {
      expect(length(slerpDirection(dir(5, 30), dir(60, 200), t))).toBeCloseTo(1, 12);
    }
  });

  it("holds still when both directions are the same", () => {
    const a = dir(30, 120);
    const mid = slerpDirection(a, a, 0.5);
    expect(angleBetween(a, mid)).toBeLessThan(1e-9);
    expect(isFiniteVec(mid)).toBe(true);
  });

  it("stays finite between opposite directions", () => {
    const a = dir(0, 0);
    const b = dir(0, 180);
    const mid = slerpDirection(a, b, 0.5);
    expect(isFiniteVec(mid)).toBe(true);
    expect(length(mid)).toBeCloseTo(1, 12);
    expect(slerpDirection(a, b, 1)).toEqual(b);
  });
});

describe("interpolateView", () => {
  const from: CameraView = { direction: dir(20, 0), fov: 75 };
  const to: CameraView = { direction: dir(40, 90), fov: 15 };

  it("returns the endpoints exactly", () => {
    expect(interpolateView(from, to, 0)).toEqual(from);
    expect(interpolateView(from, to, 1)).toEqual(to);
  });

  it("eases the FOV: halfway at the midpoint, slow at the ends", () => {
    expect(interpolateView(from, to, 0.5).fov).toBeCloseTo(45, 10);
    const linearAtTenth = 75 - 0.1 * 60;
    expect(interpolateView(from, to, 0.1).fov).toBeGreaterThan(linearAtTenth);
  });

  it("eases the direction along the arc", () => {
    const total = angleBetween(from.direction, to.direction);
    const half = interpolateView(from, to, 0.5).direction;
    expect(angleBetween(from.direction, half)).toBeCloseTo(total / 2, 10);
    const tenth = interpolateView(from, to, 0.1).direction;
    expect(angleBetween(from.direction, tenth)).toBeLessThan(total * 0.1);
  });

  it("changes only the FOV on a zoom-out in place", () => {
    const zoomed: CameraView = { direction: dir(40, 90), fov: 15 };
    const reset: CameraView = { direction: dir(40, 90), fov: 75 };
    const mid = interpolateView(zoomed, reset, 0.5);
    expect(angleBetween(mid.direction, zoomed.direction)).toBeLessThan(1e-9);
    expect(mid.fov).toBeCloseTo(45, 10);
  });

  describe("near the zenith", () => {
    const defaultView: CameraView = { direction: dir(21.8, 0), fov: 75 };

    it("ends finite and exactly on a target within 1° of the zenith", () => {
      for (const az of [0, 90, 180, 270]) {
        const target: CameraView = { direction: dir(89.3, az), fov: 15 };
        const end = interpolateView(defaultView, target, 1);
        expect(isFiniteVec(end.direction)).toBe(true);
        expect(end).toEqual(target);
      }
    });

    it("stays finite and on the sphere all the way to the zenith itself", () => {
      const target: CameraView = { direction: { x: 0, y: 1, z: 0 }, fov: 15 };
      for (const t of [0.25, 0.5, 0.75, 0.99, 1]) {
        const v = interpolateView(defaultView, target, t).direction;
        expect(isFiniteVec(v)).toBe(true);
        expect(length(v)).toBeCloseTo(1, 12);
      }
    });

    it("does not whip the heading round on the way to a target behind the zenith", () => {
      const target: CameraView = { direction: dir(89.3, 180), fov: 15 };
      expect(maxHeadingStepDeg(defaultView, target)).toBeLessThan(8);
    });

    it("does not whip the heading round on a move that passes overhead", () => {
      const north: CameraView = { direction: dir(60, 0), fov: 50 };
      const south: CameraView = { direction: dir(60, 180), fov: 50 };
      expect(maxHeadingStepDeg(north, south)).toBeLessThan(8);
    });

    it("still takes the shortest arc for a move nowhere near the zenith", () => {
      const a: CameraView = { direction: dir(10, 350), fov: 75 };
      const b: CameraView = { direction: dir(30, 60), fov: 15 };
      const mid = interpolateView(a, b, 0.5).direction;
      const total = angleBetween(a.direction, b.direction);
      expect(angleBetween(a.direction, mid)).toBeCloseTo(total / 2, 10);
      expect(angleBetween(mid, b.direction)).toBeCloseTo(total / 2, 10);
    });
  });
});

describe("viewAt", () => {
  const from: CameraView = { direction: dir(20, 0), fov: 75 };
  const to: CameraView = { direction: dir(40, 90), fov: 15 };

  it("starts at the start view", () => {
    expect(viewAt(from, to, 0, { reducedMotion: false })).toEqual({ view: from, done: false });
  });

  it("is part way there mid-transition", () => {
    const { view, done } = viewAt(from, to, TRANSITION_MS / 2, { reducedMotion: false });
    expect(done).toBe(false);
    expect(view.fov).toBeCloseTo(45, 10);
  });

  it("lands exactly on the target when the time is up", () => {
    expect(viewAt(from, to, TRANSITION_MS, { reducedMotion: false })).toEqual({ view: to, done: true });
    expect(viewAt(from, to, TRANSITION_MS * 3, { reducedMotion: false })).toEqual({ view: to, done: true });
  });

  it("takes about 1.5 s", () => {
    expect(TRANSITION_MS).toBeGreaterThanOrEqual(1200);
    expect(TRANSITION_MS).toBeLessThanOrEqual(1800);
  });

  it("cuts straight to the target with reduced motion", () => {
    expect(viewAt(from, to, 0, { reducedMotion: true })).toEqual({ view: to, done: true });
  });
});
