import { createHash } from "node:crypto";
import type {
  CodeAttemptResult,
  CodeRequestResult,
  LoginCodeRow,
  RequestHistoryRow,
  SessionEvaluation,
  SessionRow,
} from "./types";

export const CODE_LENGTH = 6;
export const CODE_TTL_MS = 10 * 60 * 1000;

export const MAX_ATTEMPTS = 5;

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 15 * 24 * 60 * 60 * 1000;

export const CODE_REQUEST_COOLDOWN_MS = 60 * 1000;
export const CODE_REQUEST_WINDOW_MS = 60 * 60 * 1000;
export const CODE_REQUEST_HOURLY_CAP = 5;

const CODE_SPACE = 10 ** CODE_LENGTH;
const UINT32_SPACE = 2 ** 32;
const ACCEPT_LIMIT = Math.floor(UINT32_SPACE / CODE_SPACE) * CODE_SPACE;

export function generateCode(): string {
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= ACCEPT_LIMIT);
  return String(value % CODE_SPACE).padStart(CODE_LENGTH, "0");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

export function evaluateCodeAttempt(
  row: LoginCodeRow,
  submitted: string,
  now: number
): CodeAttemptResult {
  if (row.consumed || row.attempts >= MAX_ATTEMPTS) {
    return { status: "locked", countsAsAttempt: false };
  }

  if (now >= row.expiresAt) {
    return { status: "expired" };
  }

  if (hashToken(submitted) !== row.codeHash) {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      // The caller must persist this failure, or the next correct guess would slip past the lock.
      return { status: "locked", countsAsAttempt: true };
    }
    return { status: "wrong", attemptsRemaining: MAX_ATTEMPTS - attempts };
  }

  return { status: "ok" };
}

export function evaluateSession(row: SessionRow, now: number): SessionEvaluation {
  const remaining = row.expiresAt - now;
  if (remaining <= 0) {
    return { valid: false, shouldSlide: false };
  }
  return { valid: true, shouldSlide: remaining < SESSION_REFRESH_THRESHOLD_MS };
}

export function canRequestCode(
  recentRows: RequestHistoryRow[],
  now: number
): CodeRequestResult {
  const withinWindow = recentRows.filter(
    (row) => now - row.createdAt < CODE_REQUEST_WINDOW_MS
  );

  if (withinWindow.some((row) => now - row.createdAt < CODE_REQUEST_COOLDOWN_MS)) {
    return "cooldown";
  }

  if (withinWindow.length >= CODE_REQUEST_HOURLY_CAP) {
    return "hourlyCap";
  }

  return "allowed";
}

/**
 * How long the caller must wait before `canRequestCode` would return
 * "allowed" for this address. Zero when a request is allowed right now.
 *
 * The cooldown is measured from the newest request; the hourly cap clears
 * only once the oldest request in the window falls out of it.
 */
export function retryAfterMs(recentRows: RequestHistoryRow[], now: number): number {
  const withinWindow = recentRows.filter(
    (row) => now - row.createdAt < CODE_REQUEST_WINDOW_MS
  );
  if (withinWindow.length === 0) return 0;

  const newest = Math.max(...withinWindow.map((row) => row.createdAt));
  const cooldownRemaining = newest + CODE_REQUEST_COOLDOWN_MS - now;
  if (cooldownRemaining > 0) return cooldownRemaining;

  if (withinWindow.length >= CODE_REQUEST_HOURLY_CAP) {
    const oldest = Math.min(...withinWindow.map((row) => row.createdAt));
    return oldest + CODE_REQUEST_WINDOW_MS - now;
  }

  return 0;
}

/**
 * Casing and stray whitespace must not fork an account, so every lookup —
 * rate limiting, verification, and the implicit account creation — runs
 * against the normalised form.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

export function isValidEmail(normalized: string): boolean {
  return EMAIL_PATTERN.test(normalized);
}
