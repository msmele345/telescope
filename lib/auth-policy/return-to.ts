/** Where a visitor lands after signing in when they came from nowhere in particular. */
export const DEFAULT_RETURN_TO = "/";

// A throwaway origin to resolve against: whatever the parser makes of the
// value, it is same-site only if it still resolves onto this origin.
const PROBE_ORIGIN = "http://return-to.invalid";

/**
 * Reduce an untrusted post-sign-in destination to a same-origin path.
 *
 * Anything absolute, protocol-relative, or otherwise resolving off-site is
 * discarded in favour of the default — forwarding a freshly authenticated
 * visitor to an attacker-supplied URL is a phishing primitive. The check is
 * made on the parsed URL rather than on string prefixes, because the parser
 * strips tabs and newlines and reads `\` as `/`, so `/\evil.example` and
 * `/\t/evil.example` both look relative yet resolve to another host.
 */
export function safeReturnTo(raw: unknown): string {
  if (typeof raw !== "string" || !raw.startsWith("/")) return DEFAULT_RETURN_TO;

  let url: URL;
  try {
    url = new URL(raw, PROBE_ORIGIN);
  } catch {
    return DEFAULT_RETURN_TO;
  }
  if (url.origin !== PROBE_ORIGIN) return DEFAULT_RETURN_TO;
  // Landing back on the sign-in form after signing in is a dead end.
  if (url.pathname === "/login") return DEFAULT_RETURN_TO;

  return url.pathname + url.search + url.hash;
}

/**
 * The sign-in link for a prompt at `from`. A destination that would be
 * discarded anyway — off-site, or the default — is left off the URL.
 */
export function loginHref(from?: string | null): string {
  const destination = safeReturnTo(from);
  if (destination === DEFAULT_RETURN_TO) return "/login";
  return `/login?returnTo=${encodeURIComponent(destination)}`;
}
