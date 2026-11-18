"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Dev and preview only (see CAMERA_HARNESS_ENABLED): buttons that set
 * `?lookAt=` so the camera director can be tried by eye. Not a tour UI.
 */
const TARGETS: ReadonlyArray<{ label: string; value: string | null }> = [
  { label: "M42", value: "M42" },
  { label: "M45", value: "M45" },
  { label: "Betelgeuse", value: "2061" },
  { label: "Vega", value: "7001" },
  { label: "Orion", value: "Ori" },
  { label: "Ursa Major", value: "UMa" },
  { label: "Lyra", value: "Lyr" },
  { label: "Near zenith", value: "89.3,180" },
  { label: "Reset", value: null },
];

export default function CameraHarness() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = searchParams.get("lookAt");

  const go = (value: string | null) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("lookAt", value);
    else params.delete("lookAt");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <nav
      aria-label="Camera harness (dev only)"
      style={{
        position: "fixed",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: 8,
        background: "rgba(10, 14, 40, 0.8)",
        border: "1px dashed rgba(255, 210, 120, 0.6)",
        borderRadius: 6,
        font: "12px system-ui, sans-serif",
        color: "#e8ecff",
        zIndex: 20,
      }}
    >
      <span style={{ opacity: 0.7 }}>lookAt (dev)</span>
      {TARGETS.map(({ label, value }) => (
        <button
          key={label}
          type="button"
          onClick={() => go(value)}
          aria-pressed={current === value}
          style={{
            font: "inherit",
            color: "inherit",
            background: current === value ? "rgba(255, 210, 120, 0.25)" : "transparent",
            border: "1px solid rgba(232, 236, 255, 0.3)",
            borderRadius: 4,
            padding: "2px 8px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
