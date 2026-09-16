"use server";

import { redirect } from "next/navigation";
import {
  canRequestCode,
  evaluateCodeAttempt,
  generateCode,
  isValidEmail,
  normalizeEmail,
  retryAfterMs,
} from "@/lib/auth-policy";
import {
  consumeLoginCode,
  createLoginCode,
  createSession,
  deliverCode,
  getLatestLoginCode,
  listRecentRequests,
  recordFailedAttempt,
  upsertUserByEmail,
  writeSessionToken,
} from "@/lib/auth";

export type RequestCodeResult =
  /** `email` is the normalised address the code was actually sent to. */
  | { status: "sent"; email: string }
  | { status: "invalidEmail" }
  | { status: "rateLimited"; retryAfterSeconds: number };

export type VerifyCodeResult =
  | { status: "ok" }
  | { status: "invalidEmail" }
  | { status: "wrong"; attemptsRemaining: number }
  | { status: "expired" }
  | { status: "locked" };

/**
 * Issue a login code for an address.
 *
 * The answer is "sent" whether or not the address has an account — the form
 * must not be usable to discover who has registered. Nothing is written to
 * the users table here; that happens only on a successful verification.
 */
export async function requestCode(email: string): Promise<RequestCodeResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { status: "invalidEmail" };

  const now = Date.now();
  const recent = await listRecentRequests(normalized, now);
  if (canRequestCode(recent, now) !== "allowed") {
    return {
      status: "rateLimited",
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs(recent, now) / 1000)),
    };
  }

  const code = generateCode();
  await createLoginCode(normalized, code, now);
  await deliverCode(normalized, code);

  return { status: "sent", email: normalized };
}

/**
 * Check a submitted code and, if it holds up, sign the visitor in.
 *
 * On success this redirects rather than returning, which is what keeps the
 * client form free of any routing of its own.
 */
export async function verifyCode(
  email: string,
  code: string
): Promise<VerifyCodeResult> {
  const normalized = normalizeEmail(email);
  if (!isValidEmail(normalized)) return { status: "invalidEmail" };

  const row = await getLatestLoginCode(normalized);
  // No code was ever issued for this address, or the row aged out of the
  // rate-limit window: indistinguishable, from here, from one that lapsed.
  if (!row) return { status: "expired" };

  const now = Date.now();
  const result = evaluateCodeAttempt(row, code.trim(), now);

  switch (result.status) {
    case "wrong":
      await recordFailedAttempt(row.id);
      return { status: "wrong", attemptsRemaining: result.attemptsRemaining };
    case "locked":
      // The fifth wrong guess only locks the code if the failure is persisted.
      if (result.countsAsAttempt) await recordFailedAttempt(row.id);
      return { status: "locked" };
    case "expired":
      return { status: "expired" };
  }

  await consumeLoginCode(row.id);
  const userId = await upsertUserByEmail(normalized);
  const token = newSessionToken();
  await createSession(userId, token, now);
  writeSessionToken(token);

  redirect("/");
}

/** An opaque 256-bit value: it carries no claims, so there is nothing to sign. */
function newSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
