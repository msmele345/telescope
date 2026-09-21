# Tickets: Telescope v2 — Lightweight Email-Code Auth

Replace the NextAuth/Google/magic-link stack with a hand-rolled email-code sign-in the project
owns outright, and make the sign-in, favorites, and profile phases work in Production for the
first time. Source spec: `plans/v2-lightweight-auth.md`.

Work the **frontier**: any ticket whose blockers are all done. Tickets 1 and 5 can both start
immediately.

Two of these — **Provision Resend and configure every environment** and **Verify sign-in,
favorites, and profile in Production** — are operator work, not agent work. They need account
access, a domain purchase, and eyes on the deployed app.

---

## Auth policy module

**What to build:** Every security-relevant decision in the new sign-in expressed as pure
functions over plain data, with no database, network, or wall clock anywhere in sight — code
generation, hashing, the code-attempt state machine, session validity and sliding, and request
rate limiting. Nothing user-facing ships here; this is the module the rest of the work plumbs
into, and proving it first is what de-risks everything after it. Model the tests on the
time-controller reducer tests: an explicit fixed clock value passed in, one assertion per
transition.

The five decisions the module owns:

- `generateCode()` — a uniformly distributed six-digit value from a cryptographic source.
- `hashToken(raw)` — SHA-256, used for both session tokens and login codes.
- `evaluateCodeAttempt(row, submitted, now)` → `ok` / `expired` / `wrong` (with attempts
  remaining) / `locked`.
- `evaluateSession(row, now)` → `{ valid, shouldSlide }`.
- `canRequestCode(recentRows, now)` → `allowed` / `cooldown` / `hourlyCap`.

Codes are **six-character strings with leading zeros preserved**, generated, stored, compared,
and returned as strings throughout. Treat one as a number anywhere in the chain and `004213`
becomes `4213`, which locks a user out of their own account for reasons that are very hard to
see in a log. Assert this directly rather than trusting it.

**Blocked by:** None — can start immediately.

- [x] Generated codes are six characters and all digits, across many generations.
- [x] A code beginning with a zero round-trips through generation, storage, and comparison with its leading zero intact.
- [x] A correct code inside its window verifies.
- [x] An expired code fails as *expired*, not as *wrong*.
- [x] A wrong code fails and reports the correct number of remaining attempts.
- [x] The fifth consecutive wrong attempt locks the code, and a subsequent *correct* submission of that same code is still rejected.
- [x] Boundary cases at exactly the expiry instant and exactly the attempt limit are asserted.
- [x] Sessions evaluate valid inside the window and invalid outside it; `shouldSlide` is true only once remaining lifetime drops below the refresh threshold.
- [x] A first code request is allowed; a second inside the cooldown is refused as `cooldown`; a sixth inside the hour is refused as `hourlyCap`; both release when their window passes.
- [x] Spent and expired rows still count toward the hourly cap — signing in successfully five times in an hour does not reset the limit.

---

## Email-code sign-in, end to end, in local dev

**What to build:** The tracer bullet, and the largest ticket here. A visitor who wants to save
something enters their email address, receives a six-digit code (written to the server log in
development — no mail service required), types or pastes it into the same tab they started in,
and is signed in for thirty days. The header shows which account they are signed in as. Signing
out ends the session on the server immediately, so it cannot be restored. Anonymous browsing is
untouched: the sky map, constellation pages, and the sky directory stay fully public and a
visitor who never signs in triggers no authentication query at all.

Everything the flow needs lands here: the schema change, both database wrappers, the two server
actions, the `@/auth` facade, and the split of the login page into a Server Component that
redirects already-signed-in visitors plus a client `LoginForm` that owns the two-step
interaction.

