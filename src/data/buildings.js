import { imageMap } from "./imageMap";

export const BUILDINGS = {
  centro_solar: {
    id: "centro_solar",
    name: "Solar Center",
    description: "Produces large Energy output while consuming Water.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.solarCenterLv1,
      imageMap.buildings.solarCenterLv2,
      imageMap.buildings.solarCenterLv3
    ],
    productionByLevel: {
      energy: [40, 95, 180],
      water: [0, 0, 0],
      biomass: [0, 0, 0]
    },
    consumptionByLevel: {
      energy: [0, 0, 0],
      water: [15, 35, 60],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 120, biomass: 80, water: 60 },
      { energy: 250, biomass: 200, water: 150 },
      { energy: 500, biomass: 450, water: 350 }
    ]
  },
  biojardin: {
    id: "biojardin",
    name: "Bio Garden",
    description: "Converts Energy into Water and Biomass.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.biogardenLv1,
      imageMap.buildings.biogardenLv2,
      imageMap.buildings.biogardenLv3
    ],
    productionByLevel: {
      energy: [0, 0, 0],
      water: [25, 55, 100],
      biomass: [20, 45, 90]
    },
    consumptionByLevel: {
      energy: [20, 45, 80],
      water: [0, 0, 0],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 100, biomass: 100, water: 80 },
      { energy: 220, biomass: 220, water: 180 },
      { energy: 450, biomass: 400, water: 350 }
    ]
  },
  centro_comunitario: {
    id: "centro_comunitario",
    name: "Community Center",
    description: "Balanced producer with medium Energy and Water operating costs.",
    maxLevel: 3,
    imageByLevel: [
      imageMap.buildings.communityCenterLv1,
      imageMap.buildings.communityCenterLv2,
      imageMap.buildings.communityCenterLv3
    ],
    productionByLevel: {
      energy: [15, 35, 70],
      water: [15, 35, 70],
      biomass: [15, 35, 70]
    },
    consumptionByLevel: {
      energy: [20, 40, 70],
      water: [10, 25, 50],
      biomass: [0, 0, 0]
    },
    costByLevel: [
      { energy: 150, biomass: 120, water: 100 },
      { energy: 300, biomass: 260, water: 220 },
      { energy: 600, biomass: 500, water: 400 }
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
