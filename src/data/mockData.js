import { BIOMES } from "./biomes";

const GRID_SIZE = 5;
const MIN_BUILDABLE = 18;
const MAX_BUILDABLE = 18;

function hashSeed(value) {
  const text = String(value || "0");
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next / 4294967296, next];
}

function generateGrid(islandId = "1") {
  const cells = [];
  const center = (GRID_SIZE - 1) / 2;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      cells.push({ x, y });
    }
  }

  let rngState = hashSeed(islandId);
  let roll;
  [roll, rngState] = seededRandom(rngState);
  const targetBuildable = MIN_BUILDABLE + Math.floor(roll * (MAX_BUILDABLE - MIN_BUILDABLE + 1));
  const blockedNeeded = GRID_SIZE * GRID_SIZE - targetBuildable;

  const ranked = cells
    .filter((cell) => !(cell.x === center && cell.y === center))
    .map((cell) => {
      const distance = Math.hypot(cell.x - center, cell.y - center);
      let noise;
      [noise, rngState] = seededRandom(rngState);
      return {
        ...cell,
        rank: distance + noise * 0.35
      };
    })
    .sort((a, b) => b.rank - a.rank);

  const blockedSet = new Set();
  ranked.slice(0, blockedNeeded).forEach((cell) => {
    blockedSet.add(`${cell.x}-${cell.y}`);
  });

  return cells.map((cell) => {
    const key = `${cell.x}-${cell.y}`;
    const blocked = blockedSet.has(key);
    return {
      id: key,
      x: cell.x,
      y: cell.y,
      type: blocked ? "water" : "land",
      buildingId: null,
      level: 0,
      upgradeEndsAt: null
    };
  });
}

export const mockResources = {
  totals: { energy: 120, water: 95, biomass: 80 },
  productionPerHour: { energy: 36, water: 20, biomass: 24 },
  efficiency: 42,
  imbalance: -4
};

export const mockIslands = [
  {
    id: "1",
    name: "Aurora Prime",
    ownerId: "p1",
    ownerName: "You",
    biomeId: BIOMES.solar_reef.id,
    score: 1220,
    efficiency: 0,
    position: { x: 0, y: 0 }
  },
  {
    id: "2",
    name: "Verde Lambda",
    ownerId: "p2",
    ownerName: "Aetheria",
    biomeId: BIOMES.cloud_forest.id,
    score: 990,
    efficiency: 0,
    position: { x: 0, y: 0 }
  },
  {
    id: "3",
    name: "Gamma Tides",
    ownerId: "p3",
    ownerName: "HelioNet",
    biomeId: BIOMES.crystal_bay.id,
    score: 1094,
    efficiency: 0,
    position: { x: 0, y: 0 }
  },
  {
    id: "4",
    name: "Basalt Echo",
    ownerId: "p4",
    ownerName: "Ecopolis",
    biomeId: BIOMES.basalt_delta.id,
    score: 1158,
    efficiency: 0,
    position: { x: 0, y: 0 }
  }
];

export function mockIslandDetails(id = "1") {
  const island = mockIslands.find((item) => item.id === id) || mockIslands[0];

  return {
    ...island,
    grid: generateGrid(id),
    resources: mockResources,
    efficiency: island.efficiency,
    imbalance: -4
  };
}

