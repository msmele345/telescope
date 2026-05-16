import { promises as fs } from "node:fs";
import path from "node:path";
import type { Star } from "./types";

const CATALOG_PATH = path.join(process.cwd(), "public", "data", "bsc5.json");

let cachedCatalog: Star[] | null = null;
let cachedById: Map<number, Star> | null = null;

async function loadCatalog(): Promise<Star[]> {
  if (cachedCatalog) return cachedCatalog;
  const raw = await fs.readFile(CATALOG_PATH, "utf8");
  cachedCatalog = JSON.parse(raw) as Star[];
  cachedById = new Map(cachedCatalog.map((s) => [s.id, s]));
  return cachedCatalog;
}

export async function getStarsByIds(ids: readonly string[]): Promise<Star[]> {
  if (ids.length === 0) return [];
  await loadCatalog();
  const out: Star[] = [];
  for (const idStr of ids) {
    const id = Number(idStr);
    if (!Number.isFinite(id)) continue;
    const star = cachedById!.get(id);
    if (star) out.push(star);
  }
  return out;
}
