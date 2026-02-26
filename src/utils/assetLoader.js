import { imageMap } from "../data/imageMap";

const imageCache = new Map();

export const CRITICAL_ASSETS = [
  imageMap.backgrounds.sky,
  imageMap.world.heliumCoreInactive,
  imageMap.world.heliumCoreActive,
  imageMap.islands.base,
  imageMap.islands.developing,
  imageMap.islands.optimal,
  imageMap.resources.energy,
  imageMap.resources.water,
  imageMap.resources.biomass
];

function preloadOne(url) {
  if (!url) {
    return Promise.resolve();
  }

  if (imageCache.has(url)) {
    return imageCache.get(url);
  }

  const promise = new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = url;

    const done = () => resolve(url);
    img.onload = done;
    img.onerror = done;
  });

  imageCache.set(url, promise);
  return promise;
}

export function preloadAssets(urls = []) {
  return Promise.allSettled(urls.filter(Boolean).map((url) => preloadOne(url)));
}

export function isAssetCached(url) {
  return imageCache.has(url);
}
