const { query } = require('./db');

async function addLog({ islandId, energyProduced, waterProduced, biomassProduced }) {
  const result = await query(
    `INSERT INTO production_log (island_id, energy_produced, water_produced, biomass_produced)
     VALUES ($1, $2, $3, $4)
     RETURNING id, island_id, timestamp, energy_produced, water_produced, biomass_produced`,
    [islandId, energyProduced, waterProduced, biomassProduced]
  );
  return result.rows[0];
}

module.exports = {
  addLog
};
