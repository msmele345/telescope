export interface ZipLocation {
  zip: string;
  lat: number;
  lng: number;
  city?: string;
  state?: string;
}

export type ZipDatabase = ReadonlyMap<string, ZipLocation>;
