const { withTransaction } = require('../models/db');
const { getIslandResourcesByUser } = require('../services/productionService');

async function getResources(req, res) {
  try {
    const resources = await getIslandResourcesByUser(req.user.id);
    if (!resources) {
      return res.status(404).json({ error: 'island not found' });
    }

    return res.json(resources);
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch resources', details: error.message });
  }
}

async function setTimeMultiplier(req, res) {
  try {
    const requested = Number(req.body?.multiplier);
    if (![1, 2, 5].includes(requested)) {
      return res.status(400).json({ error: 'multiplier must be 1, 2 or 5' });
    }

    const updated = await withTransaction(async (client) => {
      const islandRes = await client.query(
        `SELECT id, user_id, energy, water, biomass, time_multiplier
         FROM islands
         WHERE user_id = $1
         FOR UPDATE`,
        [req.user.id]
      );

      const island = islandRes.rows[0];
      if (!island) {
        return null;
      }

      const next = (
        await client.query(
          `UPDATE islands
           SET time_multiplier = $2
           WHERE id = $1
           RETURNING id, user_id, energy, water, biomass, time_multiplier`,
          [island.id, requested]
        )
      ).rows[0];

      return next;
    });

    if (!updated) {
      return res.status(404).json({ error: 'island not found' });
    }

    return res.json({
      ok: true,
      time_multiplier: updated.time_multiplier
    });
  } catch (error) {
    return res.status(500).json({ error: 'failed to update multiplier', details: error.message });
  }
}

module.exports = {
  getResources,
  setTimeMultiplier
};
