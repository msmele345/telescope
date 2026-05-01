import { pool } from "@/lib/db";
import type { SavedObserver } from "@/lib/observer";

export interface UserSettingsRow {
  user_id: number;
  zipcode: string | null;
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
}

export async function getUserSettings(
  userId: string | number
): Promise<UserSettingsRow | null> {
  const id = Number(userId);
  if (!Number.isFinite(id)) return null;
  const { rows } = await pool.query<UserSettingsRow>(
    `SELECT user_id, zipcode, lat, lng, city, state
       FROM user_settings
      WHERE user_id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function upsertUserSettings(
  userId: string | number,
  observer: SavedObserver
): Promise<void> {
  const id = Number(userId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid user id");
  }
  await pool.query(
    `INSERT INTO user_settings (user_id, zipcode, lat, lng, city, state, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (user_id) DO UPDATE
       SET zipcode = EXCLUDED.zipcode,
           lat     = EXCLUDED.lat,
           lng     = EXCLUDED.lng,
           city    = EXCLUDED.city,
           state   = EXCLUDED.state,
           updated_at = NOW()`,
    [
      id,
      observer.zip ?? null,
      observer.lat,
      observer.lng,
      observer.city ?? null,
      observer.state ?? null,
    ]
  );
}
