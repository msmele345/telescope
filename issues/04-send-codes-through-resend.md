# Ticket 4: Send codes through Resend

> Source spec: `plans/v2-lightweight-auth.md`

**What to build:** The code arrives as a real email within seconds, unmistakably from Telescope,
stating how long it is valid so the recipient knows whether to hurry. Resend is provisioned
through the Vercel Marketplace integration, which injects its API key across all environments
rather than needing manual per-environment configuration.

The development fallback stays: with no API key present, the code is written to the server log,
so a fresh clone is productive immediately without provisioning a mail service.

Structure this so it is correct and testable **before the sending domain exists** — Resend's
default sender delivers only to the account owner's own address, which is enough to verify the
path end to end. Delivery to anyone else waits on the operator ticket.

**Blocked by:** #2 Email-code sign-in, end to end, in local dev.

- [ ] A requested code arrives by email within seconds, clearly identifiable as coming from Telescope.
- [x] The email states the code's validity window.
- [x] With no API key configured, the code still goes to the server log and local sign-in still works.
- [x] The Resend SDK is the only dependency added; no mail transport configuration is required for local development.
- [ ] The Resend Marketplace integration is provisioned on the project, so the API key is injected across all environments. This is a CLI action, but the Marketplace flow needs the operator to approve it in the browser.