**Preserving the facade is the single largest cost lever in this change and is non-negotiable.**
`@/auth` keeps exporting `auth()` returning the same `{ user: { id, email, name } } | null` shape
the app already destructures, and `signOut()`. It gains a `Session` type of its own — the site
header and its test import `Session` from `next-auth` today and that import needs somewhere to
go. `signIn` cannot survive as one call because the flow is now two steps; it becomes
`requestCode(email)` and `verifyCode(email, code)`. The root layout, site header, profile page,
and both server-action modules should need no logic changes. **A diff that alters assertions in
unrelated tests is a signal the facade was not preserved.** Consider a first commit that
re-exports `Session` from the current auth module and switches those two imports — tiny, stays
green, and shrinks the cutover diff.

The session token is an opaque 256-bit random value from Web Crypto. It carries no claims, so
there is no signing secret to configure or rotate. The raw token goes to the browser in an
`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` cookie with a thirty-day max age; only its
SHA-256 hash is stored, so a database disclosure yields no usable session tokens.

Sessions slide: when `auth()` finds a valid session with under fifteen days left, it extends the
stored expiry. This collides with a Next.js constraint that must be designed around rather than
discovered — **a Server Component cannot set cookies**, and `auth()` is called from the root
layout. Extending the database row is always safe. Refreshing the cookie's max age goes inside a
guard that no-ops from a Server Component and succeeds from a Server Action or Route Handler. The
consequence is intended behaviour, not a bug: a user who only reads pages keeps a sliding
server-side session with a cookie on its original schedule, and any user who performs an action
refreshes both. Isolate every cookie read and write behind a single accessor — that is also what
makes the eventual Next 15 async-`cookies()` upgrade a one-function edit.

Sign-in rules the flow enforces: the email is trimmed and lowercased before any lookup, so
`Ada@Example.com ` reaches the same account as `ada@example.com`. Rate limits are one code per
sixty seconds and five per hour per address. The response is **identical whether or not the
address has an account** — "check your inbox" either way — so the form cannot be used to discover
who has registered. Codes expire after ten minutes, only one is outstanding per address at a
time, and a correct guess consumes the row so it can never verify again. **The user row is
created on successful verification, not at request time** — that keeps the users table free of
addresses typed once and abandoned, and it is what makes the identical-response property
meaningful.

One retention rule is load-bearing and easy to get wrong: **rows are kept for the full one-hour
rate-limit window regardless of expiry or use.** The hourly cap counts requests over the last
hour, but codes expire in ten minutes — delete rows on expiry or on successful sign-in and the
cap has at most ten minutes of history and never fires. Spent and expired rows stay as rate-limit
history with no verifying power. Cleanup runs opportunistically during the request-code path,
which avoids a scheduled job for a table holding a handful of rows, and deletes only rows older
than the rate-limit window.

The migration is additive, applied by the existing migration runner, leaving earlier migrations
untouched in history. It drops the accounts and verification-token tables (OAuth adapter
artifacts with no remaining consumer), replaces the sessions table with the new shape (hashed
token as primary key, user reference, expiry), and creates the login-codes table (normalised
email, hashed code, expiry, attempt count, consumed marker, creation timestamp, indexed by email
for the rate-limit lookup). The consumed marker and creation timestamp are what let one table
serve both roles — verifying the current code, and being the hour of request history the rate
limiter counts.

**Leave the users table exactly as it is.** Its identifier stays a serial integer. Every
application table — user settings, favorites, viewed constellations, read lessons — carries an
integer foreign key to it, and changing the identifier type would force edits across both
persistence modules, both action modules, and both existing migrations for no benefit at this
scale. The email column keeps its uniqueness constraint; that is what makes email the account
identity. The image column becomes vestigial without OAuth avatars and is left in place.

⚠️ **Production, Preview, and Development all point at the same Postgres instance, so running
the migration runner from a laptop *is* the production migration.** Confirm with the operator
before running it. It is safe to be blunt here only because the database is empty — zero users,
zero sessions, zero settings rows, nothing to preserve. The same invocation also picks up the
outstanding favorites/viewed/read migration, which was authored but never applied; until it runs,
favoriting a star fails at the query.

