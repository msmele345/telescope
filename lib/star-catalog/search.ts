import type { Star } from "./types";

export interface StarSearchOptions {
  /** Max results to return. Default 20. */
  limit?: number;
}

const DEFAULT_LIMIT = 20;

/**
 * Pure, catalog-driven star search for the accessibility directory.
 *
 * Matches on proper name, Bayer letter, constellation abbreviation, and the
 * HR catalog id ("HR 2061" or "2061"). Results are ranked by match quality
 * (exact name → name prefix → name substring → other-field hit) and, within a
 * rank, by apparent brightness so the most recognisable stars surface first.
 *
 * An empty/whitespace query returns no results — the caller decides what to
 * show in the idle state.
 */
export function searchStars(
  catalog: readonly Star[],
  query: string,
  opts: StarSearchOptions = {}
): Star[] {
  const limit = opts.limit ?? DEFAULT_LIMIT;
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: Array<{ star: Star; rank: number }> = [];
  for (const star of catalog) {
    const rank = rankStar(star, q);
    if (rank !== null) scored.push({ star, rank });
  }

  scored.sort(
    (a, b) => a.rank - b.rank || a.star.mag - b.star.mag || a.star.id - b.star.id
  );
  return scored.slice(0, limit).map((s) => s.star);
}

function rankStar(star: Star, q: string): number | null {
  const name = star.name?.toLowerCase();
  if (name) {
    if (name === q) return 0;
    if (name.startsWith(q)) return 1;
    if (name.includes(q)) return 2;
  }
  if (star.bayer && star.bayer.toLowerCase() === q) return 3;
  if (star.constellation && star.constellation.toLowerCase() === q) return 4;

  const idStr = String(star.id);
  if (idStr === q || `hr ${idStr}` === q || `hr${idStr}` === q) return 3;

  return null;
}
