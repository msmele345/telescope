#!/usr/bin/env node
// Drafts a lesson for every constellation that has no lesson file, through the
// Message Batches API, and writes the drafts that pass the structural checks.
// A manual, one-off command: never part of the build or a deploy.
//
// Usage:
//   npm run lessons:draft                  draft every constellation with no lesson file
//   npm run lessons:draft -- --only lyra   draft one constellation (delete its file first)
//   npm run lessons:draft -- --dry-run     print the requests and an input-token estimate;
//                                          makes no API call
//
// Needs ANTHROPIC_API_KEY in .env.local, and only there — never in a Vercel
// environment. The dry run needs no key.
//
// The submitted batch's id is recorded in .cache/lesson-drafts/state.json
// (gitignored) before polling starts, so interrupting is safe: rerunning
// resumes that batch instead of submitting and paying for another. Drafts that
// were rejected, errored or expired are not written; since they still have no
// lesson file, a plain rerun retries exactly those.

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";
import { CONSTELLATIONS, getConstellationBySlug } from "../lib/constellation/meta.ts";
import { MESSIER_CATALOG } from "../lib/messier/catalog.ts";
import {
  STYLE_EXAMPLE_SLUGS,
  buildLessonFacts,
  buildLessonRequest,
  checkLessonDraft,
} from "./lib/lesson-draft.mjs";
import {
  estimateInputTokens,
  planDrafts,
  readDraftResult,
  renderReviewReport,
} from "./lib/lesson-draft-run.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content", "constellations");
const CATALOG_PATH = path.join(ROOT, "public", "data", "bsc5.json");
const ENV_PATH = path.join(ROOT, ".env.local");
const STATE_DIR = path.join(ROOT, ".cache", "lesson-drafts");
const STATE_PATH = path.join(STATE_DIR, "state.json");
const REPORT_PATH = path.join(STATE_DIR, "review-report.md");

const POLL_INTERVAL_MS = 60_000;
// Claude Opus 5 input at batch pricing, for the dry run's rough cost line.
const BATCH_INPUT_USD_PER_MTOK = 2.5;

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    only: { type: "string" },
  },
});

const stars = JSON.parse(await readFile(CATALOG_PATH, "utf8"));
const factsFor = (slug) =>
  buildLessonFacts(getConstellationBySlug(slug).abbr, stars, MESSIER_CATALOG);

async function dryRun() {
  if (state.batch) {
    console.log(
      `Note: batch ${state.batch.id} is outstanding. A real run would resume it, not submit these.\n`
    );
  }
  const requests = await plannedRequests();

  const { system, messages, ...settings } = requests[0].params;
  console.log("=== Settings, shared by every request ===");
  console.log(JSON.stringify(settings, null, 2));
  console.log("\n=== System prompt, shared by every request ===");
  console.log(system.map((block) => block.text).join("\n"));
  for (const request of requests) {
    console.log(`\n=== Request ${request.custom_id} ===`);
    console.log(request.params.messages.map((m) => m.content).join("\n"));
  }

  const estimate = estimateInputTokens(requests);
  const usd = (estimate.total / 1e6) * BATCH_INPUT_USD_PER_MTOK;
  console.log(`\n${requests.length} requests.`);
  console.log(
    `Estimated input: ~${estimate.total.toLocaleString("en-US")} tokens ` +
      `(a ~${estimate.sharedPrefix.toLocaleString("en-US")}-token shared prefix in each request, ` +
      `plus its fact sheet) — about $${usd.toFixed(2)} at the batch input rate, before any ` +
      `prompt-cache discount.`
  );
  console.log(
    "This is an offline estimate of input only. Thinking and output tokens are unknown until " +
      "the model runs."
  );
  console.log("Dry run: no API call made.");
}

async function submitAndCollect() {
  const requests = await plannedRequests();

  const client = createClient(await readApiKey());

  // A Ctrl-C after the batch is created but before its id is recorded would
  // mean paying for it again on the rerun, so an interrupt waits until then.
  let interrupted = false;
  const holdInterrupt = () => {
    interrupted = true;
    console.log("Recording the submitted batch before stopping…");
  };
  process.on("SIGINT", holdInterrupt);
  const batch = await client.messages.batches.create({ requests });
  state.batch = {
    id: batch.id,
    slugs: requests.map((r) => r.custom_id),
    submittedAt: new Date().toISOString(),
  };
  await writeState();
  process.off("SIGINT", holdInterrupt);

  console.log(`Submitted batch ${batch.id} with ${requests.length} requests.`);
  console.log("Interrupting is safe from here: rerun `npm run lessons:draft` to resume it.");
  if (interrupted) process.exit(130);
  await collectResults(client, batch.id);
}

