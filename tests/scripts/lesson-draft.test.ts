import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getConstellationBySlug, isKnownAbbr } from "@/lib/constellation";
import { MESSIER_CATALOG, type MessierObject } from "@/lib/messier";
import type { Star } from "@/lib/star-catalog";
import {
  CLASSICAL_CONSTELLATIONS,
  STYLE_EXAMPLE_SLUGS,
  buildLessonFacts,
  buildLessonRequest,
  checkLessonDraft,
  formatLessonFacts,
} from "@/scripts/lib/lesson-draft.mjs";

describe("buildLessonFacts — story section", () => {
  it("lists Ptolemy's 48 as 50 IAU constellations", () => {
    expect(CLASSICAL_CONSTELLATIONS.size).toBe(50);
    for (const abbr of CLASSICAL_CONSTELLATIONS) expect(isKnownAbbr(abbr)).toBe(true);
  });

  it("gives a classical constellation Mythology and a modern one History", () => {
    expect(buildLessonFacts("Ori", [], []).storySection).toBe("Mythology");
    expect(buildLessonFacts("Tel", [], []).storySection).toBe("History");
  });

  it("gives all three pieces of Argo Navis Mythology", () => {
    for (const abbr of ["Car", "Pup", "Vel"]) {
      expect(buildLessonFacts(abbr, [], []).storySection).toBe("Mythology");
    }
  });

  it("does not count Crux or Coma Berenices as classical", () => {
    expect(buildLessonFacts("Cru", [], []).storySection).toBe("History");
    expect(buildLessonFacts("Com", [], []).storySection).toBe("History");
  });
});

let nextId = 1;
function star(fields: Partial<Star>): Star {
  return { id: nextId++, ra: 1.5, dec: 0.1, mag: 4, constellation: "Ori", ...fields };
}

function messierObject(fields: Partial<MessierObject>): MessierObject {
  return {
    m: 1, id: "M1", name: null, type: "nebula", ra: 1.5, dec: 0.1, mag: 8,
    constellation: "Ori", ...fields,
  };
}

describe("buildLessonFacts — members", () => {
  it("lists the brightest eight members, brightest first", () => {
    const members = [5.1, 0.5, 3.3, 2.2, 4.4, 1.1, 6.0, 2.9, 3.8, 0.1].map((mag) =>
      star({ mag })
    );
    const facts = buildLessonFacts("Ori", members, []);
    expect(facts.stars.map((s) => s.mag)).toEqual([0.1, 0.5, 1.1, 2.2, 2.9, 3.3, 3.8, 4.4]);
  });

  it("ignores stars from other constellations", () => {
    const facts = buildLessonFacts(
      "Ori",
      [star({ name: "Rigel", mag: 0.12 }), star({ name: "Sirius", mag: -1.46, constellation: "CMa" })],
      []
    );
    expect(facts.stars.map((s) => s.name)).toEqual(["Rigel"]);
  });

  it("names each star the way the star popup does", () => {
    const facts = buildLessonFacts(
      "Ori",
      [
        star({ id: 1713, name: "Rigel", bayer: "β", mag: 0.12, distLy: 860, colorK: 14000 }),
        star({ id: 1852, bayer: "η", mag: 3.36 }),
        star({ id: 1937, mag: 4.5 }),
      ],
      []
    );
    expect(facts.stars).toEqual([
      { designation: "Rigel", name: "Rigel", bayer: "β Orionis", mag: 0.12, distLy: 860, colorK: 14000 },
      { designation: "η Orionis", name: null, bayer: "η Orionis", mag: 3.36, distLy: null, colorK: null },
      { designation: "HR 1937", name: null, bayer: null, mag: 4.5, distLy: null, colorK: null },
    ]);
  });

  it("keeps fainter named members as other named stars", () => {
    const members = [1, 2, 3, 4, 5, 6, 7, 8].map((mag) => star({ mag }));
    members.push(star({ name: "Alcor", mag: 9.01 }), star({ mag: 9.5 }));
    const facts = buildLessonFacts("Ori", members, []);
    expect(facts.otherNamedStars.map((s) => s.name)).toEqual(["Alcor"]);
  });

  it("handles a constellation with no named stars", () => {
    const facts = buildLessonFacts("Cae", [star({ bayer: "α", mag: 4.45, constellation: "Cae" })], []);
    expect(facts.stars.map((s) => s.designation)).toEqual(["α Caeli"]);
    expect(facts.otherNamedStars).toEqual([]);
  });

  it("includes every Messier object in the constellation and none from its neighbours", () => {
    const facts = buildLessonFacts("Ori", [], [
      messierObject({ id: "M42", name: "Orion Nebula", mag: 4 }),
      messierObject({ id: "M43", name: "De Mairan's Nebula", mag: 9 }),
      messierObject({ id: "M1", name: "Crab Nebula", constellation: "Tau" }),
    ]);
    expect(facts.messier).toEqual([
      { id: "M42", name: "Orion Nebula", type: "nebula", mag: 4 },
      { id: "M43", name: "De Mairan's Nebula", type: "nebula", mag: 9 },
    ]);
  });

  it("handles a constellation with no Messier objects", () => {
    const facts = buildLessonFacts("Lib", [], [messierObject({ constellation: "Tau" })]);
    expect(facts.messier).toEqual([]);
  });
});

