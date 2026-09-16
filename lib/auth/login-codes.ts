import { pool } from "@/lib/db";
import {
  CODE_REQUEST_WINDOW_MS,
  CODE_TTL_MS,
  hashToken,
  type LoginCodeRow,
  type RequestHistoryRow,
} from "@/lib/auth-policy";

export interface StoredLoginCode extends LoginCodeRow {
  id: number;
}

interface Row {
  id: number;
  code_hash: string;
  created_at: Date;
  expires_at: Date;
  attempts: number;
  consumed: boolean;
}

/**
 * Every request logged for this address inside the rate-limit window —
 * including spent and expired ones, which is what gives the hourly cap an
 * hour of history to count rather than the ten minutes a code stays live.
 */
export async function listRecentRequests(
  email: string,
  now: number
): Promise<RequestHistoryRow[]> {
  const { rows } = await pool.query<{ created_at: Date }>(
    `SELECT created_at FROM login_codes
      WHERE email = $1 AND created_at > $2`,
    [email, new Date(now - CODE_REQUEST_WINDOW_MS)]
  );
  return rows.map((row) => ({ createdAt: row.created_at.getTime() }));
}

/**
 * Store a freshly issued code. Latest wins: any prior unspent code for this
 * address is marked consumed in the same breath, so only the most recent code
 * can ever verify — and the retired row stays behind as rate-limit history.
 *
 * Cleanup rides along here rather than on a schedule; the table holds a
 * handful of rows, and only rows older than the rate-limit window are dropped.
 */
export async function createLoginCode(
  email: string,
  code: string,
  now: number
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM login_codes WHERE created_at <= $1`, [
      new Date(now - CODE_REQUEST_WINDOW_MS),
    ]);
    await client.query(
      `UPDATE login_codes SET consumed = TRUE
        WHERE email = $1 AND consumed = FALSE`,
      [email]
    );
    await client.query(
      `INSERT INTO login_codes (email, code_hash, expires_at, created_at)
       VALUES ($1, $2, $3, $4)`,
      [email, hashToken(code), new Date(now + CODE_TTL_MS), new Date(now)]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** The only row that can still verify, if any: the newest one for the address. */
export async function getLatestLoginCode(
  email: string
): Promise<StoredLoginCode | null> {
  const { rows } = await pool.query<Row>(
    `SELECT id, code_hash, created_at, expires_at, attempts, consumed
       FROM login_codes
      WHERE email = $1
      ORDER BY created_at DESC, id DESC
      LIMIT 1`,
    [email]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    codeHash: row.code_hash,
    createdAt: row.created_at.getTime(),
    expiresAt: row.expires_at.getTime(),
    attempts: row.attempts,
    consumed: row.consumed,
  };
}

export async function recordFailedAttempt(id: number): Promise<void> {
  await pool.query(
    `UPDATE login_codes SET attempts = attempts + 1 WHERE id = $1`,
    [id]
  );
}

/** Spend the code so it can never verify again, keeping it as history. */
export async function consumeLoginCode(id: number): Promise<void> {
  await pool.query(`UPDATE login_codes SET consumed = TRUE WHERE id = $1`, [id]);
}
