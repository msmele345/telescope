import { promises as fs } from "node:fs";
import path from "node:path";
import type { Star } from "@/lib/star-catalog/types";

const CATALOG_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "bsc5.json"
);

let cachedCatalog: Star[] | null = null;

async function loadCatalog(): Promise<Star[]> {
  if (cachedCatalog) return cachedCatalog;
  const raw = await fs.readFile(CATALOG_PATH, "utf8");
  cachedCatalog = JSON.parse(raw) as Star[];
  return cachedCatalog;
}

export interface ConstellationMembers {
  /** Total number of catalog stars assigned to the constellation. */
  count: number;
  /** Up to N brightest member stars, sorted brightest first. */
  brightest: Star[];
  /** Mean RA of all members in radians, or null if no members. */
  meanRA: number | null;
  /** Mean Dec of all members in radians, or null if no members. */
  meanDec: number | null;
}

/**
 * Server-only loader: reads the bundled BSC5 catalog and returns summary
 * data for the given IAU abbreviation.
 */
export async function getConstellationMembers(
  abbr: string,
  brightestLimit = 6
): Promise<ConstellationMembers> {
  const catalog = await loadCatalog();
  const members = catalog.filter((s) => s.constellation === abbr);

  if (members.length === 0) {
    return { count: 0, brightest: [], meanRA: null, meanDec: null };
  }

  const brightest = [...members]
    .sort((a, b) => a.mag - b.mag)
    .slice(0, brightestLimit);

  // RA wraps at 2π — average via unit-vector projection so stars near 0/2π
  // don't smear to the opposite side of the sky.
  let sumX = 0;
  let sumY = 0;
  let sumDec = 0;
  for (const s of members) {
    sumX += Math.cos(s.ra);
    sumY += Math.sin(s.ra);
    sumDec += s.dec;
  }
  const meanRA = (Math.atan2(sumY, sumX) + 2 * Math.PI) % (2 * Math.PI);
  const meanDec = sumDec / members.length;

  return { count: members.length, brightest, meanRA, meanDec };
}