const CATALOG: Star[] = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "bsc5.json"), "utf8")
);

function catalogFacts(abbr: string) {
  return buildLessonFacts(abbr, CATALOG, MESSIER_CATALOG);
}

describe("buildLessonFacts — when and where to look", () => {
  it("favours the north for a northern constellation", () => {
    const facts = catalogFacts("UMa");
    expect(facts.hemisphere).toBe("northern");
    expect(facts.season?.northern).toBe("spring");
  });

  it("favours the south for a southern constellation", () => {
    const facts = catalogFacts("Cru");
    expect(facts.hemisphere).toBe("southern");
    expect(facts.season?.southern).toBe("autumn");
  });

  it("serves both hemispheres for an equatorial constellation", () => {
    const facts = catalogFacts("Ori");
    expect(facts.hemisphere).toBe("both");
    expect(facts.season).toEqual({ month: "January", northern: "winter", southern: "summer" });
  });

  it("averages right ascension around the circle for constellations straddling 0h", () => {
    expect(catalogFacts("And").season?.northern).toBe("autumn");
    expect(catalogFacts("Psc").season?.northern).toBe("autumn");
  });
});

const ORION_FACTS = buildLessonFacts(
  "Ori",
  [
    star({ name: "Rigel", bayer: "β", mag: 0.12, distLy: 860 }),
    star({ name: "Betelgeuse", bayer: "α", mag: 0.5, distLy: 640 }),
    star({ name: "Alnilam", bayer: "ε", mag: 1.7, distLy: 1342.2 }),
    star({ bayer: "η", mag: 3.36, distLy: 901 }),
  ],
  [messierObject({ id: "M42", name: "Orion Nebula", mag: 4 })]
);

const FILLER = Array.from(
  { length: 5 },
  (_, i) => `A line of ordinary prose about the sky, number ${"i".repeat(i + 1)}.`
).join("\n");

function draft({
  epithet = "## The Hunter",
  story = "## Mythology",
  notable = "## Notable stars",
  find = "## How to find it",
  notableBody = "- **Rigel** — a blue-white supergiant.\n- **Betelgeuse** — a red supergiant.",
  findBody = FILLER,
  order = ["epithet", "story", "notable", "find"],
}: Partial<Record<"epithet" | "story" | "notable" | "find" | "notableBody" | "findBody", string>> & {
  order?: string[];
} = {}) {
  const sections: Record<string, string> = {
    epithet: `${epithet}\n\n${FILLER}`,
    story: `${story}\n\n${FILLER}\n\n${FILLER}`,
    notable: `${notable}\n\n${notableBody}`,
    find: `${find}\n\n${findBody}`,
  };
  return order.map((k) => sections[k]).join("\n\n") + "\n";
}

