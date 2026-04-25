"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
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

export default function Home() {
  const [observer, setObserver] = useState<SavedObserver | null>(null);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);

  useEffect(() => {
    const saved = loadSavedObserver();
    if (saved) setObserver(saved);
  }, []);

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
        onSelectStar={handleSelectStar}
      />
      <LocationPrompt observer={observer} onResolve={handleResolve} />
      <StarPopup star={selectedStar} onClose={handleClosePopup} />
    </main>
  );
}
