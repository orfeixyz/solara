import { imageMap } from "./imageMap";

export function getIslandStageImage(efficiency = 0) {
  if (efficiency >= 80) {
    return imageMap.islands.optimal;
  }
  if (efficiency >= 45) {
    return imageMap.islands.developing;
  }
  return imageMap.islands.base;
}
