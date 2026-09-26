# Ticket 6: Verify sign-in, favorites, and profile in Production

> Source spec: `plans/v2-lightweight-auth.md`

**Operator work — not agent-grabbable.** Manual end-to-end verification, consistent with the
project's existing position on end-to-end auth flows.

**What to build:** Nothing. This is the demonstration that three shipped-but-inert phases —
sign-in, favorites, and the profile — finally work in Production, on a real email address that
is not the owner's, against the real sending domain.

**Blocked by:** #3 Return to where you were after signing in; #4 Send codes through Resend; #5
Provision Resend and configure every environment.

- [X] A non-owner address receives a code in Production and completes sign-in.
- [X] That account can favorite and unfavorite a star and a constellation, and the state survives a reload.
- [X] That account can mark a constellation viewed and a lesson read.
- [ ] Signing in from a constellation page in Production returns the visitor to that page.
- [ ] The profile page shows the favorites, viewed constellations, and read lessons for that account.
- [X] Signing out in Production ends the session, and the session cannot be restored afterwards.
