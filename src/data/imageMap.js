// Central map for all game images in /public/images.
// Replace files in public/images and keep keys stable to avoid breaking references.
export const imageMap = {
  backgrounds: {
    atmospheric: "/images/atmosfheric-background.png",
    sky: "/images/sky.png",
    clouds: "/images/sky-clouds.png",
    night: "/images/night-sky.png",
    sunset: "/images/sunset-sunrise-sky.png",
    intro: "/images/Solara-intro.jpg"
  },
  islands: {
    base: "/images/base-island.png",
    // 5x5 board reference image
    layout: "/images/layout-island.svg",
    optimal: "/images/optimal-island.png",
    developing: "/images/develop-island.png"
  },
  world: {
    heliumCoreInactive: "/images/helios-core-inactive.png",
    heliumCoreActive: "/images/helios-core-active.png"
  },
  buildings: {
    solarCenterLv1: "/images/solar-center-1.png",
    solarCenterLv2: "/images/solar-center-2.png",
    solarCenterLv3: "/images/solar-center-3.png",
    biogardenLv1: "/images/biogarden-1.png",
    biogardenLv2: "/images/biogarden-2.png",
    biogardenLv3: "/images/biogarden-3.png",
    communityCenterLv1: "/images/comunity-center-1.png",
    communityCenterLv2: "/images/comunity-center-2.png",
    communityCenterLv3: "/images/comunity-center-3.png",
    heliosCoreActive: "/images/helios-core-active.png",
    heliosCoreInactive: "/images/helios-core-inactive.png"
  },
  resources: {
    energy: "/images/icon-energy.svg",
    water: "/images/icon-water.svg",
    biomass: "/images/icon-biomass.svg"
  },
  misc: {
    flag: "/images/flag.png",
    placeholder: "/images/placeholder.svg"
  }
};

