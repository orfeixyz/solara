const GRID_SIZE = 5;
const MAX_BUILDING_LEVEL = 3;

const BUILDING_CONFIG = {
  solar_center: {
    levels: {
      1: {
        production: { energy: 40, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 15, biomass: 0 },
        cost: { energy: 120, biomass: 80, water: 60 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 95, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 35, biomass: 0 },
        cost: { energy: 250, biomass: 200, water: 150 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 180, water: 0, biomass: 0 },
        consumption: { energy: 0, water: 60, biomass: 0 },
        cost: { energy: 500, biomass: 450, water: 350 },
        buildTimeMin: 3
      }
    }
  },
  bio_garden: {
    levels: {
      1: {
        production: { energy: 0, water: 25, biomass: 20 },
        consumption: { energy: 20, water: 0, biomass: 0 },
        cost: { energy: 100, biomass: 100, water: 80 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 0, water: 55, biomass: 45 },
        consumption: { energy: 45, water: 0, biomass: 0 },
        cost: { energy: 220, biomass: 220, water: 180 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 0, water: 100, biomass: 90 },
        consumption: { energy: 80, water: 0, biomass: 0 },
        cost: { energy: 450, biomass: 400, water: 350 },
        buildTimeMin: 3
      }
    }
  },
  community_center: {
    levels: {
      1: {
        production: { energy: 15, water: 15, biomass: 15 },
        consumption: { energy: 20, water: 10, biomass: 0 },
        cost: { energy: 150, biomass: 120, water: 100 },
        buildTimeMin: 1
      },
      2: {
        production: { energy: 35, water: 35, biomass: 35 },
        consumption: { energy: 40, water: 25, biomass: 0 },
        cost: { energy: 300, biomass: 260, water: 220 },
        buildTimeMin: 2
      },
      3: {
        production: { energy: 70, water: 70, biomass: 70 },
        consumption: { energy: 70, water: 50, biomass: 0 },
        cost: { energy: 600, biomass: 500, water: 400 },
        buildTimeMin: 3
      }
    }
  }
};

const MULTIPLIER_ENERGY_COST = {
  1: 0,
  2: 10,
  5: 25
};

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function computeImbalance(energy, water, biomass) {
  return (Math.abs(energy - biomass) + Math.abs(biomass - water)) / 2;
}

function computeEfficiency(energy, water, biomass) {
  const imbalance = computeImbalance(energy, water, biomass);
  const raw = 100 - imbalance * 0.5;
  return Math.max(70, Math.min(115, raw));
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
  const efficiency = computeEfficiency(island.energy, island.water, island.biomass);
  const efficiencyFactor = efficiency / 100;

  const produced = {
    energy: Math.round(base.production.energy * efficiencyFactor * multiplier),
    water: Math.round(base.production.water * efficiencyFactor * multiplier),
    biomass: Math.round(base.production.biomass * efficiencyFactor * multiplier)
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
    efficiency,
    produced,
    consumed,
    net,
    base
  };
}

function hasRequiredLevel3(buildings) {
  return buildings.some((item) => item.level >= MAX_BUILDING_LEVEL);
}

function isCoreReady({ island, efficiency, buildings, productionNet }) {
  return (
    island.energy >= 1200 &&
    island.biomass >= 1000 &&
    island.water >= 800 &&
    efficiency >= 90 &&
    hasRequiredLevel3(buildings) &&
    productionNet.energy > 0 &&
    productionNet.water > 0 &&
    productionNet.biomass > 0
  );
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
