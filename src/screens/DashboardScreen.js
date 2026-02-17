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
    CORE_ACTIVATION_COST,
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
        coreActivationCost={CORE_ACTIVATION_COST}
        onSelectIsland={(island) => {
          const isMine = island.ownerId === user?.id || island.ownerName === "You";
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
