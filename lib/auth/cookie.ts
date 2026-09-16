import { cookies } from "next/headers";
import { SESSION_TTL_MS } from "@/lib/auth-policy";

export const SESSION_COOKIE = "telescope_session";

const MAX_AGE_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

/**
 * Every read and write of the session cookie goes through here. Two reasons:
 * the Server Component write guard below needs to exist in exactly one place,
 * and `cookies()` becomes async in Next 15 — when that lands this file is the
 * only one that changes.
 */
export function readSessionToken(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

export function writeSessionToken(raw: string): void {
  withCookieWrite(() => {
    cookies().set(SESSION_COOKIE, raw, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    });
  });
}

export function clearSessionToken(): void {
  withCookieWrite(() => {
    cookies().delete(SESSION_COOKIE);
  });
}

/**
 * A Server Component cannot set cookies — Next throws when it tries. `auth()`
 * runs from the root layout, so refreshing the cookie's max age has to be
 * allowed to fail there.
 *
 * The consequence is intended behaviour, not a bug: a visitor who only reads
 * pages keeps a sliding server-side session (extending the database row is
 * always safe) with a cookie on its original schedule, and anyone who
 * performs an action refreshes both.
 */
function withCookieWrite(write: () => void): void {
  try {
    write();
  } catch {
    // Called from a Server Component; the database row is the source of truth.
  }
}
