# Spec: Telescope v2 — Lightweight Email-Code Auth

> Supersedes the auth layer described in `./PRD.md` and Phase 7 of `./telescope-star-map.md`.
> Status: ready for implementation.

## Problem Statement

Telescope's sign-in is built on NextAuth v5 (beta) with a Postgres adapter, Google OAuth, and
nodemailer magic links. For an app whose entire authenticated surface is "remember my zipcode,
let me star a few constellations," this is disproportionate machinery: a pre-release dependency
pinned at beta, four adapter-owned tables, an OAuth client that must be registered and rotated
per environment, and an SMTP transport — all to answer one question, *is this the same person as
last time?*

Worse, it does not actually work. Sign-in has never functioned in Production: the Google client
id, client secret, and auth secret exist only on a single stale preview branch, so the deployed
app renders "No auth providers are configured." A companion problem compounds it — the migration
that creates the favorites, viewed-constellations, and read-lessons tables was authored but never
applied, so even a successfully signed-in user would hit missing relations the moment they
favorited a star. Three of the twelve shipped phases — sign-in,
favorites, and the profile — are inert in production.

The cost of the current approach is therefore paid entirely in maintenance and comprehension,
with no working feature to show for it. A developer returning to this codebase has to understand
an OAuth adapter contract before they can reason about who is signed in.

## Solution

Replace the entire auth stack with roughly two hundred lines of code that the project owns
outright.

A visitor who wants to save something enters their email address. Telescope emails them a
six-digit code. They type it into the same tab they started in, and they are signed in for thirty
days. There is no password to forget, no OAuth consent screen, no clickable link that a corporate
mail scanner can prefetch and burn, and no "I opened the email on my phone but I was signing in
on my laptop" dead end. Sign-out ends the session immediately and genuinely, on the server.

Anonymous browsing is untouched: the sky map, the constellation pages, and the accessibility
directory all remain fully public, and a visitor who never signs in never triggers a single
authentication query.

