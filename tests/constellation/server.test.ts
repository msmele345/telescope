import { describe, expect, it } from "vitest";
import { getConstellationMembers } from "@/lib/constellation/server";

describe("constellation/server.getConstellationMembers", () => {
  it("returns the brightest stars of Orion sorted by magnitude", async () => {
    const m = await getConstellationMembers("Ori", 3);
    expect(m.count).toBeGreaterThan(0);
    expect(m.brightest).toHaveLength(3);
    expect(m.brightest[0]?.name).toBe("Rigel");
    expect(m.brightest[1]?.name).toBe("Betelgeuse");
    // Magnitudes ascend (brighter → fainter).
    expect(m.brightest[0]!.mag).toBeLessThan(m.brightest[1]!.mag);
    expect(m.brightest[1]!.mag).toBeLessThan(m.brightest[2]!.mag);
  });

  it("computes mean RA/Dec inside reasonable bounds for Orion", async () => {
    const m = await getConstellationMembers("Ori");
    // Orion sits near RA 5h–6h (≈ 1.4 rad) and Dec near 0–10°.
    expect(m.meanRA).not.toBeNull();
    expect(m.meanDec).not.toBeNull();
    expect(m.meanRA!).toBeGreaterThan(1.0);
    expect(m.meanRA!).toBeLessThan(2.0);
    expect(m.meanDec!).toBeGreaterThan(-Math.PI / 6);
    expect(m.meanDec!).toBeLessThan(Math.PI / 6);
  });

  it("returns empty results for an unknown constellation abbreviation", async () => {
    const m = await getConstellationMembers("Zzz");
    expect(m.count).toBe(0);
    expect(m.brightest).toHaveLength(0);
    expect(m.meanRA).toBeNull();
    expect(m.meanDec).toBeNull();
  });
});
