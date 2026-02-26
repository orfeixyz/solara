import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import IslandGrid from "../components/IslandGrid";
import BuildingModal from "../components/BuildingModal";
import ImageLoader from "../components/ImageLoader";
import { imageMap } from "../data/imageMap";
import { getIslandStageImage } from "../data/islandStage";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

export default function IslandScreen() {
  const { id } = useParams();
  const { user } = useAuth();
  const {
    islandCache,
    fetchIsland,
    buildAtCell,
    upgradeAtCell,
    destroyAtCell,
    renameIsland,
    pushToast,
    isIslandOwnedByMe
  } = useGame();

  const [selectedCell, setSelectedCell] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [renameOpen, setRenameOpen] = useState(false);

  useEffect(() => {
    setSelectedCell(null);
    fetchIsland(id);
  }, [id]);

  const island = useMemo(() => islandCache[id], [id, islandCache]);

  useEffect(() => {
    setDraftName(island?.name || "");
  }, [island?.name]);

  const handleSelectCell = (cell) => {
    if (cell.type !== "land") {
      pushToast("error", "This terrain is blocked.");
      return;
    }
    setSelectedCell(cell);
  };

  const handleBuild = async (cell, selectedBuildingId) => {
    const result = await buildAtCell({
      islandId: id,
      x: cell.x,
      y: cell.y,
      buildingId: selectedBuildingId
    });

    if (!result) {
      pushToast("error", "Building action could not be completed.");
      return;
    }

    setSelectedCell(null);
  };

  const handleUpgrade = async (cell) => {
    const result = await upgradeAtCell({
      islandId: id,
      x: cell.x,
      y: cell.y
    });

    if (!result) {
      pushToast("error", "Upgrade action could not be completed.");
      return;
    }

    setSelectedCell(null);
  };

  const handleDestroy = async (cell) => {
    const result = await destroyAtCell({
      islandId: id,
      x: cell.x,
      y: cell.y
    });

    if (!result) {
      pushToast("error", "Destroy action could not be completed.");
      return;
    }

    setSelectedCell(null);
  };

  const handleRename = async (event) => {
    event.preventDefault();
    const ok = await renameIsland({ islandId: id, name: draftName });
    if (!ok) {
      return;
    }
    setDraftName((prev) => prev.trim());
    setRenameOpen(false);
  };

  if (!island) {
    return <div className="panel">Loading island data...</div>;
  }

  const isMine = isIslandOwnedByMe(island);
  if (!isMine) {
    return (
      <div className="panel">
        <h3>Access restricted</h3>
        <p>You can only enter your own island.</p>
        <p>Current user: {user?.username || "Player"}</p>
        <Link to="/world" className="back-link">
          Back to world map
        </Link>
      </div>
    );
  }

  return (
    <div className="island-layout">
      <section className="panel island-header">
        <ImageLoader src={getIslandStageImage(island.efficiency || 0)} alt={island.name} className="island-banner" />
        <div className="island-title-block">
          <div className="island-title-row">
            <button
              type="button"
              className="rename-trigger"
              aria-label="Rename island"
              onClick={() => setRenameOpen((prev) => !prev)}
            >
              ?
            </button>
            <h2>{island.name}</h2>
          </div>
          <p>Owner: {island.ownerName}</p>

          {renameOpen && (
            <div className="rename-popover">
              <form className="rename-island-form" onSubmit={handleRename}>
                <input
                  value={draftName}
                  onChange={(event) => setDraftName(event.target.value)}
                  minLength={3}
                  maxLength={28}
                  required
                  placeholder="Island name"
                />
                <button type="submit" className="primary-btn">Save</button>
                <button type="button" className="ghost-btn" onClick={() => setRenameOpen(false)}>Cancel</button>
              </form>
            </div>
          )}

          <Link to="/world" className="back-link">
            Back to world map
          </Link>
        </div>
      </section>

      <div
        className="island-main-grid"
        style={{
          backgroundImage: `url(${imageMap.backgrounds.clouds})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      >
        <IslandGrid island={island} onSelectCell={handleSelectCell} />
      </div>

      <BuildingModal
        open={Boolean(selectedCell)}
        cell={selectedCell}
        onClose={() => setSelectedCell(null)}
        onBuild={handleBuild}
        onUpgrade={handleUpgrade}
        onDestroy={handleDestroy}
      />
    </div>
  );
}
