import { describe, expect, it } from "vitest";
import { buildConstellationLineAttributes } from "@/lib/constellation";
import type { ConstellationLines } from "@/lib/constellation";

const MINNEAPOLIS = { lat: 44.9833, lng: -93.2706 };
const T0 = new Date("2026-01-01T03:00:00Z");
const RADIUS = 50;

const DEG = Math.PI / 180;

describe("buildConstellationLineAttributes", () => {
  it("returns an empty buffer for no lines", () => {
    const out = buildConstellationLineAttributes({}, MINNEAPOLIS, T0, RADIUS);
    expect(out).toBeInstanceOf(Float32Array);
    expect(out.length).toBe(0);
  });

  it("emits 6 floats per segment for a 2-vertex polyline", () => {
    const lines: ConstellationLines = {
      Ori: [[
        [80 * DEG, -1 * DEG],
        [85 * DEG, -2 * DEG],
      ]],
    };
    const out = buildConstellationLineAttributes(lines, MINNEAPOLIS, T0, RADIUS);
    expect(out.length).toBe(6);
  });

  it("expands polylines into N-1 segments × 6 floats", () => {
    const lines: ConstellationLines = {
      X: [[
        [0, 0],
        [10 * DEG, 5 * DEG],
        [20 * DEG, 10 * DEG],
        [30 * DEG, 15 * DEG],
      ]],
    };
    const out = buildConstellationLineAttributes(lines, MINNEAPOLIS, T0, RADIUS);
    // 4 vertices → 3 segments → 18 floats
    expect(out.length).toBe(18);
  });

  it("places vertices on the celestial sphere of the given radius", () => {
    const lines: ConstellationLines = {
      Ori: [[
        [80 * DEG, -1 * DEG],
        [85 * DEG, -2 * DEG],
      ]],
    };
    const out = buildConstellationLineAttributes(lines, MINNEAPOLIS, T0, RADIUS);
    for (let i = 0; i < out.length; i += 3) {
      const r = Math.hypot(out[i], out[i + 1], out[i + 2]);
      expect(r).toBeCloseTo(RADIUS, 3);
    }
  });

  it("aggregates segments across multiple constellations and polylines", () => {
    const lines: ConstellationLines = {
      A: [
        [[0, 0], [DEG, DEG]], // 1 seg
        [[2 * DEG, 0], [3 * DEG, DEG], [4 * DEG, 2 * DEG]], // 2 seg
      ],
      B: [[[10 * DEG, 0], [11 * DEG, 0]]], // 1 seg
    };
    const out = buildConstellationLineAttributes(lines, MINNEAPOLIS, T0, RADIUS);
    // 1+2+1 = 4 segments → 24 floats
    expect(out.length).toBe(24);
  });

  it("skips degenerate polylines with fewer than 2 vertices", () => {
    const lines: ConstellationLines = {
      A: [
        [[0, 0]] as unknown as ConstellationLines[string][number],
        [[DEG, DEG], [2 * DEG, DEG]],
      ],
    };
    const out = buildConstellationLineAttributes(lines, MINNEAPOLIS, T0, RADIUS);
    expect(out.length).toBe(6);
  });
});
