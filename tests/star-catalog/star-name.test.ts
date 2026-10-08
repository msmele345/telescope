import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { Star } from "@/lib/star-catalog/types";
// Build-time name-correction helper. Imported from the data-pipeline script
// directly — it is pure and framework-agnostic.
import { CURATED_NAMES, resolveStarName } from "@/scripts/lib/star-name.mjs";

describe("resolveStarName", () => {
  it("returns the curated name for a corrected HR number", () => {
    // The source catalog calls α² CVn "Chara"; it is Cor Caroli.
    expect(resolveStarName({ hr: 4915, commonName: "Chara" })).toBe("Cor Caroli");
    // ...and calls κ Her "Marfik"; that is λ Oph, and κ Her is Marsic.
    expect(resolveStarName({ hr: 6008, commonName: "Marfik" })).toBe("Marsic");
  });

  it("drops a name the source gives to the wrong star", () => {
    // HR 2948 is called "Markab", which belongs only to α Peg.
    expect(resolveStarName({ hr: 2948, commonName: "Markab" })).toBeNull();
  });

  it("looks the HR number up whether it arrives as a number or a string", () => {
    expect(resolveStarName({ hr: "4915", commonName: "Chara" })).toBe("Cor Caroli");
  });

  it("passes the source name through unchanged for every other star", () => {
    // The stars that really are Chara, Marfik and Markab keep their names.
    expect(resolveStarName({ hr: 4785, commonName: "Chara" })).toBe("Chara");
    expect(resolveStarName({ hr: 6149, commonName: "Marfik" })).toBe("Marfik");
    expect(resolveStarName({ hr: 8781, commonName: "Markab" })).toBe("Markab");
    expect(resolveStarName({ hr: 2491, commonName: "Sirius" })).toBe("Sirius");
  });

  it("returns null for a star with no name", () => {
    expect(resolveStarName({ hr: 1, commonName: "" })).toBeNull();
    expect(resolveStarName({ hr: 1, commonName: undefined })).toBeNull();
    expect(resolveStarName({ hr: 1, commonName: null })).toBeNull();
  });

  it("keeps the correction table to the HR numbers it is meant for", () => {
    expect(Object.keys(CURATED_NAMES).sort()).toEqual(["2948", "4915", "6008"]);
  });
});

// A guard over the committed catalog: the build is only as good as the data
// it was last run against, so check what actually ships.
describe("committed star catalog", () => {
  const stars: Star[] = JSON.parse(
    readFileSync(path.join(process.cwd(), "public", "data", "bsc5.json"), "utf8")
  );
  const byId = new Map(stars.map((s) => [s.id, s]));

  it("names α² CVn Cor Caroli and leaves β CVn as Chara", () => {
    expect(byId.get(4915)?.name).toBe("Cor Caroli");
    expect(byId.get(4785)?.name).toBe("Chara");
  });

  it("names κ Her Marsic and leaves λ Oph as Marfik", () => {
    expect(byId.get(6008)?.name).toBe("Marsic");
    expect(byId.get(6149)?.name).toBe("Marfik");
  });

  it("gives no name to HR 2948 and leaves α Peg as Markab", () => {
    expect(byId.get(2948)?.name).toBeUndefined();
    expect(byId.get(8781)?.name).toBe("Markab");
  });

  it("never gives one proper name to stars of different Bayer designations", () => {
    // Components of one multiple star (Mizar, Castor, Mintaka…) share a name and
    // a Bayer letter, so they pass. Al Thalimain is a traditional name that
    // genuinely covers both λ and ι Aquilae.
    const SHARED_ON_PURPOSE = new Set(["Al Thalimain"]);
    const stripSuperscript = (s: string) => s.replace(/[²³¹⁰-⁹]/g, "");

    const designationsByName = new Map<string, Set<string>>();
    for (const star of stars) {
      if (!star.name) continue;
      const designation = star.bayer
        ? `${stripSuperscript(star.bayer)} ${star.constellation ?? ""}`
        : "(no Bayer letter)";
      const seen = designationsByName.get(star.name) ?? new Set<string>();
      seen.add(designation);
      designationsByName.set(star.name, seen);
    }

    const offenders = [...designationsByName]
      .filter(([name, designations]) => designations.size > 1 && !SHARED_ON_PURPOSE.has(name))
      .map(([name, designations]) => `${name}: ${[...designations].join(" / ")}`);
    expect(offenders).toEqual([]);
  });
});
