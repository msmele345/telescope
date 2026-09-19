"use server";

import { redirect } from "next/navigation";
import {
  evaluateCodeAttempt,
  generateCode,
  generateSessionToken,
  isValidEmail,
  normalizeEmail,
  retryAfterMs,
  safeReturnTo,
} from "@/lib/auth-policy";
import {
  consumeLoginCode,
  createSession,
  deliverCode,
  getLatestLoginCode,
  issueLoginCode,
  recordFailedAttempt,
  upsertUserByEmail,
  writeSessionToken,
} from "@/lib/auth";

export type RequestCodeResult =
  /** `email` is the normalised address the code was actually sent to. */
  | { status: "sent"; email: string }
  | { status: "invalidEmail" }
  | { status: "rateLimited"; retryAfterSeconds: number }
  /** The code was issued but the email did not go out. */
  | { status: "deliveryFailed" };

/**
 * Only the ways verification can fail. A success never reaches the caller:
 * the action redirects, so the client's promise resolves with `undefined`.
 */
export type VerifyCodeResult =
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
  const code = generateCode();
  const { verdict, recent } = await issueLoginCode(normalized, code, now);
  if (verdict !== "allowed") {
    return {
      status: "rateLimited",
      retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs(recent, now) / 1000)),
    };
  }

  try {
    await deliverCode(normalized, code);
  } catch (err) {
    // The issued row stays as rate-limit history, so a retry inside the
    // cooldown is refused — the form's message says to wait a minute.
    console.error("Sign-in code delivery failed:", err);
    return { status: "deliveryFailed" };
  }

  return { status: "sent", email: normalized };
}

/**
 * Check a submitted code and, if it holds up, sign the visitor in.
 *
 * On success this redirects rather than returning, which is what keeps the
 * client form free of any routing of its own. `returnTo` is re-checked here
 * rather than trusted from the form: a server action can be called directly.
 */
export async function verifyCode(
  email: string,
  code: string,
  returnTo?: string
): Promise<VerifyCodeResult | void> {
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
  const token = generateSessionToken();
  await createSession(userId, token, now);
  writeSessionToken(token);

  redirect(safeReturnTo(returnTo));
}
