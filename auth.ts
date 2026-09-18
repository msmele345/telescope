import { cache } from "react";
import { redirect } from "next/navigation";
import { evaluateSession, hashToken } from "@/lib/auth-policy";
import {
  clearSessionToken,
  deleteSession,
  extendSession,
  findSession,
  readSessionToken,
  writeSessionToken,
} from "@/lib/auth";

/**
 * The shape the application destructures. Deliberately the same as the one
 * the previous auth library handed back, so nothing downstream of here had to
 * change when the implementation was replaced.
 */
export interface Session {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
  };
  expires: string;
}

/**
 * Resolve the current request's session, or null.
 *
 * Wrapped in `cache` so the root layout, the page, and any server actions in
 * one request share a single lookup — and a visitor with no cookie never
 * touches the database at all.
 */
export const auth = cache(async function auth(): Promise<Session | null> {
  const raw = readSessionToken();
  if (!raw) return null;

  const tokenHash = hashToken(raw);
  const record = await findSession(tokenHash);
  if (!record) {
    // Signed out elsewhere, or the row aged away. Try to drop the dead
    // cookie — that only lands if we are in an action, so a read-only
    // visitor keeps a useless cookie until their next one. Either way they
    // are treated as signed out rather than shown an error.
    clearSessionToken();
    return null;
  }

  const now = Date.now();
  const { valid, shouldSlide } = evaluateSession(record, now);

  if (!valid) {
    await deleteSession(tokenHash);
    clearSessionToken();
    return null;
  }

  let expiresAt = record.expiresAt;
  if (shouldSlide) {
    expiresAt = await extendSession(tokenHash, now);
    // No-ops from a Server Component; the row above is the source of truth.
    writeSessionToken(raw);
  }

  return {
    user: {
      id: String(record.userId),
      email: record.email,
      name: record.name,
    },
    expires: new Date(expiresAt).toISOString(),
  };
});

/**
 * End the session on the server, not merely in the browser, so the cookie
 * cannot be replayed afterwards.
 */
export async function signOut(options?: { redirectTo?: string }): Promise<void> {
  const raw = readSessionToken();
  if (raw) await deleteSession(hashToken(raw));
  clearSessionToken();
  redirect(options?.redirectTo ?? "/");
}
