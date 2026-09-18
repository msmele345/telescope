"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
// Not the barrel: it re-exports the node:crypto helpers, which must stay
// out of the client bundle.
import { loginHref } from "@/lib/auth-policy/return-to";

interface Props {
  /**
   * Where to come back to after signing in. Defaults to the current path,
   * which omits the query — pass one explicitly when it matters (a star
   * popup lives only in client state, so it passes `/?star=ID`).
   */
  returnTo?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

/**
 * A sign-in link that brings the visitor back to where they were.
 *
 * Reads the path with `usePathname` rather than `useSearchParams`: the header
 * renders this on every route, and `useSearchParams` would force each static
 * route into a client-rendering bailout.
 */
export default function SignInLink({ returnTo, style, children }: Props) {
  const pathname = usePathname();

  return (
    <Link href={loginHref(returnTo ?? pathname)} style={style}>
      {children}
    </Link>
  );
}
