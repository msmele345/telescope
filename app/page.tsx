"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
import TimeScrubber from "@/components/TimeScrubber";
import { TimeController, type TimeSnapshot } from "@/lib/time-controller";
import SkyDirectory from "@/components/SkyDirectory";
import StarPopup from "@/components/StarPopup";
import PlanetPopup from "@/components/PlanetPopup";
import MessierPopup from "@/components/MessierPopup";
import TourPanel from "@/components/tour/TourPanel";
import TourNotice from "@/components/tour/TourNotice";
import { useTourPlayer } from "@/components/tour/useTourPlayer";
import { loadCatalog, type Star } from "@/lib/star-catalog";
import type { SolarBody } from "@/lib/solar-system";
import { getMessierById, type MessierObject } from "@/lib/messier";
import { jumpLabel, returnLabel } from "@/lib/tours";
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

/** `tourSlug` marks a popup the tour opened, rather than the visitor. */
type Selection =
  | { kind: "star"; data: Star; tourSlug?: string }
  | { kind: "planet"; data: SolarBody }
  | { kind: "messier"; data: MessierObject; tourSlug?: string };

const TOUR_LOCKED_REASON = "Time is set by the tour. Exit to change it.";

export default function Home() {
  const [observer, setObserver] = useState<SavedObserver | null>(null);
  const controller = useMemo(() => new TimeController(), []);
  const [when, setWhen] = useState<Date>(() => new Date(controller.getVirtualMs()));
  const [selection, setSelection] = useState<Selection | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const focusStarParam = searchParams.get("star");
  const tourParam = searchParams.get("tour");

  useEffect(() => {
    const saved = loadSavedObserver();
    if (saved) setObserver(saved);
  }, []);

  // The tour reads the observer when it starts, which can be before the
  // saved one has reached state, so fall back to reading it directly.
  const observerRef = useRef(observer);
  observerRef.current = observer;
  const getObserver = useCallback(
    () => observerRef.current ?? loadSavedObserver() ?? DEFAULT_OBSERVER,
    []
  );

  // A replace, not a push, so a refresh or Back doesn't restart the tour.
  const searchRef = useRef(searchParams);
  searchRef.current = searchParams;
  const clearTourParam = useCallback(() => {
    const params = new URLSearchParams(searchRef.current.toString());
    params.delete("tour");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [router, pathname]);

  const tour = useTourPlayer({ slug: tourParam, controller, getObserver, clearTourParam });
  const activeTour = tour.state.status === "active" ? tour.state : null;
  const tourStop = activeTour ? activeTour.tour.stops[activeTour.stop] : null;
  const tourSlug = activeTour?.tour.slug ?? null;

  // What the camera points at: the current stop, or nothing (75°) otherwise.
  const tourStopKind = tourStop?.kind;
  const tourStopId = tourStop?.id;
  const cameraFocus = useMemo(() => {
    if (tourStopKind === "star") return { kind: "star" as const, id: tourStopId as number };
    if (tourStopKind === "messier") return { kind: "messier" as const, id: tourStopId as string };
    if (tourStopKind === "constellation") {
      return { kind: "constellation" as const, id: tourStopId as string };
    }
    return null;
  }, [tourStopKind, tourStopId]);

  // Star and Messier stops open their popup; a constellation stop, or the
  // end of the tour, closes one the tour opened.
  const tourStars = activeTour?.catalogs.stars;
  useEffect(() => {
    if (!tourSlug || !tourStopKind) {
      setSelection((s) => (s && "tourSlug" in s && s.tourSlug ? null : s));
      return;
    }
    if (tourStopKind === "star") {
      const star = tourStars?.find((s) => s.id === tourStopId);
      setSelection(star ? { kind: "star", data: star, tourSlug } : null);
    } else if (tourStopKind === "messier") {
      const object = getMessierById(tourStopId as string);
      setSelection(object ? { kind: "messier", data: object, tourSlug } : null);
    } else {
      setSelection(null);
    }
  }, [tourSlug, tourStopKind, tourStopId, tourStars]);

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
        focus={cameraFocus}
      />
      <SkyDirectory onSelectStar={handleSelectStar} />
      <LocationPrompt observer={observer} onResolve={handleResolve} />
      <TimeScrubber
        controller={controller}
        lockedReason={activeTour ? TOUR_LOCKED_REASON : undefined}
      />
      {activeTour && (
        <TourPanel
          tour={activeTour.tour}
          stop={activeTour.stop}
          leaving={activeTour.leaving}
          jumpNote={activeTour.time.tonight ? null : jumpLabel(activeTour.time.at)}
          returnText={returnLabel(activeTour.saved, new Date(controller.getRealMs()))}
          popupOpen={selection !== null}
          onNext={tour.next}
          onBack={tour.back}
          onRequestLeave={tour.requestLeave}
          onCancelLeave={tour.cancelLeave}
          onLeave={tour.leave}
        />
      )}
      {tour.state.status === "unavailable" && (
        <TourNotice
          message={`${tour.state.tour.title} isn't visible from your location`}
          onDismiss={tour.dismissNotice}
        />
      )}
      {selection?.kind === "star" && (
        <StarPopup
          star={selection.data}
          onClose={handleClosePopup}
          returnTo={selection.tourSlug ? `/?tour=${selection.tourSlug}` : undefined}
        />
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
