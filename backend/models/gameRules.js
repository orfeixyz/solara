const GRID_SIZE = 5;
const MAX_BUILDING_LEVEL = 3;

const BUILDING_CONFIG = {
  solar_center: {
    levels: {
      1: {
        production: { energy: 45, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 10, biomass: 0 },
        cost: { energy: 110, biomass: 70, water: 55 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 105, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 22, biomass: 0 },
        cost: { energy: 230, biomass: 180, water: 130 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 190, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 38, biomass: 0 },
        cost: { energy: 470, biomass: 420, water: 300 },
        buildTimeMin: 3
      }
    }
  },
  bio_garden: {
    levels: {
      1: {
        production: { energy: 0, water: 30, biomass: 25 },
        consumption: { energy: 12, water: 0, biomass: 0 },
        cost: { energy: 95, biomass: 95, water: 75 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 0, water: 65, biomass: 55 },
        consumption: { energy: 28, water: 0, biomass: 0 },
        cost: { energy: 210, biomass: 200, water: 165 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 0, water: 115, biomass: 100 },
        consumption: { energy: 50, water: 0, biomass: 0 },
        cost: { energy: 430, biomass: 380, water: 320 },
        buildTimeMin: 3
      }
    }
  },
  community_center: {
    levels: {
      1: {
        production: { energy: 24, water: 24, biomass: 24 },
        consumption: { energy: 8, water: 6, biomass: 0 },
        cost: { energy: 135, biomass: 110, water: 95 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 50, water: 50, biomass: 50 },
        consumption: { energy: 18, water: 12, biomass: 0 },
        cost: { energy: 280, biomass: 240, water: 210 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 90, water: 90, biomass: 90 },
        consumption: { energy: 32, water: 22, biomass: 0 },
        cost: { energy: 560, biomass: 470, water: 390 },
        buildTimeMin: 3
      }
    }
  }
};

const MULTIPLIER_ENERGY_COST = {
  1: 0,
  2: 0,
  5: 0
};

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function computeImbalance() {
  return 0;
}

function computeEfficiency() {
  return 100;
}

function getBuildCost(type, level) {
  const config = BUILDING_CONFIG[type];
  if (!config) {
    return null;
  }
  return config.levels[level]?.cost || null;
}

function getLevelData(type, level) {
  const config = BUILDING_CONFIG[type];
  if (!config) {
    return null;
  }
  return config.levels[level] || null;
}

function sumBaseFlows(buildings) {
  return buildings.reduce(
    (acc, building) => {
      const levelData = getLevelData(building.type, building.level);
      if (!levelData) {
        return acc;
      }

      acc.production.energy += levelData.production.energy;
      acc.production.water += levelData.production.water;
      acc.production.biomass += levelData.production.biomass;

      acc.consumption.energy += levelData.consumption.energy;
      acc.consumption.water += levelData.consumption.water;
      acc.consumption.biomass += levelData.consumption.biomass;
      return acc;
    },
    {
      production: { energy: 0, water: 0, biomass: 0 },
      consumption: { energy: 0, water: 0, biomass: 0 }
    }
  );
}

function computeProductionTick({ island, buildings }) {
  const multiplier = Number(island.time_multiplier) || 1;
  const multiplierEnergyCost = MULTIPLIER_ENERGY_COST[multiplier] || 0;

  const base = sumBaseFlows(buildings);

  const produced = {
    energy: Math.round(base.production.energy * multiplier),
    water: Math.round(base.production.water * multiplier),
    biomass: Math.round(base.production.biomass * multiplier)
  };

  const consumed = {
    energy: Math.round((base.consumption.energy + multiplierEnergyCost) * multiplier),
    water: Math.round(base.consumption.water * multiplier),
    biomass: Math.round(base.consumption.biomass * multiplier)
  };

  const net = {
    energy: produced.energy - consumed.energy,
    water: produced.water - consumed.water,
    biomass: produced.biomass - consumed.biomass
  };

  return {
    multiplier,
    efficiency: 100,
    produced,
    consumed,
    net,
    base
  };
}

function hasRequiredLevel3(buildings) {
  return buildings.some((item) => item.level >= MAX_BUILDING_LEVEL);
}

function isCoreReady({ island }) {
  return island.energy >= 1200 && island.biomass >= 1000 && island.water >= 800;
}

module.exports = {
  GRID_SIZE,
  MAX_BUILDING_LEVEL,
  BUILDING_CONFIG,
  MULTIPLIER_ENERGY_COST,
  createEmptyGrid,
  computeImbalance,
  computeEfficiency,
  getBuildCost,
  getLevelData,
  sumBaseFlows,
  computeProductionTick,
  hasRequiredLevel3,
  isCoreReady
};
