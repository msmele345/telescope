import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetZipCacheForTests,
  loadZipDatabase,
  zipToLatLng,
} from "@/lib/zip-geocoder/loader";

const ROWS = [
  { zip: "55401", lat: 44.98, lng: -93.27, city: "Minneapolis", state: "MN" },
  { zip: "10001", lat: 40.75, lng: -73.99, city: "New York", state: "NY" },
];

function mockFetchOnce(rows: unknown, init: { ok?: boolean; status?: number } = {}) {
  const ok = init.ok ?? true;
  const status = init.status ?? 200;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify(rows), {
        status,
        headers: { "content-type": "application/json" },
      })
    )
  );
  // Force ok flag via Response constructor behavior
  if (!ok) {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response("error", { status, statusText: "Not Found" })
      )
    );
  }
}

describe("loadZipDatabase + zipToLatLng", () => {
  beforeEach(() => {
    __resetZipCacheForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    __resetZipCacheForTests();
  });

  it("loads and indexes rows by zip", async () => {
    mockFetchOnce(ROWS);
    const db = await loadZipDatabase();
    expect(db.size).toBe(2);
    expect(db.get("55401")?.city).toBe("Minneapolis");
  });

  it("resolves known zips through zipToLatLng", async () => {
    mockFetchOnce(ROWS);
    expect(await zipToLatLng("10001")).toMatchObject({ city: "New York" });
  });

  it("returns null for invalid or unknown zips", async () => {
    mockFetchOnce(ROWS);
    expect(await zipToLatLng("abc")).toBeNull();
    expect(await zipToLatLng("99999")).toBeNull();
  });

  it("caches the database across calls", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify(ROWS), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    await loadZipDatabase();
    await loadZipDatabase();
    await zipToLatLng("55401");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("clears the cache when the fetch fails, so a later call can retry", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("nope", { status: 500, statusText: "Server Error" }))
      .mockResolvedValueOnce(new Response(JSON.stringify(ROWS), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(loadZipDatabase()).rejects.toThrow(/Failed to load zipcode/);
    const db = await loadZipDatabase();
    expect(db.size).toBe(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
