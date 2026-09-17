## WHAT — Stack & Structure
- Project Name: Telescope
- Runtime: Node.js 22, npm 10.9.4
- Framework: Next.js 14.2
- DB: Postgres on Neon (via the Vercel Marketplace integration)
- Key dirs: src/app/ (routes), src/components/

# Project Overview and Plan:
See @docs/PRD.md to review project goals
See @plans/telescope-star-map.md for formal plan
See @plans/v2-lightweight-auth.md for the auth refactor. This work is active. 

# Run Commands:
- npm run dev 
- npm test 
- npm run build 
- npm run env:pull  # pulls the Development env into .env.local, then appends scripts/env-aliases.sh
  # NOTE: that file is currently comments only — it appends no aliases. This command
  # does NOT give you a database connection string (see "Local database" below).
  # A pull keeps any local var the target environment doesn't define, but silently
  # leaves it stale, and it strips comments from .env.local.
- npx vercel --yes # for deploying current branch to vercel preview

# Local database
The Neon integration's vars are marked **Sensitive** (write-only) and are attached only to
Preview and Production, so `npm run env:pull` can never supply them. Set the connection
string by hand, once, in `.env.local`:

- In the Neon dashboard, open the **`dev` branch** (not the production branch) and copy its
  **direct / non-pooled** connection string — the host without `-pooler` in it.
- Put it in `.env.local` as `POSTGRES_URL_NON_POOLING`. Keep it local; do not add it to Vercel.
- `lib/db.ts` and `scripts/db-migrate.mjs` both read
  `POSTGRES_URL_NON_POOLING → POSTGRES_URL → DATABASE_URL`, so this one var drives both the
  app and the migration runner. Setting no prefix is deliberate — a prefixed var would be
  ignored and leave you silently pointed at whatever was there before.

`npm run db:migrate` prints the host it is about to touch as its first line. Read it. It also
refuses to run against a database that holds another application's tables; override only with
`npm run db:migrate -- --shared-db` when that co-tenancy is known and intended.

## Cadences to follow:
1. TDD on any new feature code or bug fixes. Use Test Driven Development whenever possible. See the /tdd skill.
2. Red green refactor. Reference the tdd skill and follow it.
3. Always check off tracer bullet boxes in issues or tickets worked when finished to verify competion.

# Git Remote:
https://github.com/msmele345/telescope/

# Git Strategy and Instructions
- Create feature branches off of develop for each new feature or task. Name branches using the format `feat/short-description` (e.g., `feat/spotify-integration`).
- Git Strategy is Git Flow with the following branches:
  - `main` - production ready code
  - `develop` - latest development code, merged from feature branches
  - `feat/*` - individual feature branches created from develop, merged back into develop when complete
  - `release/*` - created from develop when preparing for a release, merged into main
- PRs should be used to merge feature branches into develop, and release branches into main. PRs should be reviewed and approved by me before merging.
- Use Squash and Merge for all PRs to keep a clean commit history.
- Commit messages should follow best practices and use the format: (feat:, chore:, fix:, docs:, refactor:) Examples: 
  - `feat: add new widget for genre breakdown`
  - `chore: minor tasks like updating dependencies or fixing typos`
  - `fix: resolve bug in Spotify API integration` 
  - `docs: update README with setup instructions`
  - `refactor: service layer redesign`