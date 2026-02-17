const { query } = require('./db');

async function getByIslandId(islandId) {
  const result = await query(
    `SELECT id, island_id, type, level, pos_x, pos_y
     FROM buildings
     WHERE island_id = $1
     ORDER BY id ASC`,
    [islandId]
  );
  return result.rows;
}

async function getByPosition(client, islandId, x, y) {
  const result = await client.query(
    `SELECT id, island_id, type, level, pos_x, pos_y
     FROM buildings
     WHERE island_id = $1 AND pos_x = $2 AND pos_y = $3`,
    [islandId, x, y]
  );
  return result.rows[0] || null;
}

async function createBuilding(client, { islandId, type, level, posX, posY }) {
  const result = await client.query(
    `INSERT INTO buildings (island_id, type, level, pos_x, pos_y)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, island_id, type, level, pos_x, pos_y`,
    [islandId, type, level, posX, posY]
  );
  return result.rows[0];
}

async function updateBuildingLevel(client, buildingId, nextLevel) {
  const result = await client.query(
    `UPDATE buildings
     SET level = $2
     WHERE id = $1
     RETURNING id, island_id, type, level, pos_x, pos_y`,
    [buildingId, nextLevel]
  );
  return result.rows[0];
}

module.exports = {
  getByIslandId,
  getByPosition,
  createBuilding,
  updateBuildingLevel
};
