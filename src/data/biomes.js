import { imageMap } from "./imageMap";

// Add new biome definitions here and reference them from island data.
export const BIOMES = {
  solar_reef: {
    id: "solar_reef",
    name: "Solar Reef",
    image: imageMap.islands.base,
    accent: "#4aa6c7"
  },
  cloud_forest: {
    id: "cloud_forest",
    name: "Cloud Forest",
    image: imageMap.islands.developing,
    accent: "#6abf8e"
  },
  basalt_delta: {
    id: "basalt_delta",
    name: "Basalt Delta",
    image: imageMap.islands.layout,
    accent: "#c79050"
  },
  crystal_bay: {
    id: "crystal_bay",
    name: "Crystal Bay",
    image: imageMap.islands.optimal,
    accent: "#7aa0cf"
  }
};
