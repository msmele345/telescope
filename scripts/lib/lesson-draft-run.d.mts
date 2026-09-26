import type { MessageBatchIndividualResponse } from "@anthropic-ai/sdk/resources/messages/batches";
import type { LessonFacts, LessonRequest } from "./lesson-draft.mjs";

/**
 * Every slug with no lesson file, in the order given — or just `only`. Throws
 * when `only` is not a constellation slug or already has a lesson.
 */
export declare function planDrafts(
  allSlugs: readonly string[],
  lessonSlugs: readonly string[],
  options?: { only?: string }
): string[];

export type DraftOutcome =
  | { slug: string; status: "accepted"; mdx: string; flags: string[] }
  | NotWritten;

/** A draft that was not written; rerunning the script retries it. */
export interface NotWritten {
  slug: string;
  status: "rejected" | "errored" | "expired" | "canceled";
  reasons: string[];
}

/**
 * What one batch result amounts to. Accepts the loosely typed objects the
 * tests build as well as the SDK's result type.
 */
export declare function readDraftResult(
  result: MessageBatchIndividualResponse | { custom_id: string; result: object },
  facts: LessonFacts
): DraftOutcome;

export interface WrittenDraft {
  slug: string;
  name: string;
  flags: string[];
}

export declare function renderReviewReport(
  drafts: readonly WrittenDraft[],
  notWritten?: readonly NotWritten[]
): string;

export declare function estimateInputTokens(requests: readonly LessonRequest[]): {
  /** Instructions and style examples, repeated in every request. */
  sharedPrefix: number;
  /** All requests, before any prompt-cache discount. */
  total: number;
};
