import type { ComponentType } from "react";
import { getConstellationBySlug } from "./meta";
import { importLessonModule } from "./lessonModule";

/**
 * Resolves a constellation's lesson. A constellation has a lesson exactly when
 * its MDX file exists in `content/constellations/` — there is no registry to
 * update. A failed import means "no lesson".
 *
 * Never checks the filesystem: at runtime the lesson files exist only as
 * modules compiled into the bundle.
 */
export async function loadLesson(slug: string): Promise<ComponentType | null> {
  // Only real constellation slugs reach the import.
  if (!getConstellationBySlug(slug)) return null;
  try {
    const mod = await importLessonModule(slug);
    return mod.default;
  } catch {
    return null;
  }
}

export async function hasLesson(slug: string): Promise<boolean> {
  return (await loadLesson(slug)) !== null;
}
