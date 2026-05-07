import type { CSSProperties } from "react";

export function actionButtonStyle(active: boolean): CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 8,
    border: active
      ? "1px solid rgba(255, 210, 120, 0.6)"
      : "1px solid rgba(120, 150, 220, 0.4)",
    background: active
      ? "rgba(255, 210, 120, 0.12)"
      : "rgba(120, 150, 220, 0.08)",
    color: active ? "#ffd278" : "#cfdbff",
    fontSize: 13,
    fontWeight: 500,
    fontFamily: "inherit",
    cursor: "pointer",
  };
}

export const signInLinkStyle: CSSProperties = {
  display: "inline-block",
  color: "#9ec0ff",
  textDecoration: "none",
  fontSize: 13,
  borderBottom: "1px solid rgba(158, 192, 255, 0.4)",
  paddingBottom: 1,
};

export const actionRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginTop: 12,
};
