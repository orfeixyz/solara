const { withTransaction, query } = require('../models/db');
const buildingModel = require('../models/buildingModel');
const { computeProductionTick, computeEfficiency, hasRequiredLevel3 } = require('../models/gameRules');

function normalizeCoreRow(row) {
  const totals = {
    energy: Number(row.total_energy || 0),
    water: Number(row.total_water || 0),
    biomass: Number(row.total_biomass || 0)
  };

  const goals = {
    energy: Number(row.goal_energy || 0),
    water: Number(row.goal_water || 0),
    biomass: Number(row.goal_biomass || 0)
  };

  const readyToActivate =
    totals.energy >= goals.energy &&
    totals.water >= goals.water &&
    totals.biomass >= goals.biomass;

  return {
    active: Boolean(row.active),
    activatedBy: row.activated_by_username || null,
    activatedAt: row.activated_at || null,
    totals,
    goals,
    readyToActivate,
    remaining: {
      energy: Math.max(0, goals.energy - totals.energy),
      water: Math.max(0, goals.water - totals.water),
      biomass: Math.max(0, goals.biomass - totals.biomass)
    }
  };
}

function buildActivationRequirements({ island, buildings }) {
  const efficiency = Math.round(computeEfficiency(island.energy, island.water, island.biomass));
  const tick = computeProductionTick({ island, buildings });

  const checks = {
    min_one_building_level_3: hasRequiredLevel3(buildings),
    min_efficiency_90: efficiency >= 90,
    net_production_energy_positive: tick.net.energy > 0,
    net_production_water_positive: tick.net.water > 0,
    net_production_biomass_positive: tick.net.biomass > 0
  };

  return {
    efficiency,
    netProductionPerMinute: tick.net,
    checks,
    ready:
      checks.min_one_building_level_3 &&
      checks.min_efficiency_90 &&
      checks.net_production_energy_positive &&
      checks.net_production_water_positive &&
      checks.net_production_biomass_positive
  };
}

async function readCoreState(userId = null) {
  const row = (
    await query(
      `SELECT c.*, u.username AS activated_by_username
       FROM helium_core_state c
       LEFT JOIN users u ON u.id = c.activated_by
       WHERE c.id = 1`
    )
  ).rows[0];

  if (!row) {
    return null;
  }

  const latestContrib = (
    await query(
      `SELECT h.id, h.energy, h.water, h.biomass, h.timestamp, u.username
       FROM helium_core_contributions h
       JOIN users u ON u.id = h.user_id
       ORDER BY h.timestamp DESC
       LIMIT 20`
    )
  ).rows;

  const state = {
    ...normalizeCoreRow(row),
    contributions: latestContrib.map((item) => ({
      id: item.id,
      username: item.username,
      energy: Number(item.energy),
      water: Number(item.water),
      biomass: Number(item.biomass),
      createdAt: item.timestamp
    }))
  };

  if (!userId) {
    return state;
  }

  const island = (
    await query(
      `SELECT id, user_id, energy, water, biomass, time_multiplier
       FROM islands
       WHERE user_id = $1`,
      [userId]
    )
  ).rows[0];

  if (!island) {
    return state;
  }

  const buildings = await buildingModel.getByIslandId(island.id);
  return {
    ...state,
    activationRequirements: buildActivationRequirements({ island, buildings })
  };
}

async function getCoreState(req, res) {
  try {
    const state = await readCoreState(req.user?.id || null);
    if (!state) {
      return res.status(404).json({ error: 'core state not found' });
    }

    return res.json(state);
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch core state', details: error.message });
  }
}

async function contributeCore(req, res) {
  try {
    const energy = Math.max(0, Number(req.body?.energy || 0));
    const water = Math.max(0, Number(req.body?.water || 0));
    const biomass = Math.max(0, Number(req.body?.biomass || 0));

    if (!energy && !water && !biomass) {
      return res.status(400).json({ error: 'contribution must be greater than zero' });
    }

    await withTransaction(async (client) => {
      const islandRes = await client.query(
        `SELECT id, user_id, energy, water, biomass
         FROM islands
         WHERE user_id = $1
         FOR UPDATE`,
        [req.user.id]
      );
      const island = islandRes.rows[0];
      if (!island) {
        throw new Error('island not found');
      }

      if (island.energy < energy || island.water < water || island.biomass < biomass) {
        const err = new Error('insufficient resources for contribution');
        err.status = 409;
        throw err;
      }

      await client.query(
        `UPDATE islands
         SET energy = $2,
             water = $3,
             biomass = $4,
             updated_at = NOW()
         WHERE id = $1`,
        [
          island.id,
          island.energy - energy,
          island.water - water,
          island.biomass - biomass
        ]
      );

      await client.query(
        `UPDATE helium_core_state
         SET total_energy = total_energy + $2,
             total_water = total_water + $3,
             total_biomass = total_biomass + $4,
             updated_at = NOW()
         WHERE id = 1`,
        [1, energy, water, biomass]
      );

      await client.query(
        `INSERT INTO helium_core_contributions (user_id, island_id, energy, water, biomass)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.user.id, island.id, energy, water, biomass]
      );
    });

    const state = await readCoreState(req.user.id);
    return res.json(state);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: 'failed to contribute to core', details: error.message });
  }
}

async function activateCore(req, res) {
  try {
    await withTransaction(async (client) => {
      const row = (
        await client.query(
          `SELECT *
           FROM helium_core_state
           WHERE id = 1
           FOR UPDATE`
        )
      ).rows[0];

      if (!row) {
        throw new Error('core state not found');
      }

      if (row.active) {
        return;
      }

      const goalsReady =
        Number(row.total_energy) >= Number(row.goal_energy) &&
        Number(row.total_water) >= Number(row.goal_water) &&
        Number(row.total_biomass) >= Number(row.goal_biomass);

      if (!goalsReady) {
        const err = new Error('core goals not reached');
        err.status = 409;
        throw err;
      }

      const island = (
        await client.query(
          `SELECT id, user_id, energy, water, biomass, time_multiplier
           FROM islands
           WHERE user_id = $1
           FOR UPDATE`,
          [req.user.id]
        )
      ).rows[0];

      if (!island) {
        const err = new Error('island not found');
        err.status = 404;
        throw err;
      }

      const buildings = (
        await client.query(
          `SELECT id, island_id, type, level, pos_x, pos_y
           FROM buildings
           WHERE island_id = $1`,
          [island.id]
        )
      ).rows;

      const requirements = buildActivationRequirements({ island, buildings });
      if (!requirements.ready) {
        const err = new Error('activation requirements not met');
        err.status = 409;
        err.requirements = requirements;
        throw err;
      }

      await client.query(
        `UPDATE helium_core_state
         SET active = TRUE,
             activated_by = $2,
             activated_at = NOW(),
             updated_at = NOW()
         WHERE id = 1`,
        [1, req.user.id]
      );
    });

    const state = await readCoreState(req.user.id);
    return res.json(state);
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      error: 'failed to activate core',
      details: error.message,
      requirements: error.requirements || null
    });
  }
}

module.exports = {
  getCoreState,
  contributeCore,
  activateCore
};
