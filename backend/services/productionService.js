const { withTransaction, query } = require('../models/db');
const { computeEfficiency, computeProductionTick } = require('../models/gameRules');

const TICK_INTERVAL_MS = Number(process.env.TICK_INTERVAL_MS || 60000);
const MAX_CATCHUP_TICKS = 240;

function toDate(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date();
}

function computeImbalance(energy, water, biomass) {
  return Math.round((energy - water + (water - biomass)) / 2);
}

function toResourcePayload(island, tick) {
  const efficiencyValue = tick?.efficiency ?? computeEfficiency(island.energy, island.water, island.biomass);
  return {
    island_id: island.id,
    totals: {
      energy: island.energy,
      water: island.water,
      biomass: island.biomass
    },
    productionPerHour: {
      energy: tick?.net?.energy ?? 0,
      water: tick?.net?.water ?? 0,
      biomass: tick?.net?.biomass ?? 0
    },
    efficiency: Math.round(efficiencyValue * 100),
    imbalance: computeImbalance(island.energy, island.water, island.biomass),
    time_multiplier: island.time_multiplier
  };
}

async function loadIslandState(client, islandId) {
  const islandRes = await client.query(
    `SELECT i.id, i.user_id, i.energy, i.water, i.biomass, i.time_multiplier, i.last_tick_at,
            i.first_level3_announced, i.alpha_completed, u.bioma
     FROM islands i
     JOIN users u ON u.id = i.user_id
     WHERE i.id = $1
     FOR UPDATE`,
    [islandId]
  );

  const island = islandRes.rows[0];
  if (!island) {
    return null;
  }

  const buildingRows = (
    await client.query(
      `SELECT id, island_id, type, level, pos_x, pos_y
       FROM buildings
       WHERE island_id = $1`,
      [islandId]
    )
  ).rows;

  return { island, buildings: buildingRows };
}

function runSingleTick(stateIsland, biome, buildings) {
  let tick = computeProductionTick({
    island: stateIsland,
    biome,
    buildings
  });

  let finalMultiplier = stateIsland.time_multiplier;
  if (stateIsland.energy < tick.energyCost && stateIsland.time_multiplier > 1) {
    finalMultiplier = 1;
    tick = computeProductionTick({
      island: { ...stateIsland, time_multiplier: 1 },
      biome,
      buildings
    });
  }

  return {
    tick,
    next: {
      ...stateIsland,
      time_multiplier: finalMultiplier,
      energy: Math.max(0, stateIsland.energy + tick.net.energy),
      water: Math.max(0, stateIsland.water + tick.net.water),
      biomass: Math.max(0, stateIsland.biomass + tick.net.biomass)
    }
  };
}

async function advanceIslandToNow(islandId) {
  return withTransaction(async (client) => {
    const state = await loadIslandState(client, islandId);
    if (!state) {
      return null;
    }

    const baseIsland = state.island;
    const buildings = state.buildings;

    const now = Date.now();
    const lastTickAt = toDate(baseIsland.last_tick_at).getTime();
    const elapsed = Math.max(0, now - lastTickAt);
    const ticks = Math.min(MAX_CATCHUP_TICKS, Math.floor(elapsed / TICK_INTERVAL_MS));

    let current = {
      ...baseIsland,
      energy: Number(baseIsland.energy),
      water: Number(baseIsland.water),
      biomass: Number(baseIsland.biomass),
      time_multiplier: Number(baseIsland.time_multiplier) || 1
    };

    let lastTick = null;

    for (let i = 0; i < ticks; i += 1) {
      const result = runSingleTick(current, baseIsland.bioma, buildings);
      lastTick = result.tick;
      current = result.next;
    }

    if (ticks > 0) {
      const nextLastTickAt = new Date(lastTickAt + ticks * TICK_INTERVAL_MS).toISOString();

      const updated = (
        await client.query(
          `UPDATE islands
           SET energy = $2,
               water = $3,
               biomass = $4,
               time_multiplier = $5,
               last_tick_at = $6,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, user_id, energy, water, biomass, time_multiplier, last_tick_at`,
          [
            baseIsland.id,
            current.energy,
            current.water,
            current.biomass,
            current.time_multiplier,
            nextLastTickAt
          ]
        )
      ).rows[0];

      return {
        island: {
          ...baseIsland,
          ...updated,
          bioma: baseIsland.bioma
        },
        buildings,
        tick: lastTick || runSingleTick(current, baseIsland.bioma, buildings).tick,
        ticksApplied: ticks
      };
    }

    const currentTick = runSingleTick(current, baseIsland.bioma, buildings).tick;

    return {
      island: {
        ...baseIsland,
        energy: current.energy,
        water: current.water,
        biomass: current.biomass,
        time_multiplier: current.time_multiplier
      },
      buildings,
      tick: currentTick,
      ticksApplied: 0
    };
  });
}

async function getIslandResourcesByUser(userId) {
  const islandRes = await query(
    `SELECT id
     FROM islands
     WHERE user_id = $1`,
    [userId]
  );
  const island = islandRes.rows[0];
  if (!island) {
    return null;
  }

  const state = await advanceIslandToNow(island.id);
  if (!state) {
    return null;
  }

  return toResourcePayload(state.island, state.tick);
}

module.exports = {
  advanceIslandToNow,
  getIslandResourcesByUser,
  toResourcePayload
};
