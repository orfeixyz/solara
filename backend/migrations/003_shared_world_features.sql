-- Shared world + coop systems for serverless runtime
ALTER TABLE islands
  ADD COLUMN IF NOT EXISTS last_tick_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE islands
SET last_tick_at = COALESCE(last_tick_at, updated_at, NOW())
WHERE last_tick_at IS NULL;

CREATE TABLE IF NOT EXISTS player_presence (
  user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS helium_core_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active BOOLEAN NOT NULL DEFAULT FALSE,
  activated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  activated_at TIMESTAMPTZ,
  total_energy INTEGER NOT NULL DEFAULT 0,
  total_water INTEGER NOT NULL DEFAULT 0,
  total_biomass INTEGER NOT NULL DEFAULT 0,
  goal_energy INTEGER NOT NULL DEFAULT 1400,
  goal_water INTEGER NOT NULL DEFAULT 1400,
  goal_biomass INTEGER NOT NULL DEFAULT 1400,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO helium_core_state (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS helium_core_contributions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  island_id INTEGER NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  energy INTEGER NOT NULL DEFAULT 0,
  water INTEGER NOT NULL DEFAULT 0,
  biomass INTEGER NOT NULL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON player_presence(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_core_contrib_timestamp ON helium_core_contributions(timestamp DESC);