describe("checkLessonDraft — structure", () => {
  it("passes a well-formed draft cleanly", () => {
    expect(checkLessonDraft(draft(), ORION_FACTS)).toEqual({
      verdict: "clean",
      rejections: [],
      flags: [],
    });
  });

  it("rejects frontmatter", () => {
    const result = checkLessonDraft(`---\ntitle: Orion\n---\n\n${draft()}`, ORION_FACTS);
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/frontmatter/i);
  });

  it("rejects a missing section", () => {
    const result = checkLessonDraft(draft({ order: ["epithet", "story", "find"] }), ORION_FACTS);
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/Notable stars/);
  });

  it("rejects a missing epithet", () => {
    const result = checkLessonDraft(draft({ order: ["story", "notable", "find"] }), ORION_FACTS);
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/epithet/i);
  });

  it("rejects sections out of order", () => {
    const result = checkLessonDraft(
      draft({ order: ["epithet", "notable", "story", "find"] }),
      ORION_FACTS
    );
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/order/i);
  });

  it("rejects History where the fact sheet calls for Mythology", () => {
    const result = checkLessonDraft(draft({ story: "## History" }), ORION_FACTS);
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/Mythology/);
  });

  it("accepts the 'Notable stars and objects' variant", () => {
    const result = checkLessonDraft(draft({ notable: "## Notable stars and objects" }), ORION_FACTS);
    expect(result.verdict).toBe("clean");
  });

  it("rejects anything before the first section: a preamble, a title or a code fence", () => {
    for (const before of ["Here is the lesson:", "# Orion", "```mdx"]) {
      const result = checkLessonDraft(`${before}\n\n${draft()}`, ORION_FACTS);
      expect(result.verdict).toBe("rejected");
      expect(result.rejections.join()).toMatch(/before the first section/i);
    }
  });

  it("rejects a code fence anywhere in the draft", () => {
    const result = checkLessonDraft(`${draft()}\n\`\`\`\n`, ORION_FACTS);
    expect(result.verdict).toBe("rejected");
    expect(result.rejections.join()).toMatch(/code fence/i);
  });

  it("reads every section heading regardless of case", () => {
    const result = checkLessonDraft(
      draft({ story: "## mythology", find: "## How To Find It" }),
      ORION_FACTS
    );
    expect(result.verdict).toBe("clean");
  });

  it("rejects a wildly short or wildly long draft", () => {
    const short = "## The Hunter\n\nx\n\n## Mythology\n\nx\n\n## Notable stars\n\nx\n\n## How to find it\n\nx\n";
    const long = draft({ findBody: Array(50).fill("More prose.").join("\n") });
    for (const mdx of [short, long]) {
      const result = checkLessonDraft(mdx, ORION_FACTS);
      expect(result.verdict).toBe("rejected");
      expect(result.rejections.join()).toMatch(/lines/);
    }
  });
});

function withProse(line: string) {
  return draft({ findBody: `${FILLER}\n${line}` });
}

