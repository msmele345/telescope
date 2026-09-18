import { pool } from "@/lib/db";
import {
  CODE_REQUEST_WINDOW_MS,
  CODE_TTL_MS,
  canRequestCode,
  hashToken,
  type CodeRequestResult,
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
 * Issue a code for an address, if the rate limits allow it.
 *
 * The limits are checked and the row inserted inside one transaction, under
 * an advisory lock on the address. Doing the check as a separate round-trip
 * would let concurrent requests all read the same history and all pass it —
 * and since the limits are per-address and there is no per-IP throttling,
 * this is the only thing standing between a script and someone's inbox.
 *
 * Latest wins: any prior unspent code for the address is marked consumed in
 * the same breath, so only the most recent code can ever verify — the
 * retired row stays behind as rate-limit history. Cleanup rides along here
 * rather than on a schedule, and drops only rows past the window.
 *
 * Returns the verdict and the history it was judged against, so the caller
 * can say how long the wait is without re-reading.
 */
export async function issueLoginCode(
  email: string,
  code: string,
  now: number
): Promise<{ verdict: CodeRequestResult; recent: RequestHistoryRow[] }> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1)::bigint)`, [
      email,
    ]);

    const { rows } = await client.query<{ created_at: Date }>(
      `SELECT created_at FROM login_codes
        WHERE email = $1 AND created_at > $2`,
      [email, new Date(now - CODE_REQUEST_WINDOW_MS)]
    );
    const recent: RequestHistoryRow[] = rows.map((row) => ({
      createdAt: row.created_at.getTime(),
    }));

    const verdict = canRequestCode(recent, now);
    if (verdict !== "allowed") {
      await client.query("ROLLBACK");
      return { verdict, recent };
    }

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
    return { verdict, recent };
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