Test the login form the way the favorite-button test works today — mock the server-action module
at the boundary, render, drive with user-event, assert on accessible roles and names. Do **not**
test the session and login-code SQL wrappers: they hold no decisions once the policy module is
extracted, and the existing user-data and user-settings modules carry no tests for the same
reason. No dependency injection — nothing in this codebase uses it.

**Blocked by:** Auth policy module.

- [ ] A visitor can enter an email, read the code from the server log, and sign in — with no mail service, API key, or OAuth client configured anywhere.
- [ ] Signing in on an address that has never been seen creates the account implicitly; signing in again on the same address resolves to the same account and the same saved data.
- [ ] Email casing and stray whitespace are ignored when resolving the account.
- [ ] The response to a code request is identical whether or not the address has an account.
- [ ] No user row is created for an address that requests a code and never completes sign-in.
- [ ] The session survives a browser restart, and an active user's session extends as they keep using Telescope.
- [ ] Sign-out ends the session on the server; the cookie cannot be replayed afterwards.
- [ ] The session cookie is `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, thirty days.
- [ ] Only the hash of the session token and of the login code are stored — never the raw values.
- [ ] Requesting a new code invalidates the previous one: the earlier code no longer verifies, the later one does. The login-code wrapper marks any prior unspent row for the address as consumed (latest wins) — moved here from #1, since the policy module only ever sees one row.
- [ ] A failed verify is persisted whenever `evaluateCodeAttempt` returns `wrong` or `locked` with `countsAsAttempt: true`, so the fifth wrong guess actually locks the code.
- [ ] An expired session returns the visitor to sign-in rather than an error.
- [ ] The form advances to code entry showing the address it was sent to, and offers a way back to correct a mistyped address and a control to resend.
- [ ] Codes can be pasted as well as typed, including one with a leading zero.
- [ ] Each error state renders its own distinct human-readable message: invalid email, rate-limited (with the wait), wrong code (with attempts remaining), code expired, code locked out.
- [ ] The form is operable by keyboard alone and labelled for screen readers.
- [ ] The sky map, constellation pages, and sky directory remain fully public.
- [ ] Favoriting, marking viewed, marking read, the profile page, and the promotion of an anonymously-set zipcode to the account all keep working unchanged.
- [ ] Unauthenticated visitors still see a sign-in prompt where a save control would be.
- [ ] `next-auth`, `@auth/pg-adapter`, `nodemailer`, `@types/nodemailer`, the NextAuth module-augmentation type declaration, and the NextAuth route handler are all gone.
- [ ] No pre-release dependency remains anywhere in the authentication path.
- [ ] The whole authentication implementation is readable in one sitting, with no adapter contract to consult.
- [ ] The full existing test suite passes, with changes confined to import lines.
- [ ] The migration record shows both the outstanding data migration and the new auth migration applied; the favorites, viewed-constellations, and read-lessons tables exist.

---

## Return to where you were after signing in

**What to build:** A visitor who clicks "sign in to save this" from a constellation page is
currently deposited on the home page afterwards, having lost their place. Sign-in prompts pass
their current location along, and a successful verification returns the visitor there. The
prompts are the header sign-in link, the favorite button, the mark-viewed/read toggle, and the
profile page's redirect for unauthenticated visitors.

**Only relative, same-origin paths are accepted.** Anything absolute, protocol-relative, or
otherwise parsing as off-site is discarded in favour of the default destination. This is the
standard open-redirect defence and is required rather than optional: a login route that forwards
to an attacker-supplied URL *after* authenticating someone is a phishing primitive.

**Blocked by:** Email-code sign-in, end to end, in local dev.

- [x] Signing in from a constellation page, a star popup, or the profile redirect returns the visitor to where they were.
- [x] A relative destination is carried through the whole two-step flow, including across a resend.
- [x] An absolute or off-site destination is discarded in favour of the default, and cannot be used to forward a freshly authenticated visitor off-site.
- [x] Component tests cover both the carried-through and the discarded case.

---

## Send codes through Resend

**What to build:** The code arrives as a real email within seconds, unmistakably from Telescope,
stating how long it is valid so the recipient knows whether to hurry. Resend is provisioned
through the Vercel Marketplace integration, which injects its API key into Production and Preview
rather than needing manual per-environment configuration. Development is deliberately left out,
so a pull never switches local sign-in from the log to real mail.

The development fallback stays: with no API key present, the code is written to the server log,
so a fresh clone is productive immediately without provisioning a mail service.

Structure this so it is correct and testable **before the sending domain exists** — Resend's
default sender delivers only to the account owner's own address, which is enough to verify the
path end to end. Delivery to anyone else waits on the operator ticket.

**Blocked by:** Email-code sign-in, end to end, in local dev.

- [x] A requested code arrives by email within seconds, clearly identifiable as coming from Telescope.
- [x] The email states the code's validity window.
- [x] With no API key configured, the code still goes to the server log and local sign-in still works.
- [x] The Resend SDK is the only dependency added; no mail transport configuration is required for local development.

> **Moved to ticket 5:** provisioning the Resend Marketplace integration. The Marketplace product
> requires a domain you own at provisioning time (`-m domain=`), so it cannot precede the domain
> purchase. The code path was verified with a hand-made Resend key in `.env.local` instead.

---

## Provision Resend and configure every environment

**Operator work — not agent-grabbable.** Needs account access, a domain purchase, and DNS.

**What to build:** Sign-in email that reaches anyone, not just the project owner. Today the
Google client id, client secret, and auth secret exist only on a single stale preview branch,
which is why the deployed app renders "No auth providers are configured" — the deployment
environments need real configuration, and the dead secrets need removing.

A verified sending domain is a **prerequisite, not an implementation task**: Resend's default
sender delivers only to the account owner's address, and the project currently has no custom
domain. Purchasing one, attaching it to the Vercel project, and adding Resend's DNS verification
records are all operator actions.

**Blocked by:** None — can run in parallel with everything above.

- [ ] A custom domain is purchased, attached to the project, and verified with Resend's DNS records.
- [ ] The Resend Marketplace integration is provisioned for Production and Preview only — not Development, so local sign-in keeps logging codes: `vercel integration add resend/resend-email -e production -e preview --no-env-pull -m domain=<domain> -m region=us-east-1`. The product requires an owned domain at provisioning, so this follows the purchase. Confirm the injected name is exactly `RESEND_API_KEY` (no prefix).
- [ ] The sending address is set as `EMAIL_FROM` (e.g. `Telescope <signin@<domain>>`) for Production, Preview, and Development.
- [ ] The obsolete Google client id, client secret, auth secret, and SMTP settings are deleted from the preview environment, leaving no unused secrets behind.

---

## Verify sign-in, favorites, and profile in Production

**Operator work — not agent-grabbable.** Manual end-to-end verification, consistent with the
project's existing position on end-to-end auth flows.

**What to build:** Nothing. This is the demonstration that three shipped-but-inert phases —
sign-in, favorites, and the profile — finally work in Production, on a real email address that
is not the owner's, against the real sending domain.

**Blocked by:** Return to where you were after signing in; Send codes through Resend; Provision
Resend and configure every environment.

- [ ] A non-owner address receives a code in Production and completes sign-in.
- [ ] That account can favorite and unfavorite a star and a constellation, and the state survives a reload.
- [ ] That account can mark a constellation viewed and a lesson read.
- [ ] Signing in from a constellation page in Production returns the visitor to that page.
- [ ] The profile page shows the favorites, viewed constellations, and read lessons for that account.
- [ ] Signing out in Production ends the session, and the session cannot be restored afterwards.
