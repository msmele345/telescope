import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const STARS = [{ id: 1, ra: 0, dec: 0, mag: 1 }];
const LINES = { Ori: [] };

function respond(ok: boolean) {
  return vi.fn(async (url: string) =>
    ok
      ? { ok: true, status: 200, json: async () => (url.includes("bsc5") ? STARS : LINES) }
      : { ok: false, status: 500, statusText: "Server Error" }
  );
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("loadTourCatalogs", () => {
  it("fetches the stars and line figures once, however often it is asked", async () => {
    const fetch = respond(true);
    vi.stubGlobal("fetch", fetch);
    const { loadTourCatalogs } = await import("@/lib/tours/load-catalogs");
    const [a, b] = await Promise.all([loadTourCatalogs(), loadTourCatalogs()]);
    expect(a).toEqual({ stars: STARS, lines: LINES });
    expect(b).toBe(a);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on the next call after a failed fetch", async () => {
    vi.stubGlobal("fetch", respond(false));
    const { loadTourCatalogs } = await import("@/lib/tours/load-catalogs");
    await expect(loadTourCatalogs()).rejects.toThrow();
    vi.stubGlobal("fetch", respond(true));
    await expect(loadTourCatalogs()).resolves.toEqual({ stars: STARS, lines: LINES });
  });
});
