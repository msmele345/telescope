"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ObserverLocation } from "@/lib/observer";
import type { TimeController } from "@/lib/time-controller";
import {
  enterTourTime,
  findTourTime,
  getTourBySlug,
  leaveTourTime,
  type SavedTime,
  type Tour,
  type TourCatalogs,
  type TourTime,
} from "@/lib/tours";
import { loadTourCatalogs } from "@/lib/tours/load-catalogs";

export type TourPlayerState =
  | { status: "idle" }
  | {
      status: "active";
      tour: Tour;
      time: TourTime;
      /** What "Return" restores. */
      saved: SavedTime;
      catalogs: TourCatalogs;
      /** Zero-based. */
      stop: number;
      /** Showing the Return / Stay choice instead of the stop. */
      leaving: boolean;
    };

export type LeaveChoice = "return" | "stay";

export interface UseTourPlayerOptions {
  /** The `?tour=` value, or null. */
  slug: string | null;
  controller: TimeController;
  /** The observer to find the tour time for. Read once, when a tour starts. */
  getObserver: () => ObserverLocation;
  /** Drop `?tour=` from the URL. Called when a tour ends or can't start. */
  clearTourParam: () => void;
}

/**
 * The tour player's state and actions. User-paced: no timers; the state is
 * the current stop. Starting a tour pauses time at the tour time and
 * remembers what it replaced; the observer is only ever read.
 */
export function useTourPlayer({
  slug,
  controller,
  getObserver,
  clearTourParam,
}: UseTourPlayerOptions) {
  const [state, setState] = useState<TourPlayerState>({ status: "idle" });
  /**
   * A tour that has no tour time from this observer, so it did not start.
   * Kept apart from `state`: a tour already running carries on untouched.
   */
  const [unavailable, setUnavailable] = useState<Tour | null>(null);

  // Callbacks and state read inside the async start, without restarting it.
  const latest = useRef({ getObserver, clearTourParam, state });
  latest.current = { getObserver, clearTourParam, state };

  /** The `?tour=` value last acted on, so a re-render never restarts a tour. */
  const startedSlug = useRef<string | null>(null);

  useEffect(() => {
    if (!slug) {
      startedSlug.current = null;
      return;
    }
    if (startedSlug.current === slug) return;
    const tour = getTourBySlug(slug);
    if (!tour) return; // An unknown slug is ignored.

    let cancelled = false;
    loadTourCatalogs()
      .then((catalogs) => {
        if (cancelled) return;
        startedSlug.current = slug;
        const now = new Date(controller.getRealMs());
        const time = findTourTime(tour, latest.current.getObserver(), now, catalogs);
        if (!time) {
          setUnavailable(tour);
          latest.current.clearTourParam();
          return;
        }
        setUnavailable(null);
        // A tour started from inside another keeps the time from before both.
        const prev = latest.current.state;
        const fresh = enterTourTime(controller, time.at);
        const saved = prev.status === "active" ? prev.saved : fresh;
        setState({ status: "active", tour, time, saved, catalogs, stop: 0, leaving: false });
      })
      .catch((err) => {
        console.error("Failed to start tour", err);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, controller]);

  const update = useCallback(
    (fn: (s: Extract<TourPlayerState, { status: "active" }>) => TourPlayerState) => {
      setState((s) => (s.status === "active" ? fn(s) : s));
    },
    []
  );

  const next = useCallback(
    () =>
      update((s) => {
        if (s.leaving) return s;
        if (s.stop < s.tour.stops.length - 1) return { ...s, stop: s.stop + 1 };
        return { ...s, leaving: true };
      }),
    [update]
  );

  const back = useCallback(
    () => update((s) => (s.leaving || s.stop === 0 ? s : { ...s, stop: s.stop - 1 })),
    [update]
  );

  const requestLeave = useCallback(() => update((s) => ({ ...s, leaving: true })), [update]);
  const cancelLeave = useCallback(() => update((s) => ({ ...s, leaving: false })), [update]);

  const leave = useCallback(
    (choice: LeaveChoice) => {
      const s = latest.current.state;
      if (s.status !== "active") return;
      if (choice === "return") leaveTourTime(controller, s.saved);
      setState({ status: "idle" });
      latest.current.clearTourParam();
    },
    [controller]
  );

  const dismissNotice = useCallback(() => setUnavailable(null), []);

  return { state, unavailable, next, back, requestLeave, cancelLeave, leave, dismissNotice };
}
