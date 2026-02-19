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

function LevelCard({ data, title }) {
  return (
    <div className="building-level-card">
      <h6>{title}</h6>
      <p>
        Production/min: E {data.production.energy} | W {data.production.water} | B {data.production.biomass}
      </p>
      <p>
        Consumption/min: E {data.consumption.energy} | W {data.consumption.water} | B {data.consumption.biomass}
      </p>
      <p>Cost</p>
      <ResourceCost cost={data.cost} />
    </div>
  );
}

function LevelBreakdown({ buildingId, currentLevel = 0 }) {
  const levels = [1, 2, 3]
    .map((level) => getBuildingLevelData(buildingId, level))
    .filter(Boolean);

  return (
    <div className="building-level-grid">
      {levels.map((levelData, idx) => {
        const level = idx + 1;
        const marker = currentLevel >= level ? "(Current/Unlocked)" : "(Locked)";
        return <LevelCard key={level} data={levelData} title={`Level ${level} ${marker}`} />;
      })}
    </div>
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
            <h5>All levels</h5>
            <LevelBreakdown buildingId={selected} />
            {blocked && <p className="error-text">Blocked terrain cell.</p>}
          </div>
        )}

        {canDestroy && currentPlaced && (
          <div className="building-details">
            <ImageLoader src={currentPlaced.image} alt={currentPlaced.name} className="building-image" />
            <h4>{currentPlaced.name}</h4>
            <p>{currentPlaced.description}</p>
            <p>Current level: {Math.max(1, cell.level || 1)}</p>
            <h5>All levels</h5>
            <LevelBreakdown buildingId={cell.buildingId} currentLevel={Math.max(1, cell.level || 1)} />
            {nextUpgrade ? (
              <>
                <h5>Next upgrade cost (Level {Math.max(1, cell.level || 1) + 1})</h5>
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
