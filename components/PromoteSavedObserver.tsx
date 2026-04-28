"use client";

import { useEffect } from "react";
import { loadSavedObserver } from "@/lib/observer";
import { saveObserverIfMissing } from "@/app/actions/user-settings";

const PROMOTED_KEY = "telescope:observer:promoted";

interface Props {
  /** Truthy when a session is active. Promotion is gated on this. */
  isAuthenticated: boolean;
}

/**
 * After login, copies the anonymous localStorage observer into the
 * authenticated user's UserSettings row — but only once per browser, and only
 * if the server doesn't already have a location for this user.
 */
export default function PromoteSavedObserver({ isAuthenticated }: Props) {
  useEffect(() => {
    if (!isAuthenticated) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(PROMOTED_KEY) === "1") return;

    const cached = loadSavedObserver();
    if (!cached) {
      window.localStorage.setItem(PROMOTED_KEY, "1");
      return;
    }

    let cancelled = false;
    void saveObserverIfMissing(cached)
      .then(() => {
        if (!cancelled) window.localStorage.setItem(PROMOTED_KEY, "1");
      })
      .catch(() => {
        // Network/server hiccup — leave the flag unset so we retry next visit.
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return null;
}
