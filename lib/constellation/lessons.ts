import type { ComponentType } from "react";
import { getConstellationBySlug } from "./meta";
import { importLessonModule } from "./lessonModule";

/**
 * A constellation has a lesson exactly when its MDX file exists in
 * `content/constellations/`. A failed import means "no lesson".
 */
export async function loadLesson(slug: string): Promise<ComponentType | null> {
  // Only real constellation slugs reach the import.
  if (!getConstellationBySlug(slug)) return null;
  try {
    const mod = await importLessonModule(slug);
    return mod.default;
  } catch (err) {
    // Not-found is the ordinary "no lesson" case. Anything else is a fault
    // (e.g. a chunk missing from the deployed bundle) that would otherwise
    // silently turn a lesson into "coming soon".
    if (!isModuleNotFound(err)) {
      console.error(`Failed to load the lesson for "${slug}"`, err);
    }
    return null;
  }
}

export async function hasLesson(slug: string): Promise<boolean> {
  return (await loadLesson(slug)) !== null;
}

function isModuleNotFound(err: unknown): boolean {
  return (err as { code?: unknown } | null)?.code === "MODULE_NOT_FOUND";
}