Behind the facade, the identity model collapses to two tables — one row per active session, and
one row per login code requested in the last hour — and every authentication decision (is this code still valid, has
this person guessed too many times, should this session's expiry slide forward) lives in a pure,
exhaustively tested module with no database in sight.

Because the whole point is a sign-in that actually works for real people, the spec also closes
the two gaps that make the current one unverifiable: the unapplied data migration, and the
absence of any auth configuration in the Production environment.

## User Stories

### Signing in

1. As a visitor, I want to browse the star map, constellation pages, and the searchable sky
   directory without signing in, so that I can evaluate Telescope before committing anything.
2. As a visitor, I want the option to sign in to be visible but never blocking, so that the sky
   remains the first thing I see.
3. As a visitor, I want to sign in with only my email address, so that I do not have to create or
   remember a password.
4. As a visitor, I want to sign in without connecting a Google account, so that I am not required
   to link a third-party identity to look at stars.
5. As a visitor, I want to receive a short numeric code rather than a clickable link, so that I
   can finish signing in on the device I started on.
6. As a visitor, I want to type the code into the same tab where I entered my email, so that the
   flow never breaks across devices or mail clients.
7. As a visitor, I want the code entry field to accept a paste of the code, so that I can copy it
   straight from my mail client.
8. As a visitor, I want the sign-in email to arrive within seconds and be unmistakably from
   Telescope, so that I do not mistake it for spam.
9. As a visitor, I want the code email to state how long the code is valid, so that I know
   whether to hurry.
10. As a visitor, I want to be told clearly when I have typed the code wrong, and how many
    attempts remain, so that I can correct a typo without starting over.
11. As a visitor, I want to be told when my code has expired and be offered a fresh one, so that
    a slow inbox does not strand me.
12. As a visitor, I want to go back and correct my email address if I mistyped it, so that I am
    not stuck waiting for mail that will never arrive.
13. As a visitor, I want to request a new code if the first never arrived, so that a transient
    delivery failure is recoverable.
14. As a first-time visitor, I want signing in to create my account implicitly, so that there is
    no separate registration step.
15. As a returning user, I want the same email address to resolve to the same account and the
    same saved data, so that my favorites persist across sign-ins.
16. As a returning user, I want capitalisation and stray whitespace in my email to be ignored, so
    that `Ada@Example.com ` reaches the same account as `ada@example.com`.
17. As a user, I want to land back on the page I was trying to use after signing in, so that
    signing in does not lose my place.

### Staying signed in, and leaving

18. As a signed-in user, I want to stay signed in across browser restarts for about a month, so
    that I am not re-authenticating every visit.
19. As an active signed-in user, I want my session to quietly extend as I keep using Telescope,
    so that regular use never logs me out.
20. As a signed-in user, I want a visible indication of which account I am signed in as, so that
    I can tell at a glance.
21. As a signed-in user, I want a sign-out control that takes effect immediately and on the
    server, so that the session cannot be reused afterwards.
22. As a user on a shared computer, I want signing out to genuinely end the session rather than
    merely hide it, so that the next person cannot restore it.
23. As a signed-in user, I want my session cookie to be inaccessible to page scripts and sent
    only over HTTPS, so that it cannot be stolen by injected script or network observation.
24. As a signed-in user whose session has expired, I want to be returned to sign-in rather than
    shown an error, so that the expiry feels routine.

### Protecting the account

25. As a user, I want a code to stop working the moment it has been used once, so that a code
    lingering in my inbox is not a standing key to my account.
26. As a user, I want codes to expire after a short window, so that an old email is not a
    liability.
27. As a user, I want repeated wrong guesses to invalidate the code, so that nobody can grind
    through the six-digit space against my account.
28. As a user, I want a limit on how often codes can be requested for my address, so that nobody
    can flood my inbox by entering my email repeatedly.
29. As a user, I want Telescope's response to be identical whether or not my email already has an
    account, so that the sign-in form cannot be used to discover who has registered.
30. As a user, I want a used or expired code to lose all power to sign anyone in the instant it
    is consumed or lapses, so that a code sitting in my inbox is inert.
31. As a user, I want requesting a new code to invalidate the previous one, so that only the most
    recent code I was sent can ever be used.
32. As the operator, I want no user rows created for email addresses that never complete
    sign-in, so that the users table reflects real people.

### Preserving what already works

33. As a signed-in user, I want to favorite and unfavorite stars and constellations, exactly as
    the current design promises, so that the auth change costs me no features.
34. As a signed-in user, I want to mark constellations as viewed and lessons as read, so that my
    history keeps accumulating.
35. As a signed-in user, I want my profile page to keep showing my favorites, viewed
    constellations, and read lessons, so that nothing I saved is orphaned.
36. As a signed-in user, I want the zipcode I set anonymously to be promoted to my account on
    first sign-in, so that my location survives the transition from anonymous to signed-in.
37. As an unauthenticated visitor, I want to see a sign-in prompt where a save control would be,
    rather than a broken or hidden control, so that I understand what signing in unlocks.
38. As the operator, I want the favorites, viewed, and read features to actually work in
    Production for the first time, so that the shipped phases stop being inert.

### Development and operations

39. As a developer, I want to read the entire authentication implementation in one sitting, so
    that I can reason about who is signed in without consulting an adapter contract.
40. As a developer, I want no pre-release dependency in the authentication path, so that a beta
    version bump cannot break sign-in.
41. As a developer, I want every authentication decision expressed as a pure function of its
    inputs, so that I can test the security-relevant logic without a database.
42. As a developer, I want to sign in locally without provisioning a mail service, so that a
    fresh clone is productive immediately.
43. As a developer, I want the existing test suite to keep passing with minimal edits, so that
    the swap is verifiably behaviour-preserving.
44. As the operator, I want sending domain and API credentials configured in every deployment
    environment, so that sign-in works in Production and not only in a single preview branch.
45. As the operator, I want the obsolete OAuth credentials removed from the preview environment,
    so that no unused secrets linger.

## Implementation Decisions

### Scope

This spec covers the authentication replacement only. Other v2 candidates are captured in
*Further Notes* as a backlog and are not specified here.

### Sign-in method

Email-only. Google OAuth is removed entirely, and with it the accounts table, the OAuth callback
route, the client-secret rotation burden, and the account-linking edge case that produces the
`OAuthAccountNotLinked` error the current login page has to handle.

The email carries a **six-digit numeric code**, not a magic link.

The code is a **six-character string with leading zeros preserved**, generated, stored, emailed,
and compared as a string throughout. This is stated explicitly because the obvious alternative
carries a classic defect: treat the code as a number anywhere in the chain and `004213` becomes
`4213`, which no longer matches what the user was sent and locks them out of their own account
for reasons that are very hard to see in a log.

Codes were chosen over links
for three reasons: link-prefetching by corporate mail scanners silently consumes single-use
tokens; a link opened on a phone lands the session on the wrong device; and a code needs no
public callback route, removing an attack surface rather than adding one.

### Authentication approach

Hand-rolled, following the well-established opaque-token session pattern. No authentication
library is introduced. The alternatives were considered and rejected: a different auth framework
would trade one dependency's weight for a comparable one, and a hosted provider would move user
identity out of the project's own Postgres and add a vendor to the request path — neither is
"lighter" in the sense the project means.

The session token is an **opaque 256-bit random value** generated with Web Crypto. Because it
carries no claims, **there is no signing secret to configure or rotate** — nothing is being
authenticated cryptographically, only looked up. The raw token goes to the browser in a cookie;
only its SHA-256 hash is stored server-side, so a database disclosure does not yield usable
session tokens.

Cookie attributes: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`, thirty-day `Max-Age`.

### The `@/auth` facade

The existing `@/auth` module is preserved as a facade so that its consumers change by an import
line at most. It continues to export:

- `auth()` — resolves the current request's session, returning the same
  `{ user: { id, email, name } } | null` shape the application already destructures.
- `signOut()` — deletes the session row and clears the cookie.
- A **`Session` type of its own**. This is a required addition: `SiteHeader` and its test
  currently import `Session` from `next-auth`, and that import must have somewhere to go.

`signIn` cannot survive as a single call, because the flow is now two steps. It is replaced by
two server actions, `requestCode(email)` and `verifyCode(email, code)`.

Preserving this facade is the single largest cost lever in the change and is treated as a
non-negotiable constraint: the root layout, the site header, the profile page, and both server-
action modules should require no logic changes.

### Session lifetime, and the Server Component cookie constraint

Sessions last thirty days and **slide**: when `auth()` finds a valid session with fewer than
fifteen days remaining, it extends the stored expiry.

This runs into a Next.js App Router constraint that must be designed around rather than
discovered: **a Server Component cannot set cookies**, and `auth()` is called from the root
layout, which is a Server Component. The resolution follows the pattern established by the Lucia
project:

- Extending the **database row's** expiry is always safe — database writes from a Server
  Component are permitted.
- Refreshing the **cookie's** `Max-Age` is attempted inside a guard that no-ops when called from
  a Server Component and succeeds when called from a Server Action or Route Handler.

The consequence is benign and should be understood as intended behaviour: a user who only ever
reads pages keeps a sliding server-side session but a cookie that expires on its original
schedule; any user who performs an action refreshes both. Cookie reads and writes are isolated
behind a single accessor so that this logic exists in exactly one place.

### Sign-in flow and abuse protection

Requesting a code:

1. The submitted email is normalised — trimmed and lowercased — before any lookup, so that
   address casing cannot fork an account.
2. Rate limits are evaluated against outstanding codes for that address: **at most one code per
   sixty seconds, and at most five per hour.**
3. A code is generated, and only its hash is stored, alongside the address, an expiry, and an
   attempt counter.
4. The response is **identical whether or not the address has an account** — "check your inbox"
   either way. The form must not reveal who has registered.

Verifying a code:

1. The submitted code is compared against the stored hash.
2. A wrong guess increments the attempt counter; after **five failures the code is invalidated**
   outright, which is what actually bounds the million-value keyspace.
3. A correct guess **consumes** the code — the row is marked spent, so it can never verify
   again — and a session is created.
4. **The user row is created here, on successful verification, not at request time.** This
   prevents the users table from filling with addresses that were typed once and abandoned, and
   it is what makes the identical-response property above meaningful.

Codes expire after **ten minutes**.

**Only one code is outstanding per address at a time.** Requesting a new code invalidates any
prior unspent code for that address — latest wins. This is what gives "resend" unambiguous
semantics: a user who requests a second code cannot then sign in with the first, and there is
never a set of simultaneously valid codes to reason about. It is also why the attempt evaluator
takes a single row.

**Rows are retained for the full one-hour rate-limit window, regardless of expiry or use.** This
is load-bearing and easy to get wrong: the hourly cap counts requests over the last hour, but
codes expire in ten minutes, so deleting rows on expiry or on successful sign-in would leave the
cap with at most ten minutes of history and it would never fire. Spent and expired rows are
therefore kept as rate-limit history and carry no verifying power. Cleanup — performed
opportunistically during the request-code path, which avoids a scheduled job for a table holding
a handful of rows — deletes only rows older than the rate-limit window.

### Pure policy module (new)

Every decision above is expressed as pure functions over plain data, in a new module with no
database dependency:

- `generateCode()` — a uniformly distributed six-digit value from a cryptographic source.
- `hashToken(raw)` — SHA-256, used for both session tokens and codes.
- `evaluateCodeAttempt(row, submitted, now)` — the core state machine, returning one of
  `ok` / `expired` / `wrong` (with attempts remaining) / `locked`.
- `evaluateSession(row, now)` — returns `{ valid, shouldSlide }`.
- `canRequestCode(recentRows, now)` — returns `allowed` / `cooldown` / `hourlyCap`.

The database layer becomes a thin translation between these functions and SQL, holding no
decisions of its own. This mirrors how `time-controller` separates its reducer from its
controller.

### Login UI

The login page is currently a Server Component with inline server actions, which makes it
untestable. It is **split**: the page stays a Server Component responsible for redirecting
already-signed-in visitors, and a new **client `LoginForm` component** owns the two-step
interaction — email entry, then code entry, with a path back to correct the address and a
control to resend. This extraction is deliberate and is what makes the second test seam
available.

Error states the form must express: invalid email, rate-limited (with the wait), wrong code
(with attempts remaining), code expired, and code locked out.

### Returning the user to where they were

Sign-in prompts currently link to a bare login route, so a visitor who clicks "sign in to save
favorites" from a constellation page is deposited on the home page afterwards, having lost their
place. Sign-in prompts pass their current location as a `returnTo` parameter, and a successful
verification redirects there.

**Only relative, same-origin paths are accepted.** Any value that is absolute, protocol-relative,
or otherwise parses as pointing off-site is discarded in favour of the default destination. This
is the standard open-redirect defence and is required rather than optional: a login route that
forwards to an attacker-supplied URL after authenticating is a phishing primitive.

### Email delivery

Resend, provisioned through the Vercel Marketplace integration, which injects its API key across
all environments rather than requiring manual per-environment configuration. `nodemailer` and
its type package are removed.

In development, when no API key is present, the code is written to the server log instead of
sent. A fresh clone is therefore immediately able to sign in without any mail configuration.

**A verified sending domain is a prerequisite, not an implementation task.** Resend's default
sender delivers only to the account owner's own address, and the project currently has no custom
domain. Purchasing a domain, attaching it to the Vercel project, and adding Resend's DNS
verification records are operator actions that must be completed for sign-in to work for anyone
other than the owner. The implementation should be structured so that it is correct and testable
before the domain exists.

### Schema changes

A new additive migration, applied by the existing migration runner. Earlier migrations are left
untouched in history.

- **Drop** the accounts and verification-token tables — both are OAuth/adapter artifacts with no
  remaining consumer.
- **Replace** the sessions table with the new shape: hashed token as primary key, user reference,
  and expiry. The adapter's session shape is not reused.
- **Create** the login-codes table: normalised email, hashed code, expiry, attempt count, a
  consumed marker, and a creation timestamp, indexed by email for the rate-limit lookup. The
  consumed marker and the creation timestamp are what let a single table serve both roles —
  verifying the current code, and acting as the hour of request history the rate limiter counts.
- **Leave the users table exactly as it is.** Its identifier remains a serial integer.

That last point is load-bearing. Every application table — user settings, favorites, viewed
constellations, read lessons — carries an integer foreign key to it. Changing the identifier type
would force edits across both persistence modules, both action modules, and both existing
migrations, for no benefit at this scale. The email column keeps its uniqueness constraint, which
is what makes email the account identity. The image column becomes vestigial without OAuth
avatars and is left in place rather than migrated away.

This is safe to do bluntly because **the database is empty**: zero users, zero sessions, zero
settings rows. There is nothing to preserve.

### Dependency changes

Removed: `next-auth`, `@auth/pg-adapter`, `nodemailer`, `@types/nodemailer`, and the NextAuth
module-augmentation type declaration. Added: the Resend SDK. Net effect is a reduction in both
dependency count and the amount of pre-release code in the request path.

### Ride-along fixes

Both are prerequisites for the spec's own acceptance criteria rather than scope creep — without
them, "sign in and favorite a star" cannot be demonstrated:

1. **Apply the outstanding data migration.** The favorites, viewed-constellations, and
   read-lessons tables do not exist in the database. Until they do, the features built in the
   favorites and profile phases fail at the query. This needs no separate step — the existing
   migration runner tracks what it has applied and will run the outstanding data migration and
   the new auth migration in order, in one invocation.
2. **Configure the Production environment.** Provision the Resend integration and set the sending
   address for Production, Preview, and Development. Separately, delete the stale Google client
   id, client secret, and auth secret that exist only on an old preview branch.

## Testing Decisions

### What makes a good test here

A good test states something a user could notice and would still hold after the implementation
was rewritten. For authentication that means asserting *"a code stops working after five wrong
guesses"* rather than *"the attempts column was incremented."* Tests that reach into how a value
was derived, rather than what the system decided, are the ones that break during refactors
without catching real defects — and the security-relevant behaviour here is precisely the kind
that must survive refactoring.

### Seams

Deliberately two, one of them already established. The codebase has a firm and consistent
convention — pure logic is tested exhaustively, database wrappers are not tested at all — and
this spec follows it rather than introducing a competing one.

**Seam 1 — the pure policy module (new).** Every security-relevant decision is reachable here
without a database, a network, or a clock. Coverage:

- Generated codes are six characters long and consist only of digits, across many generations.
- A code whose value begins with a zero round-trips through generation, storage, and comparison
  without losing its leading zero — the numeric-coercion defect named above, asserted directly.
- A correct code within its window verifies.
- A newly requested code invalidates the previous one: the earlier code no longer verifies, the
  later one does.
- An expired code fails, and fails as *expired* rather than as *wrong*.
- A wrong code fails and reports the correct number of remaining attempts.
- The fifth consecutive wrong attempt locks the code, and a subsequent *correct* submission of
  that same code is still rejected.
- Boundary conditions at exactly the expiry instant and exactly the attempt limit.
- Session evaluation: valid inside the window, invalid outside it, and `shouldSlide` true only
  once the remaining lifetime crosses below the refresh threshold.
- Rate limiting: a first request is allowed; a second within the cooldown is refused as
  `cooldown`; a sixth within the hour is refused as `hourlyCap`; and both limits release once the
  relevant window has passed.
- Spent and expired rows still count toward the hourly cap. This is the retention decision made
  observable: signing in successfully five times in an hour must not reset the limit, and a test
  that only ever exercises unspent rows would pass while the real cap silently never fired.

**Seam 2 — the login form (existing pattern).** Component tests that mock the server actions,
exactly as the favorite-button test mocks its actions today. Coverage:

- Submitting an email advances the form to code entry and displays the address it was sent to.
- Submitting a correct code triggers the verify action with the entered value.
- Each error state renders its own distinct, human-readable message — wrong code with attempts
  remaining, expired, locked out, rate-limited.
- The "wrong address?" control returns to email entry.
- The resend control re-invokes the request action.
- Codes can be pasted as well as typed, including one with a leading zero.
- A relative `returnTo` is carried through to the verify action; an absolute or off-site one is
  discarded in favour of the default destination.
- The form is operable by keyboard alone and labelled for screen readers, consistent with the
  accessibility commitment the project has already made.

**Not tested, by design:** the session and login-code SQL wrappers. They contain no decisions
once the policy module is extracted, and the existing user-data and user-settings modules — the
direct prior art — carry no tests for the same reason. Introducing database-backed tests would
be the first in the repository and a new convention; that is a separate decision, not a rider on
this one.

**No dependency injection.** Nothing in this codebase uses it, and adding an injected store
purely to enable testing would introduce a third seam to test code that holds no decisions.

### Prior art

- The time-controller reducer tests are the direct model for the policy module: a pure state
  machine driven by an explicit fixed clock value rather than real time, with one assertion per
  transition. The new tests should read like them.
- The favorite-button test is the direct model for the login form: mock the server-action module
  at the boundary, render the component, drive it with user-event, assert on accessible roles
  and names.
- The site-header test already demonstrates stubbing the `@/auth` module to keep Postgres out of
  the component test environment; that stub survives the change with its import updated.

### Regression expectations

The existing suite passes in full today. Every test outside the auth-touching set must pass
unchanged, and the ones that reference the auth module must change only in their imports. A
diff that alters assertions in unrelated tests is a signal that the facade was not preserved.

### Not covered by automated tests

End-to-end delivery of a real email, domain verification, and the Resend integration itself —
verified manually, consistent with the project's existing position on end-to-end auth flows.

## Out of Scope

- **Google OAuth, or any social sign-in.** Removed, not deferred. Re-adding it would reintroduce
  the accounts table and the account-linking problem this spec exists to delete.
- **Passwords.** No password field, no reset flow, no strength rules, no storage.
- **Magic links.** Explicitly rejected in favour of codes; not offered as an alternative path.
- **Multi-factor authentication.** The email round-trip is already a possession factor, and there
  is no second factor to add for an app whose sensitive data is a list of favorite stars.
- **Roles, permissions, or an admin surface.** Every account is an ordinary user.
- **Account management.** No change-email, no delete-account, no data export.
- **A session-management UI.** Sessions are revocable in the data model, but no "sign out
  everywhere" or active-devices screen is built.
- **Migrating existing users.** There are none.
- **Changing the users table identifier type.** Deliberately preserved.
- **Per-IP or global request throttling.** The rate limits here are per email address, which
  stops someone flooding one person's inbox but not a distributed script requesting codes for
  many different addresses. Platform-level bot protection was considered during planning and
  deliberately declined as disproportionate at this scale. This is named here as a knowingly
  accepted gap rather than an oversight; the mitigation, if the Resend quota ever starts getting
  burned, is bot protection on the request-code path.
- **Database-backed integration tests.** A worthwhile separate discussion; not a rider here.
- **The Next.js major-version upgrade.** Backlogged below.
- **Any product feature.** Favorites, profile, lessons, and the sky map are touched only insofar
  as their existing behaviour must be preserved.
- **Fixing the shared-database arrangement.** Noted below as a known risk. *(Since resolved for
  local development — see below.)*

## Further Notes

### The database was shared across all environments

*When this spec was written*, Production, Preview, and Development all pointed at the same
Postgres instance. That is why the "zero rows" finding was authoritative rather than a quirk of
the local environment, and why running the migration runner locally *was* the production
migration.

**That is no longer true for local development.** The Neon project now has a `production`
branch and a `dev` branch (a copy-on-write copy of a migrated `production`), and local
development is pointed at `dev` by hand — see "Local database" in `AGENTS.md`. Running
`npm run db:migrate` from a laptop now touches `dev` only. A migration intended for Production
must be run deliberately against the `production` branch's connection string.

What remains shared: the Neon integration's variables are single entries scoped to both Preview
and Production, so preview deployments still read and write production data unless the
integration is configured to branch per preview. Separating Preview is a reasonable backlog item.

### On sequencing against the Next.js upgrade

There is a real tension. The Next.js upgrade is backlogged rather than specified, yet
`cookies()` becomes asynchronous in Next 15, which touches exactly the code this spec introduces.

The resolution is structural, not sequential: cookie reads and writes are isolated behind a
single accessor, so the upgrade is a one-function edit rather than a change scattered across the
auth module. **Do not gate this spec on the upgrade.** If the upgrade happens to land first, the
accessor is simply written in its async form from the start.

The same upgrade would also resolve a live inconsistency — the MDX plugin is a major version
ahead of the framework it plugs into. This currently works, which is a reason to schedule the
upgrade rather than to hurry it.

### Why hand-rolled is defensible here

The instinct that hand-rolled authentication is dangerous is a good one, and worth answering
directly rather than waving away. It applies most sharply to password handling, session
cryptography, and OAuth flows — all three of which this design *removes* rather than
reimplements. What remains is: generate a random value, hash it, store it, look it up, expire it.
The security-critical decisions are few, enumerable, and all covered by the first test seam.

The concrete risks are brute-forcing the code space and email flooding, and both are addressed
explicitly by the attempt limit and the request rate limits rather than left implicit.

### Sequencing within the spec

The pure policy module can be built and fully tested before any other piece exists, including
before the domain is purchased. That is the natural first step and it de-risks the rest: once the
decisions are proven, what remains is plumbing.

### Backlog captured during this session

Not specified here; each warrants its own spec.

1. **Next.js 15/16 upgrade.** Aligns the MDX plugin with the framework, brings React 19. Interacts
   with this work through the async `cookies()` change described above.
2. **Night-mode (red-light) theme.** From the project's own future list, and the most on-theme
   enhancement available: red light preserves dark adaptation, so the app becomes usable *while*
   actually stargazing rather than only beforehand. Largely a colour-token swap plus a canvas
   tint.
3. **Observation journal.** Also from the future list — user-authored entries tied to
   constellations and dates. It depends on sign-in working, which makes it the natural first
   feature to build on top of this spec.

Deliberately not backlogged in this session: the quiz system, authoring the remaining
constellation lessons, and telescope recommendations.
