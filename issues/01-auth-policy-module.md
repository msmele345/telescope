# Ticket 1: Auth policy module

> Source spec: `plans/v2-lightweight-auth.md`

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
