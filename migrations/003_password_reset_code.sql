BEGIN;

CREATE TABLE password_reset_code (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  code VARCHAR(6) NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX password_reset_code_lookup_idx
  ON password_reset_code (user_id, code, used, expires_at, created_at DESC);

COMMIT;