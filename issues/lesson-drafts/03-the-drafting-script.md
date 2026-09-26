# Ticket 3: The drafting script

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** A manual `npm run lessons:draft` command, alongside the existing data-fetch
scripts and never part of the build or deploy. It drafts every constellation with no lesson file,
through the Message Batches API, and writes the drafts that pass the structural checks.

- Never overwrites an existing lesson file. `--only <slug>` drafts a single constellation.
- `--dry-run` builds and prints the requests and an estimated input-token count (stated as
  input only — thinking and output are unknown until the model runs), then exits without
  calling the API.
- Submits one batch, records its id in a gitignored state file, and polls until it ends.
  Rerunning while a batch is outstanding resumes it rather than submitting another.
- Matches results by custom id. Errored, expired and structurally rejected results are listed at
  the end so a rerun retries only those.
- Writes a markdown review report — one entry per written draft with its flags, flagged drafts
  first. The report is not committed.
- Reads `ANTHROPIC_API_KEY` from `.env.local` only. The Anthropic TypeScript SDK is a dev
  dependency; the app makes no model calls.

**Blocked by:** 1. Discover lessons from the content folder; 2. Pure lesson-draft module.

- [ ] `--dry-run` prints 73 requests and a token estimate and makes no API call.
- [ ] `--only <slug>` against a real key drafts one constellation end to end (a few cents), and the draft renders on its constellation page in local dev.
- [ ] Rerunning with a lesson file already present skips it; the 15 handwritten lessons are never touched.
- [ ] Interrupting and rerunning resumes the recorded batch instead of submitting a new one.
- [ ] Structurally rejected, errored and expired results are not written and are listed for retry.
- [ ] The review report lists each written draft with its flags, flagged drafts first.
- [ ] The state file and review report are gitignored; the API key appears in no Vercel environment.
- [ ] The script is not invoked by `build` or any deploy step.
