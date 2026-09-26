import type { ComponentType } from "react";

/**
 * The one place a lesson's MDX module is imported. The bundler compiles every
 * file in the content folder into the build ahead of time, so this resolves
 * against the bundle, never the filesystem — on Vercel the raw .mdx files are
 * not shipped. Rejects when no lesson exists for the slug.
 *
 * Kept apart from the resolver so tests (which have no MDX loader) can stub it.
 * The relative specifier is deliberate: webpack builds its context module from
 * the static prefix of the template.
 */
export function importLessonModule(
  slug: string
): Promise<{ default: ComponentType }> {
  return import(`../../content/constellations/${slug}.mdx`);
}
