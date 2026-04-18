import type { Star } from "./types";

export const DEFAULT_CATALOG_URL = "/data/bsc5.json";

export async function loadCatalog(url: string = DEFAULT_CATALOG_URL): Promise<Star[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load catalog: ${res.status} ${res.statusText}`);
  return (await res.json()) as Star[];
}
