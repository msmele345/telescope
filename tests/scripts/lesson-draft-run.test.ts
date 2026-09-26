import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CONSTELLATIONS } from "@/lib/constellation";
import { MESSIER_CATALOG } from "@/lib/messier";
import type { Star } from "@/lib/star-catalog";
import { buildLessonFacts, buildLessonRequest } from "@/scripts/lib/lesson-draft.mjs";
import {
  estimateInputTokens,
  planDrafts,
  readDraftResult,
  renderReviewReport,
} from "@/scripts/lib/lesson-draft-run.mjs";

const ALL_SLUGS = CONSTELLATIONS.map((c) => c.slug);

describe("planDrafts", () => {
  it("drafts every constellation that has no lesson file, and none that do", () => {
    const planned = planDrafts(ALL_SLUGS, ["orion", "libra"]);
    expect(planned).toHaveLength(86);
    expect(planned).not.toContain("orion");
    expect(planned).not.toContain("libra");
    expect(planned).toContain("lyra");
  });

  it("drafts only the named constellation with --only", () => {
    expect(planDrafts(ALL_SLUGS, ["orion"], { only: "lyra" })).toEqual(["lyra"]);
  });

  it("refuses --only for a constellation that already has a lesson", () => {
    expect(() => planDrafts(ALL_SLUGS, ["orion"], { only: "orion" })).toThrow(
      /already has a lesson/
    );
  });

  it("refuses --only for a slug that is not a constellation", () => {
    expect(() => planDrafts(ALL_SLUGS, [], { only: "Lyra" })).toThrow(/not a constellation/);
  });
});

const CATALOG: Star[] = JSON.parse(
  readFileSync(path.join(process.cwd(), "public", "data", "bsc5.json"), "utf8")
);
const ORION_FACTS = buildLessonFacts("Ori", CATALOG, MESSIER_CATALOG);
// The handwritten Orion lesson passes cleanly against its own fact sheet, so it
// stands in for a good draft.
const GOOD_DRAFT = readFileSync(
  path.join(process.cwd(), "content", "constellations", "orion.mdx"),
  "utf8"
).trimEnd();

function succeeded(content: object[], stopReason = "end_turn") {
  return {
    custom_id: "orion",
    result: { type: "succeeded", message: { content, stop_reason: stopReason } },
  };
}

describe("readDraftResult", () => {
  it("accepts a well-formed draft, taking only its text and ending it with a newline", () => {
    const result = succeeded([
      { type: "thinking", thinking: "", signature: "sig" },
      { type: "text", text: GOOD_DRAFT },
    ]);
    expect(readDraftResult(result, ORION_FACTS)).toEqual({
      slug: "orion",
      status: "accepted",
      mdx: `${GOOD_DRAFT}\n`,
      flags: [],
    });
  });

  it("accepts a draft with an invented number, carrying its flag for the reviewer", () => {
    const invented = GOOD_DRAFT.replace("about 860 light-years", "about 2,000 light-years");
    const outcome = readDraftResult(succeeded([{ type: "text", text: invented }]), ORION_FACTS);
    expect(outcome).toMatchObject({
      status: "accepted",
      flags: [expect.stringMatching(/2,000 light-years.*Rigel/)],
    });
  });

  it("rejects a structurally broken draft, with the reasons, and offers nothing to write", () => {
    const result = succeeded([{ type: "text", text: `---\ntitle: Orion\n---\n${GOOD_DRAFT}` }]);
    const outcome = readDraftResult(result, ORION_FACTS);
    expect(outcome).toEqual({
      slug: "orion",
      status: "rejected",
      reasons: [expect.stringMatching(/frontmatter/)],
    });
  });

  it.each([
    ["max_tokens", /cut off/],
    ["refusal", /declined/],
  ])("rejects a response that stopped with %s, whatever its text", (stopReason, reason) => {
    const result = succeeded([{ type: "text", text: GOOD_DRAFT }], stopReason);
    const outcome = readDraftResult(result, ORION_FACTS);
    expect(outcome).toMatchObject({ status: "rejected", reasons: [expect.stringMatching(reason)] });
  });

  it("reports an errored request with the API's message", () => {
    const result = {
      custom_id: "lyra",
      result: {
        type: "errored",
        error: { type: "error", request_id: null, error: { type: "overloaded_error", message: "Overloaded" } },
      },
    };
    expect(readDraftResult(result, ORION_FACTS)).toEqual({
      slug: "lyra",
      status: "errored",
      reasons: ["overloaded_error: Overloaded"],
    });
  });

  it.each(["expired", "canceled"])("reports a %s request for retry", (type) => {
    const outcome = readDraftResult({ custom_id: "lyra", result: { type } }, ORION_FACTS);
    expect(outcome).toMatchObject({ slug: "lyra", status: type });
  });
});

describe("renderReviewReport", () => {
  const drafts = [
    { slug: "andromeda", name: "Andromeda", flags: [] },
    { slug: "lyra", name: "Lyra", flags: ['Distance "25 light-years" matches no distance in the fact sheet.'] },
    { slug: "cygnus", name: "Cygnus", flags: [] },
    { slug: "carina", name: "Carina", flags: ["Messier object M42 is not in the fact sheet.", "Second flag."] },
  ];

  it("lists every written draft, flagged drafts first, each with its flags", () => {
    const report = renderReviewReport(drafts, []);
    const order = ["Carina", "Lyra", "Andromeda", "Cygnus"].map((name) => report.indexOf(`## ${name}`));
    expect(order.every((at) => at >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(report).toContain("- Messier object M42 is not in the fact sheet.");
    expect(report).toContain("- Second flag.");
    expect(report).toContain('- Distance "25 light-years" matches no distance in the fact sheet.');
  });

  it("lists the drafts that were not written, for a retry run", () => {
    const report = renderReviewReport(drafts, [
      { slug: "vela", status: "rejected", reasons: ["Has frontmatter; lessons carry none."] },
      { slug: "pyxis", status: "expired", reasons: ["The batch ended before this request ran."] },
    ]);
    const retry = report.slice(report.indexOf("## Not written"));
    expect(retry).toMatch(/vela.*rejected.*Has frontmatter/);
    expect(retry).toMatch(/pyxis.*expired/);
  });

  it("has no retry section when everything was written", () => {
    expect(renderReviewReport(drafts, [])).not.toContain("Not written");
  });
});

describe("estimateInputTokens", () => {
  const examples = [{ slug: "orion", mdx: GOOD_DRAFT }];
  const request = (abbr: string) =>
    buildLessonRequest(buildLessonFacts(abbr, CATALOG, MESSIER_CATALOG), examples);

  it("counts the shared prefix in every request, plus each request's own fact sheet", () => {
    const one = estimateInputTokens([request("Ori")]);
    const two = estimateInputTokens([request("Ori"), request("Lyr")]);
    expect(one.sharedPrefix).toBeGreaterThan(500);
    expect(two.sharedPrefix).toBe(one.sharedPrefix);
    expect(one.total).toBeGreaterThan(one.sharedPrefix);
    expect(two.total).toBeGreaterThan(2 * two.sharedPrefix);
  });
});
