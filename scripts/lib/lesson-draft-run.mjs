// Pure helpers for one run of the lesson-drafting script: which constellations
// to draft, what each batch result amounts to, and the review report. No I/O —
// unit-testable. The drafting script supplies the filesystem and the API.

import { checkLessonDraft } from "./lesson-draft.mjs";

/**
 * The constellations to draft: every one with no lesson file. A lesson file
 * is never overwritten.
 */
export function planDrafts(allSlugs, lessonSlugs, { only } = {}) {
  const existing = new Set(lessonSlugs);
  if (only) {
    if (!allSlugs.includes(only)) {
      throw new Error(`"${only}" is not a constellation slug (e.g. "canis-major").`);
    }
    if (existing.has(only)) {
      throw new Error(`${only} already has a lesson; delete its file first to redraft it.`);
    }
    return [only];
  }
  return allSlugs.filter((slug) => !existing.has(slug));
}

// A response that stopped for one of these reasons is not a whole lesson, even
// when what arrived happens to pass the structural checks.
const INCOMPLETE = {
  max_tokens: "The response was cut off at the token limit.",
  refusal: "The model declined to write the lesson.",
};

/**
 * What one Message Batches result amounts to. A draft is accepted — to be
 * written — only when it arrived whole and passes the structural checks; its
 * fact flags travel with it into the review report.
 */
export function readDraftResult(result, facts) {
  const slug = result.custom_id;
  switch (result.result.type) {
    case "errored": {
      const { type, message } = result.result.error.error;
      return { slug, status: "errored", reasons: [`${type}: ${message}`] };
    }
    case "expired":
      return { slug, status: "expired", reasons: ["The batch ended before this request ran."] };
    case "canceled":
      return { slug, status: "canceled", reasons: ["The batch was canceled before this request ran."] };
    case "succeeded":
      break;
    default:
      return { slug, status: "errored", reasons: [`Unrecognised result type "${result.result.type}".`] };
  }

  const { message } = result.result;
  const incomplete = INCOMPLETE[message.stop_reason];
  if (incomplete) return { slug, status: "rejected", reasons: [incomplete] };

  const mdx = `${textOf(message).trim()}\n`;
  const check = checkLessonDraft(mdx, facts);
  if (check.verdict === "rejected") {
    return { slug, status: "rejected", reasons: check.rejections };
  }
  return { slug, status: "accepted", mdx, flags: check.flags };
}

// Adaptive thinking puts thinking blocks ahead of the text; only the text is
// the lesson.
function textOf(message) {
  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");
}

/**
 * The markdown review report: one entry per written draft with its flags.
 * Flagged drafts come first, most flags first, so reviewers start with the
 * riskiest lessons. Each entry is its own `##` section, so a review PR can
 * carry just the entries for its lessons. Drafts that were not written close
 * the report; rerunning the script retries exactly those.
 */
export function renderReviewReport(drafts, notWritten = []) {
  const ordered = [...drafts].sort(
    (a, b) => b.flags.length - a.flags.length || a.name.localeCompare(b.name)
  );
  const flagged = ordered.filter((d) => d.flags.length > 0).length;
  const lines = [
    "# Lesson draft review report",
    "",
    `${ordered.length} drafts: ${flagged} flagged, ${ordered.length - flagged} clean.`,
  ];
  for (const draft of ordered) {
    lines.push("", `## ${draft.name}`, "", `\`content/constellations/${draft.slug}.mdx\``, "");
    if (draft.flags.length === 0) lines.push("No flags.");
    else lines.push(...draft.flags.map((flag) => `- ${flag}`));
  }
  if (notWritten.length > 0) {
    lines.push("", "## Not written", "", "Rerun `npm run lessons:draft` to retry these.", "");
    for (const { slug, status, reasons } of notWritten) {
      lines.push(`- **${slug}** (${status}): ${reasons.join(" ")}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

// A rough offline rate for English prose and Markdown on current Claude
// tokenizers. The dry run makes no API call, so it cannot ask the token
// counting endpoint; this is an estimate, and is labelled as one.
const CHARS_PER_TOKEN = 3.5;

/**
 * An offline estimate of a batch's input tokens: the shared prefix
 * (instructions and style examples) that every request repeats, and the total
 * across all requests before any prompt-cache discount. Input only — thinking
 * and output are unknown until the model runs.
 */
export function estimateInputTokens(requests) {
  const tokens = (text) => Math.ceil(text.length / CHARS_PER_TOKEN);
  const sharedPrefix = requests.length > 0 ? tokens(systemText(requests[0])) : 0;
  const total = requests.reduce(
    (sum, r) => sum + tokens(systemText(r)) + tokens(r.params.messages.map((m) => m.content).join("")),
    0
  );
  return { sharedPrefix, total };
}

function systemText(request) {
  return request.params.system.map((block) => block.text).join("");
}
