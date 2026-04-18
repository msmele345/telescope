
# ---------------------------------------------------------------------------
# Unprefixed aliases (appended by `npm run env:pull`).
# Most libraries (@vercel/postgres, Prisma, drizzle-kit, Supabase JS) look for
# these standard names. Interpolation works in Next.js via @next/env's
# dotenv-expand support.
# ---------------------------------------------------------------------------

# Postgres connection
POSTGRES_URL="$pg_dev_POSTGRES_URL"
POSTGRES_PRISMA_URL="$pg_dev_POSTGRES_PRISMA_URL"
POSTGRES_URL_NON_POOLING="$pg_dev_POSTGRES_URL_NON_POOLING"
POSTGRES_USER="$pg_dev_POSTGRES_USER"
POSTGRES_HOST="$pg_dev_POSTGRES_HOST"
POSTGRES_PASSWORD="$pg_dev_POSTGRES_PASSWORD"
POSTGRES_DATABASE="$pg_dev_POSTGRES_DATABASE"

# Prisma's default names
DATABASE_URL="$pg_dev_POSTGRES_PRISMA_URL"
DIRECT_URL="$pg_dev_POSTGRES_URL_NON_POOLING"

# Supabase JS client (in case you use it later)
NEXT_PUBLIC_SUPABASE_URL="$pg_dev_SUPABASE_URL"
NEXT_PUBLIC_SUPABASE_ANON_KEY="$pg_dev_SUPABASE_ANON_KEY"
SUPABASE_SERVICE_ROLE_KEY="$pg_dev_SUPABASE_SERVICE_ROLE_KEY"
SUPABASE_JWT_SECRET="$pg_dev_SUPABASE_JWT_SECRET"
