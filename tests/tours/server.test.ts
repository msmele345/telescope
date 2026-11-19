import { describe, expect, it } from "vitest";
import { TOURS } from "@/lib/tours";
import { getToursForConstellation } from "@/lib/tours/server";

describe("getToursForConstellation", () => {
  it("finds the registered tours with a stop in a constellation", async () => {
    const visitsOrion = TOURS.filter((t) =>
      t.stops.some((s) => s.kind === "constellation" && s.id === "Ori")
    );
    expect(visitsOrion.length).toBeGreaterThan(0);
    const slugs = (await getToursForConstellation("Ori")).map((t) => t.slug);
    for (const t of visitsOrion) expect(slugs).toContain(t.slug);
  });

  it("finds nothing for a constellation no tour visits", async () => {
    // Crux never rises above 20° from the contiguous US, so no tour can stop there.
    expect(await getToursForConstellation("Cru")).toEqual([]);
  });
});
