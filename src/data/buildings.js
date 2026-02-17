import { imageMap } from "./imageMap";

// Add new buildings here. Each entry drives modal data, grid rendering and build validation.
export const BUILDINGS = {
  centro_solar: {
    id: "centro_solar",
    name: "Centro Solar",
    description: "Main solar generation facility.",
    maxLevel: 5,
    imageByLevel: [
      imageMap.buildings.solarCenterLv1,
      imageMap.buildings.solarCenterLv2,
      imageMap.buildings.solarCenterLv3,
      imageMap.buildings.solarCenterLv3,
      imageMap.buildings.solarCenterLv3
    ],
    productionByLevel: {
      energy: [12, 18, 28, 38, 52],
      water: [0, 0, 0, 0, 0],
      biomass: [0, 0, 0, 0, 0]
    },
    consumptionByLevel: {
      water: [1, 2, 2, 3, 4],
      biomass: [0, 0, 0, 0, 0]
    },
    costByLevel: [
      { energy: 30, water: 10, biomass: 0 },
      { energy: 50, water: 18, biomass: 8 },
      { energy: 75, water: 22, biomass: 15 },
      { energy: 105, water: 30, biomass: 20 },
      { energy: 140, water: 38, biomass: 24 }
    ]
  },
  biojardin: {
    id: "biojardin",
    name: "Biojardin",
    description: "Cultivates biomass and improves ecosystem balance.",
    maxLevel: 5,
    imageByLevel: [
      imageMap.buildings.biogardenLv1,
      imageMap.buildings.biogardenLv2,
      imageMap.buildings.biogardenLv3,
      imageMap.buildings.biogardenLv3,
      imageMap.buildings.biogardenLv3
    ],
    productionByLevel: {
      energy: [0, 0, 0, 0, 0],
      water: [2, 3, 5, 7, 8],
      biomass: [8, 14, 20, 28, 36]
    },
    consumptionByLevel: {
      energy: [2, 3, 4, 5, 6],
      water: [0, 0, 0, 0, 0]
    },
    costByLevel: [
      { energy: 15, water: 10, biomass: 10 },
      { energy: 24, water: 14, biomass: 18 },
      { energy: 34, water: 20, biomass: 26 },
      { energy: 46, water: 26, biomass: 35 },
      { energy: 62, water: 31, biomass: 44 }
    ]
  },
  centro_comunitario: {
    id: "centro_comunitario",
    name: "Centro Comunitario",
    description: "Improves efficiency and social sustainability.",
    maxLevel: 5,
    imageByLevel: [
      imageMap.buildings.communityCenterLv1,
      imageMap.buildings.communityCenterLv2,
      imageMap.buildings.communityCenterLv3,
      imageMap.buildings.communityCenterLv3,
      imageMap.buildings.communityCenterLv3
    ],
    productionByLevel: {
      energy: [1, 2, 3, 4, 6],
      water: [1, 2, 3, 4, 5],
      biomass: [1, 2, 3, 4, 6]
    },
    consumptionByLevel: {
      energy: [2, 3, 4, 6, 8],
      water: [1, 1, 2, 2, 3]
    },
    costByLevel: [
      { energy: 20, water: 16, biomass: 10 },
      { energy: 34, water: 24, biomass: 18 },
      { energy: 48, water: 32, biomass: 24 },
      { energy: 68, water: 40, biomass: 32 },
      { energy: 85, water: 50, biomass: 40 }
    ]
  }
};

export const BUILDING_OPTIONS = Object.values(BUILDINGS);

export function getBuildingLevelData(buildingId, level = 1) {
  const building = BUILDINGS[buildingId];
  if (!building) {
    return null;
  }

  const idx = Math.max(0, Math.min(level - 1, building.maxLevel - 1));

  return {
    ...building,
    level,
    image: building.imageByLevel[idx] || imageMap.misc.placeholder,
    production: {
      energy: building.productionByLevel.energy[idx] || 0,
      water: building.productionByLevel.water[idx] || 0,
      biomass: building.productionByLevel.biomass[idx] || 0
    },
    consumption: {
      energy: building.consumptionByLevel.energy?.[idx] || 0,
      water: building.consumptionByLevel.water?.[idx] || 0,
      biomass: building.consumptionByLevel.biomass?.[idx] || 0
    },
    cost: building.costByLevel[idx] || { energy: 0, water: 0, biomass: 0 }
  };
}
