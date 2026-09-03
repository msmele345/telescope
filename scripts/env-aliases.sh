
# ---------------------------------------------------------------------------
# Auth.js (NextAuth v5)
# Add these to your Vercel project env (or to .env.local for local dev).
# Postgres connection vars come straight from the Vercel ↔ Neon integration
# under their standard names (POSTGRES_URL, POSTGRES_URL_NON_POOLING,
# DATABASE_URL) and don't need aliasing here.
# ---------------------------------------------------------------------------
# AUTH_SECRET="<openssl rand -hex 32>"
# AUTH_URL="http://localhost:3000"          # not required when running on Vercel
# AUTH_TRUST_HOST=true                      # set on non-Vercel deployments
#
# Google OAuth (https://console.cloud.google.com)
# AUTH_GOOGLE_ID=""
# AUTH_GOOGLE_SECRET=""
#
# Email magic link (any SMTP service: Resend, Postmark, Mailgun, SES, etc.)
# EMAIL_SERVER="smtp://user:pass@smtp.example.com:587"
# EMAIL_FROM="Telescope <noreply@telescope.app>"
