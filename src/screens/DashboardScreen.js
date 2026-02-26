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
    heliumCore,
    activateCore,
    canActivateCore,
    contributeToCore,
    requestRestartVote,
    acceptRestartVote,
    pushToast
  } = useGame();

  useEffect(() => {
    // GameContext bootstrap handles initial world fetch.
  }, []);

  return (
    <div className="dashboard-grid full-world">
      <WorldMap
        islands={worldIslands}
        currentPlayerId={user?.id}
        heliumCore={heliumCore}
        onActivateCore={activateCore}
        canActivateCore={canActivateCore}
        onContributeCore={contributeToCore || (async () => false)}
        onRequestRestart={requestRestartVote || (async () => false)}
        onAcceptRestart={acceptRestartVote || (async () => false)}
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
