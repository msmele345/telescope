"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  getFavoriteState,
  toggleFavorite,
} from "@/app/actions/user-data";
import type { FavoriteType } from "@/lib/user-data";
import { actionButtonStyle, signInLinkStyle } from "./styles";

export interface FavoriteButtonProps {
  type: FavoriteType;
  targetId: string;
  /** Optional: skip the on-mount lookup when the parent already knows. */
  initialState?: "is" | "not" | "unauth";
  /** Hint shown next to the sign-in link, e.g. "to favorite this star". */
  signInHint?: string;
}

export default function FavoriteButton({
  type,
  targetId,
  initialState,
  signInHint = "to save favorites",
}: FavoriteButtonProps) {
  const [state, setState] = useState<
    "loading" | "is" | "not" | "unauth" | "invalid"
  >(initialState ?? "loading");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (initialState) return;
    let cancelled = false;
    void getFavoriteState(type, targetId).then((r) => {
      if (!cancelled) setState(r.status);
    });
    return () => {
      cancelled = true;
    };
  }, [type, targetId, initialState]);

  if (state === "unauth") {
    return (
      <Link href="/login" style={signInLinkStyle}>
        Sign in {signInHint}
      </Link>
    );
  }

  if (state === "invalid") return null;

  const isFav = state === "is";
  const label = isFav ? "★ Favorited" : "☆ Favorite";

  return (
    <button
      type="button"
      aria-pressed={isFav}
      disabled={state === "loading" || pending}
      onClick={() => {
        startTransition(async () => {
          const r = await toggleFavorite(type, targetId);
          if (r.status === "added") setState("is");
          else if (r.status === "removed") setState("not");
          else setState(r.status);
        });
      }}
      style={actionButtonStyle(isFav)}
    >
      {state === "loading" ? "…" : label}
    </button>
  );
}