describe("checkLessonDraft — facts", () => {
  it("does not flag a distance rounded the way the lessons round it", () => {
    for (const line of [
      "Rigel is about 860 light-years away.",
      "Alnilam lies some 1,300 light-years off.",
      "Betelgeuse, roughly 650 light years distant.",
    ]) {
      expect(checkLessonDraft(withProse(line), ORION_FACTS).flags).toEqual([]);
    }
  });

  it("flags a distance the fact sheet does not give", () => {
    const result = checkLessonDraft(withProse("Rigel is about 770 light-years away."), ORION_FACTS);
    expect(result.verdict).toBe("flagged");
    expect(result.flags).toEqual([expect.stringMatching(/770 light-years/)]);
  });

  it("holds a star's own bullet to that star's distance", () => {
    const result = checkLessonDraft(
      draft({ notableBody: "- **Rigel** — a supergiant about 640 light-years away." }),
      ORION_FACTS
    );
    expect(result.flags).toEqual([expect.stringMatching(/640 light-years.*Rigel/)]);
  });

  it("allows any listed distance in a bullet about an asterism", () => {
    const result = checkLessonDraft(
      draft({ notableBody: "- **The Belt** — its middle star lies about 1,340 light-years away." }),
      ORION_FACTS
    );
    expect(result.flags).toEqual([]);
  });

  it("does not flag a magnitude rounded to the precision it is quoted at", () => {
    for (const line of ["Rigel shines at magnitude 0.1.", "η Orionis is magnitude 3.36.", "M42 is about magnitude 4."]) {
      expect(checkLessonDraft(withProse(line), ORION_FACTS).flags).toEqual([]);
    }
  });

  it("flags a magnitude the fact sheet does not give", () => {
    const result = checkLessonDraft(withProse("Betelgeuse varies around magnitude 1.4."), ORION_FACTS);
    expect(result.verdict).toBe("flagged");
    expect(result.flags).toEqual([expect.stringMatching(/magnitude 1\.4/)]);
  });

  it("flags a notable star the fact sheet does not name", () => {
    const result = checkLessonDraft(
      draft({ notableBody: "- **Rigel** — blue-white.\n- **Meissa** — the hunter's head." }),
      ORION_FACTS
    );
    expect(result.verdict).toBe("flagged");
    expect(result.flags).toEqual([expect.stringMatching(/Meissa/)]);
  });

  it("accepts notable stars by proper name, Bayer letter or spelled-out Bayer name", () => {
    const notableBody = [
      "- **Rigel and Betelgeuse** — the two brightest.",
      "- **Eta Orionis** — a hot binary.",
      "- **η Orionis (Saiph's neighbour)** — the same star again.",
      "- **The Belt** — three stars in a row.",
      "- **The Orion Nebula** (M42) — a stellar nursery.",
    ].join("\n");
    expect(checkLessonDraft(draft({ notableBody }), ORION_FACTS).flags).toEqual([]);
  });

  it("holds a Messier object's own bullet to that object's magnitude", () => {
    const ok = checkLessonDraft(draft({ notableBody: "- **M42** — a nebula of magnitude 4." }), ORION_FACTS);
    const wrong = checkLessonDraft(
      draft({ notableBody: "- **Orion Nebula** — a nebula of magnitude 3.4." }),
      ORION_FACTS
    );
    expect(ok.flags).toEqual([]);
    expect(wrong.flags).toEqual([expect.stringMatching(/magnitude 3\.4.*Orion Nebula/)]);
  });

  it("catches distances and magnitudes however they are worded", () => {
    for (const [line, flagged] of [
      ["M42 lies 2.5 million light-years away.", /2\.5 million light-years/],
      ["A 770-light-year trip.", /770-light-year/],
      ["Rigel shines at magnitude +3.9.", /\+3\.9/],
      ["Its companions are magnitudes 0.12 and 8.8.", /8\.8/],
      ["A 3.9-magnitude star.", /3\.9-magnitude/],
    ] as const) {
      const result = checkLessonDraft(withProse(line), ORION_FACTS);
      expect(result.flags, line).toEqual([expect.stringMatching(flagged)]);
    }
  });

  it("reads Messier ids written out in full", () => {
    const result = checkLessonDraft(withProse("Nearby is Messier 78."), ORION_FACTS);
    expect(result.flags).toEqual([expect.stringMatching(/M78/)]);
  });

  it("does not mistake a spectral type for a Messier id", () => {
    for (const line of ["A red supergiant of spectral type M1.", "An M2 Iab supergiant.", "It is class M3 III."]) {
      expect(checkLessonDraft(withProse(line), ORION_FACTS).flags, line).toEqual([]);
    }
  });

  it("does not treat an asterism or an abbreviated name as an unknown star", () => {
    const notableBody = [
      "- **Orion's Belt** — three stars in a row.",
      "- **Sword of Orion** — hangs from the belt.",
      "- **Trapezium** — four young stars.",
      "- **Messier 42** — a stellar nursery.",
      "- **α Ori** — Betelgeuse by its Bayer letter.",
      "- **Eta Ori** — the same, spelled out.",
    ].join("\n");
    expect(checkLessonDraft(draft({ notableBody }), ORION_FACTS).flags).toEqual([]);
  });

  it("flags a notable star named after someone that the fact sheet lacks", () => {
    const result = checkLessonDraft(draft({ notableBody: "- **Barnard's Star** — nearby." }), ORION_FACTS);
    expect(result.flags).toEqual([expect.stringMatching(/Barnard's Star/)]);
  });

  it("flags a Messier object the fact sheet does not list", () => {
    const result = checkLessonDraft(withProse("Nearby is the nebula M78."), ORION_FACTS);
    expect(result.verdict).toBe("flagged");
    expect(result.flags).toEqual([expect.stringMatching(/M78/)]);
  });
});

// The calibration check on the rules themselves: a rule that flags a lesson
// written by hand is a wrong rule. Drafts merged later only have to pass the
// structure — their flags are for the reviewer, not the test suite.
const HANDWRITTEN_LESSONS = [
  "aquarius", "aries", "cancer", "capricornus", "gemini", "leo", "libra", "orion",
  "pisces", "sagittarius", "scorpius", "taurus", "ursa-major", "ursa-minor", "virgo",
];
const CONTENT_DIR = path.join(process.cwd(), "content", "constellations");

function checkLessonFile(slug: string) {
  const constellation = getConstellationBySlug(slug)!;
  const mdx = readFileSync(path.join(CONTENT_DIR, `${slug}.mdx`), "utf8");
  return checkLessonDraft(mdx, catalogFacts(constellation.abbr));
}

describe("checkLessonDraft — the lessons in the content folder", () => {
  it.each(HANDWRITTEN_LESSONS)("handwritten %s passes cleanly against its own fact sheet", (slug) => {
    expect(checkLessonFile(slug)).toEqual({ verdict: "clean", rejections: [], flags: [] });
  });

  const allLessons = readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.replace(/\.mdx$/, ""));

  it.each(allLessons)("%s has the lesson structure", (slug) => {
    expect(checkLessonFile(slug).rejections).toEqual([]);
  });
});

describe("formatLessonFacts", () => {
  it("renders every fact a draft may use, with numbers as the star popup shows them", () => {
    const text = formatLessonFacts(catalogFacts("Ori"));
    expect(text).toContain("Orion");
    expect(text).toContain("Orionis");
    expect(text).toMatch(/Mythology/);
    expect(text).toMatch(/Rigel.*β Orionis.*magnitude 0\.12.*860 ly/);
    expect(text).toMatch(/Alnilam.*1342 ly/);
    expect(text).toMatch(/M42.*Orion Nebula/);
    expect(text).toMatch(/January/);
    expect(text).toMatch(/winter/);
  });

  it("says so when there are no Messier objects", () => {
    expect(formatLessonFacts(catalogFacts("Lib"))).toMatch(/Messier objects: none/);
  });
});

describe("buildLessonRequest", () => {
  const examples = STYLE_EXAMPLE_SLUGS.map((slug) => ({
    slug,
    mdx: `## Example lesson for ${slug}\n\nStyle text unique to ${slug}.\n`,
  }));
  const orion = buildLessonRequest(catalogFacts("Ori"), examples);
  const lyra = buildLessonRequest(catalogFacts("Lyr"), examples);

  it("uses Orion, Ursa Minor and Libra as style examples", () => {
    expect(STYLE_EXAMPLE_SLUGS).toEqual(["orion", "ursa-minor", "libra"]);
  });

  it("uses the constellation's slug as the custom id", () => {
    expect(orion.custom_id).toBe("orion");
    expect(lyra.custom_id).toBe("lyra");
  });

  it("carries the fact sheet and all three style examples", () => {
    const text = JSON.stringify(lyra.params);
    expect(text).toContain(JSON.stringify(formatLessonFacts(catalogFacts("Lyr"))).slice(1, -1));
    for (const slug of STYLE_EXAMPLE_SLUGS) expect(text).toContain(`Style text unique to ${slug}.`);
  });

  it("names the constellation it asks for", () => {
    expect(JSON.stringify(lyra.params.messages)).toContain("Lyra");
  });

  it("shares a byte-identical prefix across constellations", () => {
    expect(JSON.stringify(orion.params.system)).toBe(JSON.stringify(lyra.params.system));
    expect(orion.params.messages).not.toEqual(lyra.params.messages);
  });

  it("asks Claude Opus 5 with adaptive thinking at medium effort", () => {
    expect(orion.params.model).toBe("claude-opus-5");
    expect(orion.params.thinking).toEqual({ type: "adaptive" });
    expect(orion.params.output_config).toEqual({ effort: "medium" });
  });
});
