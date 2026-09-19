# ---------------------------------------------------------------------------
# Appended to .env.local by `npm run env:pull`.
#
# `vercel env pull` rewrites .env.local and strips comments, so this file is
# the only place local-setup notes survive a pull. Keep everything here
# commented out — an uncommented assignment would override a pulled value.
#
# Despite the filename, nothing here is aliased. lib/db.ts and
# scripts/db-migrate.mjs read POSTGRES_URL_NON_POOLING → POSTGRES_URL →
# DATABASE_URL directly, and the Neon integration already supplies those exact
# names. The file is kept for the notes below.
# ---------------------------------------------------------------------------

# --- Local database: set by hand, a pull cannot supply it -------------------
#
# The Neon integration's vars are Sensitive (write-only) and attached only to
# the Preview and Production environments, so the Development pull returns
# nothing for them.
#
# Copy the Neon `dev` branch's DIRECT connection string — the host WITHOUT
# `-pooler` in it; the console hands you the pooled one unless you turn
# pooling off — and set:
#
# POSTGRES_URL_NON_POOLING="postgresql://USER:PASSWORD@HOST.REGION.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
#
# A pull keeps this value when it is already present, but keeps it silently:
# it never warns that the value is stale, which is how .env.local once sat
# pointed at a retired database unnoticed. Confirm the host with the first
# line of `npm run db:migrate`. See AGENTS.md › Local database.

# --- Email delivery ---------------------------------------------------------
#
# With RESEND_API_KEY unset, sign-in codes are written to the dev server log,
# which is what lets a fresh clone sign in without provisioning a mail service.
#
# The Resend Marketplace integration injects RESEND_API_KEY into every Vercel
# environment, Development included, so a pull puts it here and local sign-in
# then sends real mail. Delete the pulled line to go back to the log.
#
# Until a sending domain is verified, mail goes from Resend's shared sender and
# reaches ONLY the Resend account owner's address. Once one is verified, set
# the sender in every Vercel environment:
#
# EMAIL_FROM="Telescope <signin@YOUR-DOMAIN>"
#
# Outside development a missing key is an error, never a fallback to the log:
# live sign-in codes must not land in a deployment's log stream.
