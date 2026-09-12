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
    return { status: "locked" };
  }

  if (now >= row.expiresAt) {
    return { status: "expired" };
  }

  if (hashToken(submitted) !== row.codeHash) {
    const attempts = row.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      return { status: "locked" };
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
