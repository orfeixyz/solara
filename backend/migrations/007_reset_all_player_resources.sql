-- Global resource reset after balance update
UPDATE islands
SET
  energy = 350,
  water = 250,
  biomass = 300,
  time_multiplier = 1,
  last_tick_at = NOW(),
  updated_at = NOW();

UPDATE helium_core_state
SET
  active = FALSE,
  activated_by = NULL,
  activated_at = NULL,
  total_energy = 0,
  total_water = 0,
  total_biomass = 0,
  restart_requested = FALSE,
  restart_requested_by = NULL,
  restart_requested_at = NULL,
  updated_at = NOW()
WHERE id = 1;

DELETE FROM helium_core_contributions;
DELETE FROM helium_core_restart_votes;
