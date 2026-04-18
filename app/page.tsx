"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import LocationPrompt from "@/components/LocationPrompt";
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

  useEffect(() => {
    const saved = loadSavedObserver();
    if (saved) setObserver(saved);
  }, []);

  const handleResolve = (next: SavedObserver) => {
    setObserver(next);
    saveObserver(next);
  };

  return (
    <main style={{ height: "100vh", width: "100vw" }}>
      <SkyCanvas observer={observer ?? DEFAULT_OBSERVER} />
      <LocationPrompt observer={observer} onResolve={handleResolve} />
    </main>
  );
}
