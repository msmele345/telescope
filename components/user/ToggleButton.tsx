"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import type { ToggleResult } from "@/app/actions/user-data";
import { actionButtonStyle, signInLinkStyle } from "./styles";

export interface ToggleButtonProps {
  /** Server action invoked on click. */
  action: () => Promise<ToggleResult>;
  /** Initial pressed state for SSR'd authenticated users. */
  initialPressed: boolean;
  /** When false, render a sign-in link instead. */
  isAuthenticated: boolean;
  /** Label when the button is currently inactive (off). */
  inactiveLabel: string;
  /** Label when active (on). */
  activeLabel: string;
  /** Hint shown next to the sign-in link, e.g. "to mark as viewed". */
  signInHint: string;
}

/**
 * Generic on/off toggle backed by a server action that returns
 * `added | removed | unauth | invalid`. Used for "mark viewed" and
 * "mark read" affordances on constellation pages.
 */
export default function ToggleButton({
  action,
  initialPressed,
  isAuthenticated,
  inactiveLabel,
  activeLabel,
  signInHint,
}: ToggleButtonProps) {
  const [pressed, setPressed] = useState(initialPressed);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link href="/login" style={signInLinkStyle}>
        Sign in {signInHint}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const r = await action();
          if (r.status === "added") setPressed(true);
          else if (r.status === "removed") setPressed(false);
        });
      }}
      style={actionButtonStyle(pressed)}
    >
      {pressed ? activeLabel : inactiveLabel}
    </button>
  );
}
