import { Pool, type PoolConfig } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __telescopePgPool: Pool | undefined;
}

function buildPool(): Pool {
  const raw =
    process.env.POSTGRES_URL_NON_POOLING ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!raw) {
    throw new Error(
      "Postgres connection string missing. Run `npm run env:pull` to populate .env.local."
    );
  }

  // Supabase ships URLs with sslmode=require, which newer pg treats as
  // verify-full and rejects on the self-signed chain. Strip it and pass an
  // explicit ssl object instead.
  const connectionString = raw
    .replace(/([?&])sslmode=[^&]*&?/i, (_m, sep) => (sep === "?" ? "?" : ""))
    .replace(/[?&]$/, "");

  const config: PoolConfig = {
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };

  return new Pool(config);
}

export const pool: Pool = global.__telescopePgPool ?? buildPool();

if (process.env.NODE_ENV !== "production") {
  global.__telescopePgPool = pool;
}
