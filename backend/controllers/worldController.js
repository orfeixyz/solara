const { query } = require('../models/db');
const { computeEfficiency } = require('../models/gameRules');

function mapBiome(bioma) {
  const known = new Set(['solar_reef', 'cloud_forest', 'basalt_delta', 'crystal_bay']);
  if (known.has(bioma)) {
    return bioma;
  }
  return 'solar_reef';
}

async function getWorld(req, res) {
  try {
    const rows = (
      await query(
        `SELECT i.id, i.user_id, i.energy, i.water, i.biomass, i.time_multiplier,
                u.username, u.bioma
         FROM islands i
         JOIN users u ON u.id = i.user_id
         ORDER BY i.id ASC`
      )
    ).rows;

    const islands = rows.map((row) => ({
      id: String(row.id),
      name: `${row.username} Island`,
      ownerId: row.user_id,
      ownerName: row.username,
      biomeId: mapBiome(row.bioma),
      score: Number(row.energy) + Number(row.water) + Number(row.biomass),
      efficiency: Math.round(computeEfficiency(row.energy, row.water, row.biomass) * 100),
      position: { x: 0, y: 0 },
      time_multiplier: row.time_multiplier
    }));

    return res.json({ islands });
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch world', details: error.message });
  }
}

module.exports = {
  getWorld
};
