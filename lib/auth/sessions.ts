import { pool } from "@/lib/db";
import { SESSION_TTL_MS, hashToken } from "@/lib/auth-policy";

export interface SessionRecord {
  tokenHash: string;
  userId: number;
  email: string | null;
  name: string | null;
  expiresAt: number;
}

interface Row {
  token_hash: string;
  user_id: number;
  email: string | null;
  name: string | null;
  expires_at: Date;
}

export async function createSession(
  userId: number,
  rawToken: string,
  now: number
): Promise<void> {
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [hashToken(rawToken), userId, new Date(now + SESSION_TTL_MS)]
  );
}

export async function findSession(
  tokenHash: string
): Promise<SessionRecord | null> {
  const { rows } = await pool.query<Row>(
    `SELECT s.token_hash, s.user_id, s.expires_at, u.email, u.name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    tokenHash: row.token_hash,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    expiresAt: row.expires_at.getTime(),
  };
}

export async function extendSession(
  tokenHash: string,
  now: number
): Promise<number> {
  const expiresAt = now + SESSION_TTL_MS;
  await pool.query(`UPDATE sessions SET expires_at = $2 WHERE token_hash = $1`, [
    tokenHash,
    new Date(expiresAt),
  ]);
  return expiresAt;
}

export async function deleteSession(tokenHash: string): Promise<void> {
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [tokenHash]);
}

/** Implicit account creation: sign-in is the only way a user row appears. */
export async function upsertUserByEmail(email: string): Promise<number> {
  const { rows } = await pool.query<{ id: number }>(
    `INSERT INTO users (email)
     VALUES ($1)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [email]
  );
  return rows[0].id;
}
