import React, { useMemo, useState } from "react";
import { BUILDING_OPTIONS, getBuildingLevelData } from "../data/buildings";
import ImageLoader from "./ImageLoader";

const MAX_UI_UPGRADE_LEVEL = 3;

function ResourceCost({ cost = {} }) {
  return (
    <ul className="cost-list">
      <li>Energy: {cost.energy || 0}</li>
      <li>Water: {cost.water || 0}</li>
      <li>Biomass: {cost.biomass || 0}</li>
    </ul>
  );
}

export default function BuildingModal({ open, cell, onClose, onBuild, onUpgrade, onDestroy }) {
  const [selected, setSelected] = useState(BUILDING_OPTIONS[0]?.id || "centro_solar");

  const blocked = cell?.type !== "land";
  const alreadyBuilt = Boolean(cell?.buildingId);
  const canBuild = !blocked && !alreadyBuilt;
  const canDestroy = !blocked && alreadyBuilt;

  const currentData = useMemo(() => {
    if (!cell || !canBuild) {
      return null;
    }
    return getBuildingLevelData(selected, 1);
  }, [cell, selected, canBuild]);

  const currentPlaced = useMemo(() => {
    if (!cell?.buildingId) {
      return null;
    }
    return getBuildingLevelData(cell.buildingId, cell.level || 1);
  }, [cell]);

  const nextUpgrade = useMemo(() => {
    if (!currentPlaced || !cell?.buildingId) {
      return null;
    }
    const currentLevel = Math.max(1, cell.level || 1);
    const maxLevel = Math.min(MAX_UI_UPGRADE_LEVEL, currentPlaced.maxLevel || MAX_UI_UPGRADE_LEVEL);
    if (currentLevel >= maxLevel) {
      return null;
    }
    return getBuildingLevelData(cell.buildingId, currentLevel + 1);
  }, [currentPlaced, cell]);

  if (!open || !cell) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal building-modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>{alreadyBuilt ? "Building Actions" : "Construct Level 1 Building"}</h3>
          <button type="button" onClick={onClose}>
            x
          </button>
        </header>

        {canBuild && (
          <div className="build-picker">
            {BUILDING_OPTIONS.map((building) => (
              <button
                key={building.id}
                type="button"
                className={selected === building.id ? "selected" : ""}
                onClick={() => setSelected(building.id)}
              >
                {building.name}
              </button>
            ))}
          </div>
        )}

        {canBuild && currentData && (
          <div className="building-details">
            <ImageLoader src={currentData.image} alt={currentData.name} className="building-image" />
            <h4>{currentData.name}</h4>
            <p>{currentData.description}</p>
            <p>Build level: 1</p>
            <p>
              Production/min: E {currentData.production.energy} | W {currentData.production.water} | B {currentData.production.biomass}
            </p>
            <p>
              Consumption/min: E {currentData.consumption.energy} | W {currentData.consumption.water} | B {currentData.consumption.biomass}
            </p>
            <h5>Construction cost</h5>
            <ResourceCost cost={currentData.cost} />
            {blocked && <p className="error-text">Blocked terrain cell.</p>}
          </div>
        )}

        {canDestroy && currentPlaced && (
          <div className="building-details">
            <ImageLoader src={currentPlaced.image} alt={currentPlaced.name} className="building-image" />
            <h4>{currentPlaced.name}</h4>
            <p>{currentPlaced.description}</p>
            <p>Current level: {Math.max(1, cell.level || 1)}</p>
            {nextUpgrade ? (
              <>
                <h5>Upgrade to level {Math.max(1, cell.level || 1) + 1}</h5>
                <ResourceCost cost={nextUpgrade.cost} />
              </>
            ) : (
              <p>Maximum upgrade level reached (level 3).</p>
            )}
          </div>
        )}

        <footer>
          {canBuild && (
            <button
              type="button"
              className="primary-btn"
              onClick={() => onBuild(cell, selected)}
              disabled={!canBuild}
            >
              Build Level 1
            </button>
          )}
          {canDestroy && nextUpgrade && (
            <button type="button" className="primary-btn" onClick={() => onUpgrade(cell)}>
              Upgrade Building
            </button>
          )}
          {canDestroy && (
            <button
              type="button"
              className="danger-btn"
              onClick={() => onDestroy(cell)}
            >
              Destroy Building
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}

