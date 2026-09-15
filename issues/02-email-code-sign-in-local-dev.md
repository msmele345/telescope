# Ticket 2: Email-code sign-in, end to end, in local dev

> Source spec: `plans/v2-lightweight-auth.md`

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

**Blocked by:** #1 Auth policy module.

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
