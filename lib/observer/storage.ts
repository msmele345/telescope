import type { ObserverLocation } from "./defaults";

const STORAGE_KEY = "telescope:observer";
const SCHEMA_VERSION = 1;

export interface SavedObserver extends ObserverLocation {
  zip?: string;
  city?: string;
  state?: string;
}

interface Envelope {
  v: number;
  observer: SavedObserver;
}

function hasStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadSavedObserver(): SavedObserver | null {
  if (!hasStorage()) return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Envelope;
    if (parsed?.v !== SCHEMA_VERSION) return null;
    const o = parsed.observer;
    if (
      !o ||
      typeof o.lat !== "number" ||
      typeof o.lng !== "number" ||
      !Number.isFinite(o.lat) ||
      !Number.isFinite(o.lng)
    ) {
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

export function saveObserver(observer: SavedObserver): void {
  if (!hasStorage()) return;
  const envelope: Envelope = { v: SCHEMA_VERSION, observer };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
}

export function clearSavedObserver(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}
