-- Phase 9: per-user favorites + history.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS.

-- Stars and constellations live in static catalogs (Yale BSC + IAU list), so
-- target_id is just an opaque text key — HR id (e.g. "2061") for stars, slug
-- (e.g. "orion") for constellations. We don't FK these into a catalog table
-- because the catalog is not persisted in Postgres.
CREATE TABLE IF NOT EXISTS favorites (
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('star', 'constellation')),
  target_id   VARCHAR(64) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS favorites_user_idx
  ON favorites (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS viewed_constellations (
  user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  constellation_id VARCHAR(64) NOT NULL,
  viewed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, constellation_id)
);

CREATE TABLE IF NOT EXISTS read_lessons (
  user_id          INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  constellation_id VARCHAR(64) NOT NULL,
  read_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, constellation_id)
);
