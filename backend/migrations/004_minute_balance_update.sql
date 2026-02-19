-- Minute-based balance update for Solara gameplay
ALTER TABLE islands
  ALTER COLUMN energy SET DEFAULT 350,
  ALTER COLUMN water SET DEFAULT 250,
  ALTER COLUMN biomass SET DEFAULT 300;

UPDATE islands
SET
  energy = GREATEST(energy, 350),
  water = GREATEST(water, 250),
  biomass = GREATEST(biomass, 300);

UPDATE helium_core_state
SET
  goal_energy = 1200,
  goal_water = 800,
  goal_biomass = 1000,
  updated_at = NOW()
WHERE id = 1;
