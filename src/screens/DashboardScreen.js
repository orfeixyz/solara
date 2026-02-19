import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import WorldMap from "../components/WorldMap";
import { useAuth } from "../context/AuthContext";
import { useGame } from "../context/GameContext";

export default function DashboardScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    worldIslands,
    fetchWorld,
    heliumCore,
    activateCore,
    canActivateCore,

    pushToast
  } = useGame();

  useEffect(() => {
    fetchWorld();
  }, []);

  return (
    <div className="dashboard-grid full-world">
      <WorldMap
        islands={worldIslands}
        currentPlayerId={user?.id}
        heliumCore={heliumCore}
        onActivateCore={activateCore}
        canActivateCore={canActivateCore}
        onContributeCore={contributeToCore}
        onSelectIsland={(island) => {
          const isMine = String(island.ownerId) === String(user?.id) || island.ownerName === "You";
          if (!isMine) {
            pushToast("warning", "You can only enter your own island.");
            return;
          }
          navigate(`/island/${island.id}`);
        }}
      />
    </div>
  );
}


