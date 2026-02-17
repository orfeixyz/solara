-- Solara backend initial schema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  hashed_password TEXT NOT NULL,
  bioma TEXT NOT NULL,
  island_id INTEGER UNIQUE
);

CREATE TABLE IF NOT EXISTS islands (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grid JSONB NOT NULL,
  energy INTEGER NOT NULL DEFAULT 200,
  water INTEGER NOT NULL DEFAULT 200,
  biomass INTEGER NOT NULL DEFAULT 200,
  time_multiplier INTEGER NOT NULL DEFAULT 1 CHECK (time_multiplier IN (1,2,5)),
  first_level3_announced BOOLEAN NOT NULL DEFAULT FALSE,
  alpha_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_island_id_fkey'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_island_id_fkey
      FOREIGN KEY (island_id) REFERENCES islands(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS buildings (
  id SERIAL PRIMARY KEY,
  island_id INTEGER NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 3),
  pos_x INTEGER NOT NULL CHECK (pos_x >= 0 AND pos_x < 6),
  pos_y INTEGER NOT NULL CHECK (pos_y >= 0 AND pos_y < 6),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (island_id, pos_x, pos_y)
);

CREATE TABLE IF NOT EXISTS chat (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_log (
  id SERIAL PRIMARY KEY,
  island_id INTEGER NOT NULL REFERENCES islands(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  energy_produced INTEGER NOT NULL,
  water_produced INTEGER NOT NULL,
  biomass_produced INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_buildings_island_id ON buildings(island_id);
CREATE INDEX IF NOT EXISTS idx_chat_timestamp ON chat(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_production_log_island_id_timestamp ON production_log(island_id, timestamp DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_islands_updated_at ON islands;
CREATE TRIGGER trg_islands_updated_at
BEFORE UPDATE ON islands
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_buildings_updated_at ON buildings;
CREATE TRIGGER trg_buildings_updated_at
BEFORE UPDATE ON buildings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
