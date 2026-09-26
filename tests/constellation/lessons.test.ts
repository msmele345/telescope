import { readdirSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ComponentType } from "react";
import { getConstellationBySlug } from "@/lib/constellation";

// The test runner has no MDX loader, so the dynamic MDX import is stubbed at
// its boundary. Whether real MDX compiles is verified by `next build`.
vi.mock("@/lib/constellation/lessonModule", () => ({
  importLessonModule: vi.fn(),
}));

import { importLessonModule } from "@/lib/constellation/lessonModule";
import { hasLesson, loadLesson } from "@/lib/constellation/lessons";

const CONTENT_DIR = path.resolve(__dirname, "../../content/constellations");

const OrionLesson: ComponentType = () => null;

describe("constellation/lessons", () => {
  describe("the content folder", () => {
    // Reading the folder is fine in tests; the runtime never does this.
    const files = readdirSync(CONTENT_DIR);

    it("holds lessons", () => {
      expect(files.length).toBeGreaterThan(0);
    });

    it("names every file for a real constellation slug", () => {
      for (const file of files) {
        expect(file, `${file} is not an .mdx lesson`).toMatch(/\.mdx$/);
        const slug = file.replace(/\.mdx$/, "");
        expect(
          getConstellationBySlug(slug),
          `${file} is not named for a constellation slug`
        ).not.toBeNull();
      }
    });
  });

  describe("the lesson resolver", () => {
    beforeEach(() => {
      vi.mocked(importLessonModule).mockReset();
      vi.mocked(importLessonModule).mockImplementation(async (slug) => {
        if (slug === "orion") return { default: OrionLesson };
        throw new Error(`Cannot find module './${slug}.mdx'`);
      });
    });

    it("loads the lesson for a constellation whose import succeeds", async () => {
      expect(await loadLesson("orion")).toBe(OrionLesson);
      expect(await hasLesson("orion")).toBe(true);
    });

    it("reports no lesson for a constellation whose import fails", async () => {
      expect(await loadLesson("andromeda")).toBeNull();
      expect(await hasLesson("andromeda")).toBe(false);
    });

    it("reports no lesson for a slug that is not a constellation, without importing", async () => {
      for (const slug of ["not-a-real-thing", "", "../secrets"]) {
        expect(await loadLesson(slug)).toBeNull();
        expect(await hasLesson(slug)).toBe(false);
      }
      expect(importLessonModule).not.toHaveBeenCalled();
    });
  });
});
