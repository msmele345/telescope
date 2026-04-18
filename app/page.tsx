"use client";

import dynamic from "next/dynamic";

const SkyCanvas = dynamic(() => import("@/components/SkyCanvas"), {
  ssr: false,
});

export default function Home() {
  return (
    <main style={{ height: "100vh", width: "100vw" }}>
      <SkyCanvas />
    </main>
  );
}
