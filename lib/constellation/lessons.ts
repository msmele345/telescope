/**
 * Slugs of constellations with authored mythology/lesson MDX content.
 * Kept as a pure list so it can be imported without pulling in MDX modules
 * (which need a build-time MDX loader to compile).
 */
export const AUTHORED_SLUGS = [
  "aquarius",
  "aries",
  "cancer",
  "capricornus",
  "gemini",
  "leo",
  "libra",
  "orion",
  "pisces",
  "sagittarius",
  "scorpius",
  "taurus",
  "ursa-major",
  "ursa-minor",
  "virgo",
] as const;

export type AuthoredSlug = (typeof AUTHORED_SLUGS)[number];

const AUTHORED_SET = new Set<string>(AUTHORED_SLUGS);

export function hasLesson(slug: string): boolean {
  return AUTHORED_SET.has(slug);
}

export function authoredSlugs(): string[] {
  return [...AUTHORED_SLUGS];
}
