import andromedasNeighborhood from "@/content/tours/andromedas-neighborhood";
import arcToArcturus from "@/content/tours/arc-to-arcturus";
import summerTriangle from "@/content/tours/summer-triangle";
import winterHexagon from "@/content/tours/winter-hexagon";
import type { Tour } from "./types";

/**
 * Every tour in `content/tours/`, one import per file. Adding a tour means
 * adding its file and one line here. The tour content test fails if a file
 * is missing from this list, or the list names a tour with no file.
 */
export const TOURS: readonly Tour[] = [
  winterHexagon,
  arcToArcturus,
  summerTriangle,
  andromedasNeighborhood,
];

const BY_SLUG = new Map(TOURS.map((tour) => [tour.slug, tour]));

export function getTourBySlug(slug: string): Tour | null {
  return BY_SLUG.get(slug) ?? null;
}
