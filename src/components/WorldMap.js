import React, { useMemo, useState } from "react";
import ImageLoader from "./ImageLoader";
import { imageMap } from "../data/imageMap";
import { getIslandStageImage } from "../data/islandStage";

export default function WorldMap({
  islands,
  currentPlayerId,
  onSelectIsland,
  heliumCore,
  onActivateCore,
  onContributeCore,
  canActivateCore
}) {
  const [contrib, setContrib] = useState({ energy: 0, water: 0, biomass: 0 });

  const decorated = useMemo(() => {
    const ringRadius = 32;
    const center = { x: 50, y: 50 };

    return (islands || []).map((island, index, arr) => {
      const angle = (Math.PI * 2 * index) / Math.max(arr.length, 1);
      return {
        ...island,
        islandImage: getIslandStageImage(island.efficiency || 0),
        isMine: String(island.ownerId) === String(currentPlayerId) || island.ownerName === "You",
        mapX: center.x + Math.cos(angle) * ringRadius,
        mapY: center.y + Math.sin(angle) * ringRadius
      };
    });
  }, [islands, currentPlayerId]);

  const coreImage = heliumCore?.active ? imageMap.world.heliumCoreActive : imageMap.world.heliumCoreInactive;
  const totals = heliumCore?.totals || { energy: 0, water: 0, biomass: 0 };
  const goals = heliumCore?.goals || { energy: 0, water: 0, biomass: 0 };

  const submitContribution = async () => {
    const ok = await onContributeCore?.({
      energy: Number(contrib.energy) || 0,
      water: Number(contrib.water) || 0,
      biomass: Number(contrib.biomass) || 0
    });

    if (ok) {
      setContrib({ energy: 0, water: 0, biomass: 0 });
    }
  };

  return (
    <section className="world-map-panel">
      <div className="world-map">
        <ImageLoader src={imageMap.backgrounds.sky} alt="World sky" className="world-map-bg" />

        <div className="helium-core" title="Helium Core - shared world element">
          <ImageLoader src={coreImage} alt="Helium Core" className="helium-core-image" />
          <span className="helium-core-label">
            {heliumCore?.active
              ? `Helium Core Active (${heliumCore?.activatedBy || "Player"})`
              : "Helium Core Inactive"}
          </span>

          <div className="core-progress">
            <small>E {totals.energy}/{goals.energy} | W {totals.water}/{goals.water} | B {totals.biomass}/{goals.biomass}</small>
          </div>

          {!heliumCore?.active && (
            <div className="core-controls">
              <input
                type="number"
                min="0"
                value={contrib.energy}
                onChange={(event) => setContrib((prev) => ({ ...prev, energy: event.target.value }))}
                placeholder="Energy"
              />
              <input
                type="number"
                min="0"
                value={contrib.water}
                onChange={(event) => setContrib((prev) => ({ ...prev, water: event.target.value }))}
                placeholder="Water"
              />
              <input
                type="number"
                min="0"
                value={contrib.biomass}
                onChange={(event) => setContrib((prev) => ({ ...prev, biomass: event.target.value }))}
                placeholder="Biomass"
              />
              <button type="button" className="ghost-btn" onClick={submitContribution}>
                Contribute
              </button>
              <button
                type="button"
                className="primary-btn core-activate-btn"
                onClick={onActivateCore}
                disabled={!canActivateCore}
              >
                Activate Core
              </button>
            </div>
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
      <small className="map-legend">Each player can only enter their own island. Helium Core progress is shared.</small>
    </section>
  );
}

