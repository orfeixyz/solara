const { query } = require('./db');

async function getById(islandId) {
  const result = await query(
    `SELECT i.id, i.user_id, i.grid, i.energy, i.water, i.biomass, i.time_multiplier,
            i.first_level3_announced, i.alpha_completed, u.bioma
     FROM islands i
     JOIN users u ON u.id = i.user_id
     WHERE i.id = $1`,
    [islandId]
  );
  return result.rows[0] || null;
}

async function getByUserId(userId) {
  const result = await query(
    `SELECT i.id, i.user_id, i.grid, i.energy, i.water, i.biomass, i.time_multiplier,
            i.first_level3_announced, i.alpha_completed, u.bioma
     FROM islands i
     JOIN users u ON u.id = i.user_id
     WHERE i.user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function getAll() {
  const result = await query(
    `SELECT i.id, i.user_id, i.grid, i.energy, i.water, i.biomass, i.time_multiplier,
            i.first_level3_announced, i.alpha_completed, u.bioma
     FROM islands i
     JOIN users u ON u.id = i.user_id`
  );
  return result.rows;
}

async function updateResourcesAndMultiplier(client, islandId, values) {
  const result = await client.query(
    `UPDATE islands
     SET energy = $2,
         water = $3,
         biomass = $4,
         time_multiplier = $5,
         first_level3_announced = $6,
         alpha_completed = $7
     WHERE id = $1
     RETURNING id, user_id, grid, energy, water, biomass, time_multiplier,
               first_level3_announced, alpha_completed`,
    [
      islandId,
      values.energy,
      values.water,
      values.biomass,
      values.time_multiplier,
      Boolean(values.first_level3_announced),
      Boolean(values.alpha_completed)
    ]
  );
  return result.rows[0];
}

async function updateGridAndResources(client, islandId, { grid, energy, water, biomass }) {
  const result = await client.query(
    `UPDATE islands
     SET grid = $2::jsonb,
         energy = $3,
         water = $4,
         biomass = $5
     WHERE id = $1
     RETURNING id, user_id, grid, energy, water, biomass, time_multiplier,
               first_level3_announced, alpha_completed`,
    [islandId, JSON.stringify(grid), energy, water, biomass]
  );
  return result.rows[0];
}

async function setTimeMultiplier(client, islandId, multiplier) {
  const result = await client.query(
    `UPDATE islands
     SET time_multiplier = $2
     WHERE id = $1
     RETURNING id, user_id, grid, energy, water, biomass, time_multiplier,
               first_level3_announced, alpha_completed`,
    [islandId, multiplier]
  );
  return result.rows[0];
}

module.exports = {
  getById,
  getByUserId,
  getAll,
  updateResourcesAndMultiplier,
  updateGridAndResources,
  setTimeMultiplier
};