// One request per constellation to draft. Exits when there is nothing to
// draft, or when --only names a constellation that cannot be drafted.
async function plannedRequests() {
  let slugs;
  try {
    slugs = planDrafts(CONSTELLATIONS.map((c) => c.slug), lessonSlugsOnDisk, { only: args.only });
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
  if (slugs.length === 0) {
    console.log("Nothing to draft: every constellation has a lesson.");
    process.exit(0);
  }
  const examples = await Promise.all(
    STYLE_EXAMPLE_SLUGS.map(async (slug) => ({ slug, mdx: await readLesson(slug) }))
  );
  return slugs.map((slug) => buildLessonRequest(factsFor(slug), examples));
}

// Polls until the batch ends, then writes what passed and reports the rest.
async function collectResults(client, batchId) {
  await waitForBatch(client, batchId);

  const notWritten = [];
  let written = 0;
  for await (const result of await client.messages.batches.results(batchId)) {
    const outcome = readDraftResult(result, factsFor(result.custom_id));
    if (outcome.status !== "accepted") {
      notWritten.push(outcome);
    } else if (await writeDraft(outcome)) {
      written++;
    }
  }

  // Every result is handled, so the batch is no longer outstanding.
  state.batch = null;
  await writeState();

  const drafts = await draftsOnDisk();
  await writeFile(REPORT_PATH, renderReviewReport(drafts, notWritten));

  const flagged = drafts.filter((d) => d.flags.length > 0).length;
  console.log(`\nWrote ${written} drafts.`);
  console.log(
    `Review report: ${path.relative(ROOT, REPORT_PATH)} ` +
      `(${drafts.length} drafts, ${flagged} flagged).`
  );
  if (notWritten.length > 0) {
    console.log(`\nNot written — rerun \`npm run lessons:draft\` to retry these:`);
    for (const { slug, status, reasons } of notWritten) {
      console.log(`  ${slug} (${status}): ${reasons.join(" ")}`);
    }
  }
}

async function waitForBatch(client, batchId) {
  for (;;) {
    let batch;
    try {
      batch = await client.messages.batches.retrieve(batchId);
    } catch (err) {
      if (err instanceof Anthropic.NotFoundError) {
        // Not cleared automatically: a key from another workspace also 404s,
        // and forgetting a live batch would mean paying for it twice.
        console.error(
          `Batch ${batchId} was not found with this API key. If it is truly gone, delete ` +
            `${path.relative(ROOT, STATE_PATH)} and rerun to submit a new batch.`
        );
        process.exit(1);
      }
      throw err;
    }
    const counts = batch.request_counts;
    console.log(
      `${new Date().toLocaleTimeString()} ${batch.processing_status}: ` +
        `${counts.processing} processing, ${counts.succeeded} succeeded, ` +
        `${counts.errored} errored, ${counts.expired} expired, ${counts.canceled} canceled`
    );
    if (batch.processing_status === "ended") return;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// Writes a draft unless a lesson file is already there. Returns whether it
// wrote. A file this script wrote on an earlier, interrupted pass over the
// same results is expected; any other file is a lesson written meanwhile, and
// is left alone.
async function writeDraft({ slug, mdx }) {
  try {
    await writeFile(lessonPath(slug), mdx, { flag: "wx" });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
    if (!state.drafted.includes(slug)) {
      console.log(`  ${slug}: a lesson file appeared meanwhile; left it untouched.`);
    }
    return false;
  }
  state.drafted.push(slug);
  await writeState();
  return true;
}

// Every draft this script has written that is still on disk, checked as it
// stands now, so the report covers earlier runs too and reflects hand edits.
async function draftsOnDisk() {
  const onDisk = new Set(await listLessonSlugs());
  return Promise.all(
    state.drafted
      .filter((slug) => onDisk.has(slug))
      .map(async (slug) => {
        const { flags } = checkLessonDraft(await readLesson(slug), factsFor(slug));
        return { slug, name: getConstellationBySlug(slug).name, flags };
      })
  );
}

// ---------------------------------------------------------------------------
// Files, state and credentials.

async function listLessonSlugs() {
  return (await readdir(CONTENT_DIR))
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => f.slice(0, -".mdx".length));
}

function lessonPath(slug) {
  return path.join(CONTENT_DIR, `${slug}.mdx`);
}

function readLesson(slug) {
  return readFile(lessonPath(slug), "utf8");
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return { batch: null, drafted: [] };
    throw err;
  }
}

async function writeState() {
  await mkdir(STATE_DIR, { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

// The key is read from .env.local only — not from the shell environment — so
// the dedicated, spend-limited key is the one that pays.
async function readApiKey() {
  let env = {};
  try {
    env = dotenv.parse(await readFile(ENV_PATH));
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
  if (!env.ANTHROPIC_API_KEY) {
    console.error(
      "No ANTHROPIC_API_KEY in .env.local. Create a dedicated key with a small spend limit in " +
        "the Anthropic Console, add it to .env.local (never to Vercel), and rerun."
    );
    process.exit(1);
  }
  return env.ANTHROPIC_API_KEY;
}

function createClient(apiKey) {
  // authToken: null stops the SDK picking up ANTHROPIC_AUTH_TOKEN from the shell.
  return new Anthropic({ apiKey, authToken: null });
}

// ---------------------------------------------------------------------------

const state = await readState();
const lessonSlugsOnDisk = await listLessonSlugs();

if (args["dry-run"]) {
  await dryRun();
} else if (state.batch) {
  if (args.only) console.log(`Ignoring --only ${args.only}: finishing the outstanding batch first.`);
  console.log(`Resuming batch ${state.batch.id} (${state.batch.slugs.length} requests).`);
  await collectResults(createClient(await readApiKey()), state.batch.id);
} else {
  await submitAndCollect();
}
