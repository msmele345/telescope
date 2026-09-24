# Ticket 5: Provision Resend and configure every environment

> Source spec: `plans/v2-lightweight-auth.md`

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

- [x] A custom domain is purchased, attached to the project, and verified with Resend's DNS records.
- [x] The Resend Marketplace integration is provisioned for Production and Preview only — not Development, so local sign-in keeps logging codes: `vercel integration add resend/resend-email -e production -e preview --no-env-pull -m domain=<domain> -m region=us-east-1`. The product requires an owned domain at provisioning, so this follows the purchase. Confirm the injected name is exactly `RESEND_API_KEY` (no prefix).
- [x] The sending address is set as `EMAIL_FROM` (e.g. `Telescope <signin@<domain>>`) for Production, Preview, and Development.
- [ ] The obsolete Google client id, client secret, auth secret, and SMTP settings are deleted from the preview environment, leaving no unused secrets behind.
