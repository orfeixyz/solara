const { withTransaction } = require('../models/db');
const chatModel = require('../models/chatModel');
const {
  createEmptyGrid,
  getBuildCost,
  BUILDING_CONFIG,
  MAX_BUILDING_LEVEL
} = require('../models/gameRules');

const FRONTEND_TO_BACKEND_BUILDING = {
  centro_solar: 'solar_center',
  biojardin: 'bio_garden',
  centro_comunitario: 'community_center'
};

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeBuildingType(inputType) {
  if (!inputType) {
    return null;
  }
  return FRONTEND_TO_BACKEND_BUILDING[inputType] || inputType;
}

function buildGridFromBuildings(buildings) {
  const grid = createEmptyGrid();
  for (const b of buildings) {
    if (grid[b.pos_y] && typeof grid[b.pos_y][b.pos_x] !== 'undefined') {
      grid[b.pos_y][b.pos_x] = { id: b.id, type: b.type, level: b.level };
    }
  }
  return grid;
}

async function buildOrUpgrade(req, res) {
  try {
    const parsedIslandId = Number(req.body.islandId);
    const x = Number(req.body.posX ?? req.body.x);
    const y = Number(req.body.posY ?? req.body.y);
    const requestedLevel = Number(req.body.level || 1);
    const action = req.body.action || (requestedLevel > 1 ? 'upgrade' : 'build');
    const requestedType = normalizeBuildingType(req.body.type || req.body.buildingId);

    if (!Number.isInteger(parsedIslandId) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).json({ error: 'islandId, posX and posY must be integers' });
    }

    if (x < 0 || x > 4 || y < 0 || y > 4) {
      return res.status(400).json({ error: 'grid coordinates must be within 0..4' });
    }

    if (!['build', 'upgrade'].includes(action)) {
      return res.status(400).json({ error: 'action must be build or upgrade' });
    }

    if (action === 'build' && !BUILDING_CONFIG[requestedType]) {
      return res.status(400).json({ error: 'unknown building type' });
    }

    const result = await withTransaction(async (client) => {
      const islandRes = await client.query(
        `SELECT i.id, i.user_id, i.grid, i.energy, i.water, i.biomass, i.time_multiplier,
                i.first_level3_announced, i.alpha_completed
         FROM islands i
         WHERE i.id = $1
         FOR UPDATE`,
        [parsedIslandId]
      );

      const island = islandRes.rows[0];
      if (!island) {
        throw createHttpError(404, 'island not found');
      }

      if (island.user_id !== req.user.id) {
        throw createHttpError(403, 'not allowed to modify this island');
      }

      const existingRes = await client.query(
        `SELECT id, island_id, type, level, pos_x, pos_y
         FROM buildings
         WHERE island_id = $1 AND pos_x = $2 AND pos_y = $3
         FOR UPDATE`,
        [parsedIslandId, x, y]
      );

      const existing = existingRes.rows[0] || null;

      if (action === 'build' && existing) {
        throw createHttpError(409, 'cell is not empty');
      }

      if (action === 'upgrade' && !existing) {
        throw createHttpError(404, 'no building found to upgrade at that position');
      }

      const effectiveType = existing ? existing.type : requestedType;
      const nextLevel = existing ? existing.level + 1 : 1;

      if (!BUILDING_CONFIG[effectiveType]) {
        throw createHttpError(400, 'unknown building type');
      }

      if (nextLevel > MAX_BUILDING_LEVEL) {
        throw createHttpError(409, `building is already at max level ${MAX_BUILDING_LEVEL}`);
      }

      const cost = getBuildCost(effectiveType, nextLevel);
      if (!cost) {
        throw createHttpError(400, 'invalid build cost configuration');
      }

      if (island.energy < cost.energy || island.water < cost.water || island.biomass < cost.biomass) {
        throw createHttpError(409, 'insufficient resources');
      }

      const newResources = {
        energy: island.energy - cost.energy,
        water: island.water - cost.water,
        biomass: island.biomass - cost.biomass
      };

      let affectedBuilding;

      if (existing) {
        const updateRes = await client.query(
          `UPDATE buildings
           SET level = $2
           WHERE id = $1
           RETURNING id, island_id, type, level, pos_x, pos_y`,
          [existing.id, nextLevel]
        );
        affectedBuilding = updateRes.rows[0];
      } else {
        const insertRes = await client.query(
          `INSERT INTO buildings (island_id, type, level, pos_x, pos_y)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, island_id, type, level, pos_x, pos_y`,
          [parsedIslandId, effectiveType, 1, x, y]
        );
        affectedBuilding = insertRes.rows[0];
      }

      const buildingListRes = await client.query(
        `SELECT id, island_id, type, level, pos_x, pos_y
         FROM buildings
         WHERE island_id = $1`,
        [parsedIslandId]
      );

      const buildings = buildingListRes.rows;
      const grid = buildGridFromBuildings(buildings);

      const hasLevel3Now = buildings.some((item) => item.level >= 3);
      const firstLevel3ReachedNow = !island.first_level3_announced && hasLevel3Now;

      const islandUpdateRes = await client.query(
        `UPDATE islands
         SET grid = $2::jsonb,
             energy = $3,
             water = $4,
             biomass = $5,
             first_level3_announced = $6
         WHERE id = $1
         RETURNING id, user_id, grid, energy, water, biomass, time_multiplier,
                   first_level3_announced, alpha_completed`,
        [
          parsedIslandId,
          JSON.stringify(grid),
          newResources.energy,
          newResources.water,
          newResources.biomass,
          island.first_level3_announced || firstLevel3ReachedNow
        ]
      );

      return {
        island: islandUpdateRes.rows[0],
        building: affectedBuilding,
        buildings,
        spent: cost,
        milestones: {
          firstLevel3ReachedNow
        }
      };
    });

    const io = req.app.get('io');

    io.to(`island:${result.island.id}`).emit('building_update', {
      islandId: result.island.id,
      building: result.building,
      buildings: result.buildings
    });

    io.to(`island:${result.island.id}`).emit('resource_update', {
      islandId: result.island.id,
      energy: result.island.energy,
      water: result.island.water,
      biomass: result.island.biomass,
      time_multiplier: result.island.time_multiplier
    });

    if (result.milestones.firstLevel3ReachedNow) {
      const systemMessage = 'System: milestone reached - first level 3 building unlocked.';
      const saved = await chatModel.addMessage({ userId: null, message: systemMessage });
      io.emit('chat_message', saved);
    }

    return res.json({
      message: 'build action applied',
      island: result.island,
      building: result.building,
      buildings: result.buildings,
      resources_spent: result.spent
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'build failed' });
  }
}

