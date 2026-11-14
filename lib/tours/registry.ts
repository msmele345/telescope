import orionFixture from "@/content/tours/orion-fixture";
import type { Tour } from "./types";

/**
 * Every tour in `content/tours/`, one import per file. Adding a tour means
 * adding its file and one line here. The tour content test fails if a file
 * is missing from this list, or the list names a tour with no file.
 */
export const TOURS: readonly Tour[] = [orionFixture];

const BY_SLUG = new Map(TOURS.map((tour) => [tour.slug, tour]));

export function getTourBySlug(slug: string): Tour | null {
  return BY_SLUG.get(slug) ?? null;
}
