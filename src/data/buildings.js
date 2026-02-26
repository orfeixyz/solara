import { imageMap } from "./imageMap";

export const BUILDINGS = {
  centro_solar: {
    id: "centro_solar",
    name: "Solar Center",
    description: "High energy output, moderate water usage.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.solarCenterLv1,
      imageMap.buildings.solarCenterLv2,
      imageMap.buildings.solarCenterLv3
    ],
    productionByLevel: {
      energy: [45, 105, 190],
      water: [0, 0, 0],
      biomass: [0, 0, 0]
    },
    consumptionByLevel: {
      energy: [0, 0, 0],
      water: [10, 22, 38],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 110, biomass: 70, water: 55 },
      { energy: 230, biomass: 180, water: 130 },
      { energy: 470, biomass: 420, water: 300 }
    ]
  },
  biojardin: {
    id: "biojardin",
    name: "Bio Garden",
    description: "Strong water/biomass production with controlled energy use.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.biogardenLv1,
      imageMap.buildings.biogardenLv2,
      imageMap.buildings.biogardenLv3
    ],
    productionByLevel: {
      energy: [0, 0, 0],
      water: [30, 65, 115],
      biomass: [25, 55, 100]
    },
    consumptionByLevel: {
      energy: [12, 28, 50],
      water: [0, 0, 0],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 95, biomass: 95, water: 75 },
      { energy: 210, biomass: 200, water: 165 },
      { energy: 430, biomass: 380, water: 320 }
    ]
  },
  centro_comunitario: {
    id: "centro_comunitario",
    name: "Community Center",
    description: "Balanced generator with positive net output at every level.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.communityCenterLv1,
      imageMap.buildings.communityCenterLv2,
      imageMap.buildings.communityCenterLv3
    ],
    productionByLevel: {
      energy: [24, 50, 90],
      water: [24, 50, 90],
      biomass: [24, 50, 90]
    },
    consumptionByLevel: {
      energy: [8, 18, 32],
      water: [6, 12, 22],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 135, biomass: 110, water: 95 },
      { energy: 280, biomass: 240, water: 210 },
      { energy: 560, biomass: 470, water: 390 }
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
