export interface ObserverLocation {
  lat: number;
  lng: number;
  label?: string;
}

export const DEFAULT_OBSERVER: ObserverLocation = {
  lat: 39.8283,
  lng: -98.5795,
  label: "US geographic center (Lebanon, Kansas)",
};
