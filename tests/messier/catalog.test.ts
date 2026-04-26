import { describe, expect, it } from "vitest";
import {
  MESSIER_CATALOG,
  getMessierById,
  buildMessierFieldAttributes,
} from "@/lib/messier";
import { isKnownAbbr } from "@/lib/constellation";

const MINNEAPOLIS = { lat: 44.9833, lng: -93.2706 };
const T0 = new Date("2026-01-01T03:00:00Z");
const RADIUS = 50;

describe("Messier catalog", () => {
  it("ships a curated subset (>=40 objects)", () => {
    expect(MESSIER_CATALOG.length).toBeGreaterThanOrEqual(40);
  });

  it("has unique M-numbers and ids", () => {
    const ms = new Set(MESSIER_CATALOG.map((o) => o.m));
    const ids = new Set(MESSIER_CATALOG.map((o) => o.id));
    expect(ms.size).toBe(MESSIER_CATALOG.length);
    expect(ids.size).toBe(MESSIER_CATALOG.length);
  });

  it("M-numbers are within [1, 110]", () => {
    for (const o of MESSIER_CATALOG) {
      expect(o.m).toBeGreaterThanOrEqual(1);
      expect(o.m).toBeLessThanOrEqual(110);
      expect(o.id).toBe(`M${o.m}`);
    }
  });

  it("RA in [0, 2π) and Dec in [-π/2, π/2]", () => {
    for (const o of MESSIER_CATALOG) {
      expect(o.ra).toBeGreaterThanOrEqual(0);
      expect(o.ra).toBeLessThan(2 * Math.PI + 1e-9);
      expect(o.dec).toBeGreaterThanOrEqual(-Math.PI / 2);
      expect(o.dec).toBeLessThanOrEqual(Math.PI / 2);
      expect(Number.isFinite(o.mag)).toBe(true);
    }
  });

  it("every constellation reference is a valid IAU abbreviation", () => {
    for (const o of MESSIER_CATALOG) {
      expect(isKnownAbbr(o.constellation)).toBe(true);
    }
  });

  it("famous objects are present", () => {
    expect(getMessierById("M31")?.name).toBe("Andromeda Galaxy");
    expect(getMessierById("M42")?.name).toBe("Orion Nebula");
    expect(getMessierById("M45")?.name).toBe("Pleiades");
    expect(getMessierById("M51")?.name).toBe("Whirlpool Galaxy");
    expect(getMessierById("M13")?.type).toBe("globular-cluster");
  });

  it("returns null for unknown ids", () => {
    expect(getMessierById("M999")).toBeNull();
    expect(getMessierById("nope")).toBeNull();
  });
});

describe("buildMessierFieldAttributes", () => {
  it("emits 3 floats per object position and a size attribute", () => {
    const attrs = buildMessierFieldAttributes(
      MESSIER_CATALOG,
      MINNEAPOLIS,
      T0,
      RADIUS
    );
    expect(attrs.positions.length).toBe(MESSIER_CATALOG.length * 3);
    expect(attrs.sizes.length).toBe(MESSIER_CATALOG.length);
  });

  it("places every object on the celestial sphere of given radius", () => {
    const { positions } = buildMessierFieldAttributes(
      MESSIER_CATALOG,
      MINNEAPOLIS,
      T0,
      RADIUS
    );
    for (let i = 0; i < positions.length; i += 3) {
      const r = Math.hypot(positions[i], positions[i + 1], positions[i + 2]);
      expect(r).toBeCloseTo(RADIUS, 3);
    }
  });

  it("size attribute floors at 3.5 and never exceeds 8.0", () => {
    const { sizes } = buildMessierFieldAttributes(
      MESSIER_CATALOG,
      MINNEAPOLIS,
      T0,
      RADIUS
    );
    for (const s of sizes) {
      expect(s).toBeGreaterThanOrEqual(3.5);
      expect(s).toBeLessThanOrEqual(8.0);
    }
  });
});
