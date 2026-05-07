import { pool } from "@/lib/db";

export type FavoriteType = "star" | "constellation";

export interface FavoriteRow {
  target_type: FavoriteType;
  target_id: string;
  created_at: Date;
}

export interface TimestampedRow {
  constellation_id: string;
  ts: Date;
}

function uid(userId: string | number): number | null {
  const id = Number(userId);
  return Number.isFinite(id) ? id : null;
}

export async function isFavorite(
  userId: string | number,
  type: FavoriteType,
  targetId: string
): Promise<boolean> {
  const id = uid(userId);
  if (id === null) return false;
  const { rowCount } = await pool.query(
    `SELECT 1 FROM favorites
      WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
    [id, type, targetId]
  );
  return (rowCount ?? 0) > 0;
}

export async function addFavorite(
  userId: string | number,
  type: FavoriteType,
  targetId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `INSERT INTO favorites (user_id, target_type, target_id)
     VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING`,
    [id, type, targetId]
  );
}

export async function removeFavorite(
  userId: string | number,
  type: FavoriteType,
  targetId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `DELETE FROM favorites
      WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
    [id, type, targetId]
  );
}

export async function listFavorites(
  userId: string | number
): Promise<FavoriteRow[]> {
  const id = uid(userId);
  if (id === null) return [];
  const { rows } = await pool.query<FavoriteRow>(
    `SELECT target_type, target_id, created_at
       FROM favorites
      WHERE user_id = $1
      ORDER BY created_at DESC`,
    [id]
  );
  return rows;
}

export async function isViewed(
  userId: string | number,
  constellationId: string
): Promise<boolean> {
  const id = uid(userId);
  if (id === null) return false;
  const { rowCount } = await pool.query(
    `SELECT 1 FROM viewed_constellations
      WHERE user_id = $1 AND constellation_id = $2`,
    [id, constellationId]
  );
  return (rowCount ?? 0) > 0;
}

export async function markViewed(
  userId: string | number,
  constellationId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `INSERT INTO viewed_constellations (user_id, constellation_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, constellationId]
  );
}

export async function unmarkViewed(
  userId: string | number,
  constellationId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `DELETE FROM viewed_constellations
      WHERE user_id = $1 AND constellation_id = $2`,
    [id, constellationId]
  );
}

export async function isRead(
  userId: string | number,
  constellationId: string
): Promise<boolean> {
  const id = uid(userId);
  if (id === null) return false;
  const { rowCount } = await pool.query(
    `SELECT 1 FROM read_lessons
      WHERE user_id = $1 AND constellation_id = $2`,
    [id, constellationId]
  );
  return (rowCount ?? 0) > 0;
}

export async function markRead(
  userId: string | number,
  constellationId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `INSERT INTO read_lessons (user_id, constellation_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [id, constellationId]
  );
}

export async function unmarkRead(
  userId: string | number,
  constellationId: string
): Promise<void> {
  const id = uid(userId);
  if (id === null) throw new Error("Invalid user id");
  await pool.query(
    `DELETE FROM read_lessons
      WHERE user_id = $1 AND constellation_id = $2`,
    [id, constellationId]
  );
}
