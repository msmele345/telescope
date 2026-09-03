"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
import TimeScrubber from "@/components/TimeScrubber";
import { TimeController, type TimeSnapshot } from "@/lib/time-controller";
import SkyDirectory from "@/components/SkyDirectory";
import StarPopup from "@/components/StarPopup";
import PlanetPopup from "@/components/PlanetPopup";
import MessierPopup from "@/components/MessierPopup";
import { loadCatalog, type Star } from "@/lib/star-catalog";
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
  const searchParams = useSearchParams();
  const focusStarParam = searchParams.get("star");

  useEffect(() => {
    const saved = loadSavedObserver();
    if (saved) setObserver(saved);
  }, []);

  // Deep-link: when navigated to /?star=ID (e.g. from /profile), look up the
  // star in the catalog and open its popup. Cancellable so a fast nav doesn't
  // stomp on a later selection.
  useEffect(() => {
    if (!focusStarParam) return;
    const targetId = Number(focusStarParam);
    if (!Number.isFinite(targetId)) return;
    let cancelled = false;
    loadCatalog()
      .then((catalog) => {
        if (cancelled) return;
        const star = catalog.find((s) => s.id === targetId);
        if (star) setSelection({ kind: "star", data: star });
      })
      .catch(() => {
        // Catalog load is best-effort for deep-linking; silent on failure.
      });
    return () => {
      cancelled = true;
    };
  }, [focusStarParam]);

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
      <SkyDirectory onSelectStar={handleSelectStar} />
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