async function destroyBuilding(req, res) {
  try {
    const parsedIslandId = Number(req.body.islandId);
    const x = Number(req.body.posX ?? req.body.x);
    const y = Number(req.body.posY ?? req.body.y);

    if (!Number.isInteger(parsedIslandId) || !Number.isInteger(x) || !Number.isInteger(y)) {
      return res.status(400).json({ error: 'islandId, posX and posY must be integers' });
    }

    if (x < 0 || x > 4 || y < 0 || y > 4) {
      return res.status(400).json({ error: 'grid coordinates must be within 0..4' });
    }

    const result = await withTransaction(async (client) => {
      const islandRes = await client.query(
        `SELECT id, user_id, grid, energy, water, biomass, time_multiplier
         FROM islands
         WHERE id = $1
         FOR UPDATE`,
        [parsedIslandId]
      );

      const island = islandRes.rows[0];
      if (!island) {
        throw createHttpError(404, 'island not found');
      }

      if (island.user_id !== req.user.id) {
        throw createHttpError(403, 'not allowed to modify this island');
      }

      const existingRes = await client.query(
        `SELECT id, island_id, type, level, pos_x, pos_y
         FROM buildings
         WHERE island_id = $1 AND pos_x = $2 AND pos_y = $3
         FOR UPDATE`,
        [parsedIslandId, x, y]
      );

      const existing = existingRes.rows[0] || null;
      if (!existing) {
        throw createHttpError(404, 'no building found at that position');
      }

      await client.query('DELETE FROM buildings WHERE id = $1', [existing.id]);

      const buildingListRes = await client.query(
        `SELECT id, island_id, type, level, pos_x, pos_y
         FROM buildings
         WHERE island_id = $1`,
        [parsedIslandId]
      );

      const buildings = buildingListRes.rows;
      const grid = buildGridFromBuildings(buildings);

      const islandUpdateRes = await client.query(
        `UPDATE islands
         SET grid = $2::jsonb
         WHERE id = $1
         RETURNING id, user_id, grid, energy, water, biomass, time_multiplier,
                   first_level3_announced, alpha_completed`,
        [parsedIslandId, JSON.stringify(grid)]
      );

      return {
        island: islandUpdateRes.rows[0],
        removedBuilding: existing,
        buildings
      };
    });

    const io = req.app.get('io');

    io.to(`island:${result.island.id}`).emit('building_update', {
      islandId: result.island.id,
      building: null,
      buildings: result.buildings
    });

    io.to(`island:${result.island.id}`).emit('resource_update', {
      islandId: result.island.id,
      energy: result.island.energy,
      water: result.island.water,
      biomass: result.island.biomass,
      time_multiplier: result.island.time_multiplier
    });

    return res.json({
      message: 'destroy action applied',
      island: result.island,
      removedBuilding: result.removedBuilding,
      buildings: result.buildings
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'destroy failed' });
  }
}

module.exports = {
  buildOrUpgrade,
  destroyBuilding
};
