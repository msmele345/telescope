"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
import TimeScrubber from "@/components/TimeScrubber";
import { TimeController, type TimeSnapshot } from "@/lib/time-controller";
import StarPopup from "@/components/StarPopup";
import PlanetPopup from "@/components/PlanetPopup";
import MessierPopup from "@/components/MessierPopup";
import type { Star } from "@/lib/star-catalog";
import type { SolarBody } from "@/lib/solar-system";
import type { MessierObject } from "@/lib/messier";
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

type Selection =
  | { kind: "star"; data: Star }
  | { kind: "planet"; data: SolarBody }
  | { kind: "messier"; data: MessierObject };

export default function Home() {
  const [observer, setObserver] = useState<SavedObserver | null>(null);
  const controller = useMemo(() => new TimeController(), []);
  const [when, setWhen] = useState<Date>(() => new Date(controller.getVirtualMs()));
  const [selection, setSelection] = useState<Selection | null>(null);

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
    setSelection({ kind: "star", data: star });
  }, []);

  const handleSelectPlanet = useCallback((body: SolarBody) => {
    setSelection({ kind: "planet", data: body });
  }, []);

  const handleSelectMessier = useCallback((object: MessierObject) => {
    setSelection({ kind: "messier", data: object });
  }, []);

  const handleClosePopup = useCallback(() => {
    setSelection(null);
  }, []);

  return (
    <main style={{ height: "100vh", width: "100vw" }}>
      <SkyCanvas
        observer={observer ?? DEFAULT_OBSERVER}
        when={when}
        onSelectStar={handleSelectStar}
        onSelectPlanet={handleSelectPlanet}
        onSelectMessier={handleSelectMessier}
      />
      <LocationPrompt observer={observer} onResolve={handleResolve} />
      <TimeScrubber controller={controller} />
      {selection?.kind === "star" && (
        <StarPopup star={selection.data} onClose={handleClosePopup} />
      )}
      {selection?.kind === "planet" && (
        <PlanetPopup body={selection.data} onClose={handleClosePopup} />
      )}
      {selection?.kind === "messier" && (
        <MessierPopup object={selection.data} onClose={handleClosePopup} />
      )}
    </main>
  );
}
