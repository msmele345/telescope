import { describe, expect, it } from "vitest";
import {
  BASE_PICK_THRESHOLD,
  BASE_ROTATE_SPEED,
  RESET_FOV,
  pickThresholdForFov,
  rotateSpeedForFov,
} from "@/lib/camera-director";

const DEG = Math.PI / 180;
const SCREEN_HEIGHT_PX = 900;
const SPHERE_RADIUS = 50;

/** Screen pixels per radian of sky at the centre of a perspective view. */
function pxPerRadian(fov: number): number {
  return SCREEN_HEIGHT_PX / 2 / Math.tan((fov * DEG) / 2);
}

/**
 * How far the sky at the centre of the screen moves for a one-pixel drag.
 * OrbitControls turns a drag of d pixels into 2π·d/height·rotateSpeed radians.
 */
function skyShiftPerDragPx(fov: number): number {
  const radians = ((2 * Math.PI) / SCREEN_HEIGHT_PX) * Math.abs(rotateSpeedForFov(fov));
  return radians * pxPerRadian(fov);
}

/** The on-screen radius of the click target around a star. */
function pickRadiusPx(fov: number): number {
  return (pickThresholdForFov(fov) / SPHERE_RADIUS) * pxPerRadian(fov);
}

describe("rotateSpeedForFov", () => {
  it("keeps today's speed at the default 75°", () => {
    expect(rotateSpeedForFov(RESET_FOV)).toBeCloseTo(BASE_ROTATE_SPEED, 12);
    expect(BASE_ROTATE_SPEED).toBe(-0.4);
  });

  it("slows the drag when zoomed in, keeping its direction", () => {
    expect(Math.abs(rotateSpeedForFov(15))).toBeLessThan(Math.abs(rotateSpeedForFov(50)));
    expect(Math.abs(rotateSpeedForFov(50))).toBeLessThan(Math.abs(BASE_ROTATE_SPEED));
    expect(Math.sign(rotateSpeedForFov(15))).toBe(Math.sign(BASE_ROTATE_SPEED));
  });

  it("moves the sky the same distance on screen at 15° and 50° as at 75°", () => {
    const atDefault = skyShiftPerDragPx(75);
    expect(skyShiftPerDragPx(15)).toBeCloseTo(atDefault, 10);
    expect(skyShiftPerDragPx(50)).toBeCloseTo(atDefault, 10);
  });
});

describe("pickThresholdForFov", () => {
  it("keeps today's threshold at the default 75°", () => {
    expect(pickThresholdForFov(RESET_FOV)).toBeCloseTo(BASE_PICK_THRESHOLD, 12);
    expect(BASE_PICK_THRESHOLD).toBe(1.2);
  });

  it("keeps the click target the same size on screen at 15° and 50°", () => {
    const atDefault = pickRadiusPx(75);
    expect(pickRadiusPx(15)).toBeCloseTo(atDefault, 10);
    expect(pickRadiusPx(50)).toBeCloseTo(atDefault, 10);
  });

  it("at 15° is narrower than the gap between Pleiades stars", () => {
    // Alcyone and Atlas, two bright Pleiades, sit about 0.4° apart. At 15°
    // the old fixed threshold (about 1.4° of sky) would cover both.
    const thresholdDeg = (pickThresholdForFov(15) / SPHERE_RADIUS) / DEG;
    expect(thresholdDeg).toBeLessThan(0.3);
  });
});
