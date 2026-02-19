ALTER TABLE helium_core_state
  ADD COLUMN IF NOT EXISTS restart_requested BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS restart_requested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS restart_requested_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS helium_core_restart_votes (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL DEFAULT TRUE,
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_core_restart_votes_voted_at
  ON helium_core_restart_votes(voted_at DESC);
