# Ticket 1: Discover lessons from the content folder

> Source spec: `plans/v2-lesson-drafts.md`

**What to build:** A constellation has a lesson exactly when its MDX file exists in the
constellation content folder. The two hand-maintained registries — the pure list of authored
slugs and the static map of MDX imports — are deleted. A single lesson resolver loads a lesson
by slug through a dynamic import; a failed import means "no lesson". Both the page body and the
page metadata ask that resolver. Nothing a visitor sees changes for any of the 88
constellations. This is the prefactor that makes every later draft PR pure content.

**Do not check the filesystem at runtime.** On Vercel the MDX files are compiled into the bundle
and are not shipped as raw files, so a file-existence check passes locally, in tests and in
`next build`, then reports "no lesson" for every constellation once deployed. That is why a
preview deploy is part of the acceptance criteria below.

The test runner has no MDX loader, so the resolver is tested with the MDX import mocked at the
boundary, the way component tests stub the auth module.

**Blocked by:** None — can start immediately.

- [x] The two lesson registries are gone; adding a lesson requires adding one file and nothing else.
- [x] No runtime code path reads the content folder from disk.
- [x] The 15 existing lessons render exactly as before, including page metadata and the mark-read control.
- [x] A constellation with no lesson file still shows the member-star fallback and the "coming soon" description.
- [x] Lessons test: every file in the content folder is named for a real constellation slug.
- [x] Resolver test (MDX import mocked): a slug whose import succeeds has a lesson; one whose import fails, and a non-constellation slug, do not.
- [x] The full existing test suite passes; `next build` succeeds.
- [ ] **Verified on a Vercel preview deploy:** a constellation with a lesson (e.g. Orion) renders it with the lesson description in its metadata, and one without (e.g. Andromeda) shows the fallback.
