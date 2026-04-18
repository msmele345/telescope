import type { ZipDatabase, ZipLocation } from "./types";
import { lookupZip } from "./lookup";

export const DEFAULT_ZIPCODE_URL = "/data/zipcodes.json";

let cache: Promise<ZipDatabase> | null = null;

export function buildZipDatabase(rows: ZipLocation[]): ZipDatabase {
  return new Map(rows.map((r) => [r.zip, r]));
}

export async function loadZipDatabase(
  url: string = DEFAULT_ZIPCODE_URL
): Promise<ZipDatabase> {
  if (cache) return cache;
  cache = (async () => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Failed to load zipcode database: ${res.status} ${res.statusText}`
      );
    }
    const rows = (await res.json()) as ZipLocation[];
    return buildZipDatabase(rows);
  })();
  try {
    return await cache;
  } catch (err) {
    cache = null;
    throw err;
  }
}

export async function zipToLatLng(input: string): Promise<ZipLocation | null> {
  const db = await loadZipDatabase();
  return lookupZip(input, db);
}

export function __resetZipCacheForTests(): void {
  cache = null;
}
