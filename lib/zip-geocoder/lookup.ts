import type { ZipDatabase, ZipLocation } from "./types";
import { normalizeZip } from "./normalize";

// Pure lookup against a preloaded database. Extracted from the network-backed
// loader so tests don't need to stub fetch.
export function lookupZip(input: string, db: ZipDatabase): ZipLocation | null {
  const zip = normalizeZip(input);
  if (!zip) return null;
  return db.get(zip) ?? null;
}
