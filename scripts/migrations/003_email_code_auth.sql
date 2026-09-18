-- v2 lightweight auth: replace the NextAuth/pg-adapter identity tables with
-- the two this app actually needs — one row per active session, one row per
-- login code requested in the last hour.
--
-- The users table is deliberately untouched: every application table carries
-- an integer foreign key into it, and its UNIQUE email is what makes an email
-- address the account identity.

-- OAuth adapter artifacts with no remaining consumer.
DROP TABLE IF EXISTS accounts;
DROP TABLE IF EXISTS verification_token;

-- The adapter's session shape is not reused: we store only the SHA-256 hash
-- of the opaque token, so a database disclosure yields nothing replayable.
DROP TABLE IF EXISTS sessions;

CREATE TABLE sessions (
  token_hash CHAR(64)    PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX sessions_user_idx ON sessions (user_id);

-- One table serves two roles. `consumed` and `expires_at` decide whether the
-- newest row can still verify; `created_at` makes every row — spent, expired
-- or live — a unit of the hour of request history the rate limiter counts.
-- Rows are therefore retained for the full rate-limit window, not deleted on
-- use or expiry, and cleaned up opportunistically when a code is requested.
CREATE TABLE login_codes (
  id         SERIAL      PRIMARY KEY,
  email      VARCHAR(255) NOT NULL,
  code_hash  CHAR(64)    NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts   INTEGER     NOT NULL DEFAULT 0,
  consumed   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX login_codes_email_idx ON login_codes (email, created_at DESC);
