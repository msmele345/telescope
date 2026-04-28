-- Auth.js (NextAuth v5) tables expected by @auth/pg-adapter, plus the
-- application-owned UserSettings table for the Telescope observer location.
--
-- Re-runnable: every CREATE uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL       PRIMARY KEY,
  name         VARCHAR(255),
  email        VARCHAR(255) UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image        TEXT
);

CREATE TABLE IF NOT EXISTS accounts (
  id                   SERIAL       PRIMARY KEY,
  "userId"             INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                 VARCHAR(255) NOT NULL,
  provider             VARCHAR(255) NOT NULL,
  "providerAccountId"  VARCHAR(255) NOT NULL,
  refresh_token        TEXT,
  access_token         TEXT,
  expires_at           BIGINT,
  id_token             TEXT,
  scope                TEXT,
  session_state        TEXT,
  token_type           TEXT,
  UNIQUE (provider, "providerAccountId")
);

CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL       PRIMARY KEY,
  "userId"       INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires        TIMESTAMPTZ  NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT        NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT        NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Application-owned: persisted observer location for signed-in users.
CREATE TABLE IF NOT EXISTS user_settings (
  user_id    INTEGER     PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  zipcode    VARCHAR(16),
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  city       TEXT,
  state      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
