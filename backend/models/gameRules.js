const GRID_SIZE = 5;
const MAX_BUILDING_LEVEL = 3;

const BUILDING_CONFIG = {
  solar_center: {
    production: { energy: 24, water: 0, biomass: 0 },
    costs: {
      1: { energy: 60, water: 30, biomass: 25 },
      2: { energy: 120, water: 70, biomass: 60 },
      3: { energy: 210, water: 130, biomass: 100 }
    }
  },
  water_extractor: {
    production: { energy: 0, water: 22, biomass: 0 },
    costs: {
      1: { energy: 40, water: 20, biomass: 30 },
      2: { energy: 95, water: 55, biomass: 70 },
      3: { energy: 160, water: 105, biomass: 120 }
    }
  },
  bio_garden: {
    production: { energy: 0, water: 0, biomass: 20 },
    costs: {
      1: { energy: 35, water: 35, biomass: 20 },
      2: { energy: 90, water: 80, biomass: 55 },
      3: { energy: 155, water: 135, biomass: 95 }
    }
  },
  community_center: {
    production: { energy: 8, water: 8, biomass: 8 },
    costs: {
      1: { energy: 45, water: 45, biomass: 45 },
      2: { energy: 95, water: 95, biomass: 95 },
      3: { energy: 150, water: 150, biomass: 150 }
    }
  }
};

const BIOME_FACTORS = {
  forest: { energy: 0.95, water: 1.05, biomass: 1.2 },
  desert: { energy: 1.2, water: 0.8, biomass: 0.9 },
  aquatic: { energy: 0.9, water: 1.25, biomass: 1.0 },
  volcanic: { energy: 1.3, water: 0.75, biomass: 0.85 },
  default: { energy: 1.0, water: 1.0, biomass: 1.0 }
};

const MULTIPLIER_ENERGY_COST = {
  1: 0,
  2: 10,
  5: 25
};

function createEmptyGrid() {
  return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
}

function computeEfficiency(energy, water, biomass) {
  const imbalance = (Math.abs(energy - water) + Math.abs(water - biomass)) / 2;
  const raw = 1 - imbalance / 100;
  return Math.max(0.5, Math.min(1.2, raw));
}

function getBiomeFactor(biome) {
  return BIOME_FACTORS[biome] || BIOME_FACTORS.default;
}

function getBuildCost(type, level) {
  const config = BUILDING_CONFIG[type];
  if (!config) {
    return null;
  }
  return config.costs[level] || null;
}

function sumBaseProduction(buildings) {
  return buildings.reduce(
    (acc, building) => {
      const config = BUILDING_CONFIG[building.type];
      if (!config) {
        return acc;
      }

      acc.energy += config.production.energy * building.level;
      acc.water += config.production.water * building.level;
      acc.biomass += config.production.biomass * building.level;
      return acc;
    },
    { energy: 0, water: 0, biomass: 0 }
  );
}

function computeProductionTick({ island, biome, buildings }) {
  const multiplier = Number(island.time_multiplier) || 1;
  const energyCost = MULTIPLIER_ENERGY_COST[multiplier] || 0;

  const base = sumBaseProduction(buildings);
  const efficiency = computeEfficiency(island.energy, island.water, island.biomass);
  const biomeFactor = getBiomeFactor(biome);

  const produced = {
    energy: Math.round(base.energy * efficiency * biomeFactor.energy * multiplier),
    water: Math.round(base.water * efficiency * biomeFactor.water * multiplier),
    biomass: Math.round(base.biomass * efficiency * biomeFactor.biomass * multiplier)
  };

  const net = {
    energy: produced.energy - energyCost,
    water: produced.water,
    biomass: produced.biomass
  };

  return {
    multiplier,
    efficiency,
    produced,
    net,
    energyCost,
    base
  };
}

function isAlphaCompleted({ island, efficiency, buildings, productionNet }) {
  const level3Count = buildings.filter((item) => item.level >= MAX_BUILDING_LEVEL).length;
  return (
    island.energy >= 1200 &&
    island.biomass >= 1000 &&
    island.water >= 800 &&
    efficiency >= 0.85 &&
    level3Count >= 2 &&
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
  computeEfficiency,
  getBiomeFactor,
  getBuildCost,
  sumBaseProduction,
  computeProductionTick,
  isAlphaCompleted
};

