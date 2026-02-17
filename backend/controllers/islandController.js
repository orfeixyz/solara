const islandModel = require('../models/islandModel');
const buildingModel = require('../models/buildingModel');

async function getIsland(req, res) {
  try {
    const islandId = Number(req.params.id);
    if (!Number.isInteger(islandId)) {
      return res.status(400).json({ error: 'invalid island id' });
    }

    const island = await islandModel.getById(islandId);
    if (!island) {
      return res.status(404).json({ error: 'island not found' });
    }

    if (island.user_id !== req.user.id) {
      return res.status(403).json({ error: 'not allowed to view this island' });
    }

    const buildings = await buildingModel.getByIslandId(islandId);

    return res.json({
      island,
      buildings
    });
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch island', details: error.message });
  }
}

module.exports = {
  getIsland
};
