import React, { useMemo } from "react";
import ImageLoader from "./ImageLoader";
import { imageMap } from "../data/imageMap";
import { getIslandStageImage } from "../data/islandStage";

export default function WorldMap({
  islands,
  currentPlayerId,
  onSelectIsland,
  heliumCore,
  onActivateCore,
  canActivateCore,
  coreActivationCost
}) {
  const decorated = useMemo(() => {
    const ringRadius = 32;
    const center = { x: 50, y: 50 };

    return (islands || []).map((island, index, arr) => {
      const angle = (Math.PI * 2 * index) / Math.max(arr.length, 1);
      return {
        ...island,
        islandImage: getIslandStageImage(island.efficiency || 0),
        isMine: island.ownerId === currentPlayerId || island.ownerName === "You",
        mapX: center.x + Math.cos(angle) * ringRadius,
        mapY: center.y + Math.sin(angle) * ringRadius
      };
    });
  }, [islands, currentPlayerId]);

  const coreImage = heliumCore?.active ? imageMap.world.heliumCoreActive : imageMap.world.heliumCoreInactive;

  return (
    <section className="world-map-panel">
      <div className="world-map">
        <ImageLoader src={imageMap.backgrounds.sky} alt="World sky" className="world-map-bg" />

        <div className="helium-core" title="Helium Core - shared world element">
          <ImageLoader src={coreImage} alt="Helium Core" className="helium-core-image" />
          <span className="helium-core-label">
            {heliumCore?.active ? `Helium Core Active (${heliumCore?.activatedBy || "Player"})` : "Helium Core Inactive"}
          </span>
          {!heliumCore?.active && (
            <button
              type="button"
              className="primary-btn core-activate-btn"
              onClick={onActivateCore}
              disabled={!canActivateCore}
              title={`Cost E:${coreActivationCost.energy} W:${coreActivationCost.water} B:${coreActivationCost.biomass}`}
            >
              Activate Core
            </button>
          )}
        </div>

        {decorated.map((island) => (
          <button
            key={island.id}
            type="button"
            className={`island-node ${island.isMine ? "mine" : "other"}`}
            style={{ left: `${island.mapX}%`, top: `${island.mapY}%` }}
            onClick={() => onSelectIsland(island)}
            title={`${island.name} | ${island.ownerName} | Efficiency: ${island.efficiency || 0}%`}
            disabled={!island.isMine}
          >
            <ImageLoader src={island.islandImage} alt={island.name} className="island-image" />
            <span className="island-label">{island.name}</span>
          </button>
        ))}
      </div>
      <small className="map-legend">Each player can only enter their own island.</small>
    </section>
  );
}
