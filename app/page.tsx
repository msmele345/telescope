"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
import TimeScrubber from "@/components/TimeScrubber";
import { TimeController, type TimeSnapshot } from "@/lib/time-controller";
import StarPopup from "@/components/StarPopup";
import type { Star } from "@/lib/star-catalog";
import {
  DEFAULT_OBSERVER,
  loadSavedObserver,
  saveObserver,
  type SavedObserver,
} from "@/lib/observer";

const SkyCanvas = dynamic(() => import("@/components/SkyCanvas"), {
  ssr: false,
});

// Throttle star-field recomputes to avoid rebuilding geometry every RAF.
// At 60x/3600x the sky still moves smoothly at 4Hz; 1x is visually identical.
const SKY_UPDATE_HZ = 4;

export default function Home() {
  const [observer, setObserver] = useState<SavedObserver | null>(null);
  const controller = useMemo(() => new TimeController(), []);
  const [when, setWhen] = useState<Date>(() => new Date(controller.getVirtualMs()));
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);

  useEffect(() => {
    const saved = loadSavedObserver();
    if (saved) setObserver(saved);
  }, []);

  // Drive the sky's "when" from the controller. State changes (pause/play/
  // scrub/reset/speed) push immediately; while running, a RAF loop pushes
  // new virtual times at most SKY_UPDATE_HZ real-time ticks per second so
  // we don't rebuild the 9k-star geometry every animation frame.
  const lastRealPushRef = useRef(0);
  useEffect(() => {
    const minRealInterval = 1000 / SKY_UPDATE_HZ;
    const apply = (snap: TimeSnapshot) => {
      setWhen(new Date(snap.virtualMs));
      lastRealPushRef.current = performance.now();
    };

    const unsub = controller.subscribe(apply);

    let raf = 0;
    const loop = () => {
      const snap = controller.snapshot();
      if (
        snap.mode === "running" &&
        performance.now() - lastRealPushRef.current >= minRealInterval
      ) {
        apply(snap);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      unsub();
      cancelAnimationFrame(raf);
    };
  }, [controller]);

  const handleResolve = (next: SavedObserver) => {
    setObserver(next);
    saveObserver(next);
  };

  const handleSelectStar = useCallback((star: Star) => {
    setSelectedStar(star);
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelectedStar(null);
  }, []);

  return (
    <main style={{ height: "100vh", width: "100vw" }}>
      <SkyCanvas
        observer={observer ?? DEFAULT_OBSERVER}
        when={when}
        onSelectStar={handleSelectStar}
      />
      <LocationPrompt observer={observer} onResolve={handleResolve} />
      <TimeScrubber controller={controller} />
      <StarPopup star={selectedStar} onClose={handleClosePopup} />
    </main>
  );
}
