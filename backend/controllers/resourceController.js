const islandModel = require('../models/islandModel');

async function getResources(req, res) {
  try {
    const island = await islandModel.getByUserId(req.user.id);
    if (!island) {
      return res.status(404).json({ error: 'island not found' });
    }

    return res.json({
      island_id: island.id,
      energy: island.energy,
      water: island.water,
      biomass: island.biomass,
      time_multiplier: island.time_multiplier
    });
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch resources', details: error.message });
  }
}

module.exports = {
  getResources
};
