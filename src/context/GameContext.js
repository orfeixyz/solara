import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { BUILDINGS, getBuildingLevelData } from "../data/buildings";
import { BIOMES } from "../data/biomes";
import { mockIslandDetails, mockIslands, mockResources } from "../data/mockData";
import {
  activateHeliumCore,
  buildOrUpgrade,
  destroyBuilding,
  getHeliumCoreState,
  getIslandById,
  getResourceTotals,
  getWorldIslands,
  renameIsland as renameIslandApi
} from "../services/api";
import { connectSocket, disconnectSocket, getSocket } from "../services/socket";

const GameContext = createContext(null);
const MAX_UPGRADE_LEVEL = 3;
const CORE_ACTIVATION_COST = { energy: 120, water: 120, biomass: 120 };

function mergeResources(current, incoming) {
  const hasFlatTotals =
    typeof incoming?.energy === "number" ||
    typeof incoming?.water === "number" ||
    typeof incoming?.biomass === "number";

  const totals = {
    energy: incoming?.totals?.energy ?? (hasFlatTotals ? incoming?.energy : undefined) ?? current?.totals?.energy ?? 0,
    water: incoming?.totals?.water ?? (hasFlatTotals ? incoming?.water : undefined) ?? current?.totals?.water ?? 0,
    biomass: incoming?.totals?.biomass ?? (hasFlatTotals ? incoming?.biomass : undefined) ?? current?.totals?.biomass ?? 0
  };

  const productionSource = incoming?.productionPerHour || incoming?.net;
  const efficiencyRaw = incoming?.efficiency;
  const efficiency =
    typeof efficiencyRaw === "number"
      ? Math.round(efficiencyRaw <= 1.2 ? efficiencyRaw * 100 : efficiencyRaw)
      : current?.efficiency ?? 100;

  const imbalance =
    typeof incoming?.imbalance === "number"
      ? incoming.imbalance
      : Math.round((totals.energy - totals.water + (totals.water - totals.biomass)) / 2);

  return {
    totals,
    productionPerHour: {
      energy: productionSource?.energy ?? current?.productionPerHour?.energy ?? 0,
      water: productionSource?.water ?? current?.productionPerHour?.water ?? 0,
      biomass: productionSource?.biomass ?? current?.productionPerHour?.biomass ?? 0
    },
    efficiency,
    imbalance
  };
}

const decorateIsland = (island) => ({
  ...island,
  biome: BIOMES[island.biomeId] || island.biome || null
});

export function GameProvider({ children }) {
  const { token, user } = useAuth();
  const [worldIslands, setWorldIslands] = useState(mockIslands.map(decorateIsland));
  const [resources, setResources] = useState(mockResources);
  const [heliumCore, setHeliumCore] = useState({ active: false, activatedBy: null, activatedAt: null });
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [islandCache, setIslandCache] = useState({});
  const [timeMultiplier, setTimeMultiplier] = useState(1);
  const [toasts, setToasts] = useState([]);
  const currentIslandRef = useRef(null);

  const pushToast = (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const isIslandOwnedByMe = (island) => {
    if (!island) {
      return false;
    }
    return island.ownerId === user?.id || island.ownerName === "You";
  };

  const canAffordCost = (cost) => {
    const totals = resources?.totals || {};
    return Object.entries(cost).every(([key, value]) => (totals[key] || 0) >= value);
  };

  const spendResources = (cost) => {
    setResources((prev) => {
      const nextTotals = {
        energy: Math.max(0, (prev?.totals?.energy || 0) - (cost.energy || 0)),
        water: Math.max(0, (prev?.totals?.water || 0) - (cost.water || 0)),
        biomass: Math.max(0, (prev?.totals?.biomass || 0) - (cost.biomass || 0))
      };
      return {
        ...prev,
        totals: nextTotals
      };
    });
  };

  const syncMyIslandEfficiency = (efficiency) => {
    if (typeof efficiency !== "number") {
      return;
    }
    setWorldIslands((prev) =>
      prev.map((island) => {
        const isMine = isIslandOwnedByMe(island);
        return isMine ? { ...island, efficiency } : island;
      })
    );
  };

  const fetchWorld = async () => {
    const remote = await getWorldIslands();
    if (Array.isArray(remote?.islands)) {
      const decorated = remote.islands.map(decorateIsland);
      setWorldIslands(decorated);
      return decorated;
    }

    const fallback = mockIslands.map((island, index) => {
      if (index !== 0) {
        return decorateIsland(island);
      }

      return decorateIsland({
        ...island,
        id: String(user?.island_id || island.id),
        ownerId: user?.id || island.ownerId,
        ownerName: user?.username || "You",
        name: user?.username ? `${user.username} Island` : island.name
      });
    });

    setWorldIslands(fallback);
    return fallback;
  };

  const fetchResources = async () => {
    try {
      const remote = await getResourceTotals();
      setResources((prev) => mergeResources(prev, remote));
      syncMyIslandEfficiency(remote?.efficiency);
    } catch (_error) {
      setResources((prev) => mergeResources(prev, mockResources));
    }
  };

  const fetchCore = async () => {
    try {
      const remote = await getHeliumCoreState();
      if (remote) {
        setHeliumCore(remote);
      }
      return remote;
    } catch (_error) {
      return heliumCore;
    }
  };

  const fetchIsland = async (islandId) => {
    currentIslandRef.current = islandId;

    try {
      const remote = await getIslandById(islandId);
      const normalized = decorateIsland({
        ...mockIslandDetails(islandId),
        ...remote,
        resources: mergeResources(mockResources, remote?.resources)
      });
      setIslandCache((prev) => ({ ...prev, [islandId]: normalized }));
      if (remote?.resources) {
        setResources((prev) => mergeResources(prev, remote.resources));
        syncMyIslandEfficiency(remote.resources?.efficiency);
      }
      return normalized;
    } catch (_error) {
      const fallback = decorateIsland(mockIslandDetails(islandId));
      setIslandCache((prev) => ({ ...prev, [islandId]: fallback }));
      return fallback;
    }
  };

  const applyLocalBuild = (island, payload) => {
    const { x, y, buildingId } = payload;
    const updatedGrid = island.grid.map((cell) => {
      if (cell.x !== x || cell.y !== y) {
        return cell;
      }
      return {
        ...cell,
        buildingId,
        level: 1,
        upgradeEndsAt: Date.now() + 2000
      };
    });

    return { ...island, grid: updatedGrid };
  };

  const applyLocalUpgrade = (island, payload) => {
    const { x, y, level } = payload;
    const updatedGrid = island.grid.map((cell) => {
      if (cell.x !== x || cell.y !== y) {
        return cell;
      }
      return {
        ...cell,
        level,
        upgradeEndsAt: Date.now() + 2000
      };
    });

    return { ...island, grid: updatedGrid };
  };

  const applyLocalDestroy = (island, payload) => {
    const { x, y } = payload;
    const updatedGrid = island.grid.map((cell) => {
      if (cell.x !== x || cell.y !== y) {
        return cell;
      }
      return {
        ...cell,
        buildingId: null,
        level: 0,
        upgradeEndsAt: null
      };
    });

    return { ...island, grid: updatedGrid };
  };

  const buildAtCell = async ({ islandId, x, y, buildingId }) => {
    const island = islandCache[islandId] || (await fetchIsland(islandId));
    const cell = island.grid.find((entry) => entry.x === x && entry.y === y);

    if (!isIslandOwnedByMe(island)) {
      pushToast("error", "You can only build on your own island.");
      return false;
    }

    if (!cell || cell.type !== "land") {
      pushToast("error", "This cell is blocked terrain.");
      return false;
    }

    if (cell.buildingId) {
      pushToast("warning", "This slot already has a building. Use Upgrade.");
      return false;
    }

    if (!buildingId || !BUILDINGS[buildingId]) {
      pushToast("error", "Select a valid building.");
      return false;
    }

    const levelData = getBuildingLevelData(buildingId, 1);
    if (!levelData) {
      pushToast("error", "Building definition not found.");
      return false;
    }

    if (!canAffordCost(levelData.cost)) {
      pushToast("error", "Insufficient resources for this action.");
      return false;
    }

    spendResources(levelData.cost);
    const optimistic = applyLocalBuild(island, { x, y, buildingId });
    setIslandCache((prev) => ({ ...prev, [islandId]: optimistic }));

    try {
      const response = await buildOrUpgrade({ islandId, x, y, buildingId, level: 1, timeMultiplier });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      return true;
    } catch (_error) {
      pushToast("error", "Build request failed. Local simulation kept.");
      return true;
    }
  };

  const upgradeAtCell = async ({ islandId, x, y }) => {
    const island = islandCache[islandId] || (await fetchIsland(islandId));
    const cell = island.grid.find((entry) => entry.x === x && entry.y === y);

    if (!isIslandOwnedByMe(island)) {
      pushToast("error", "You can only upgrade on your own island.");
      return false;
    }

    if (!cell || cell.type !== "land" || !cell.buildingId) {
      pushToast("warning", "There is no building to upgrade in this cell.");
      return false;
    }

    const currentLevel = Math.max(1, cell.level || 1);
    const buildingDef = BUILDINGS[cell.buildingId];
    const maxAllowedLevel = Math.min(MAX_UPGRADE_LEVEL, buildingDef?.maxLevel || MAX_UPGRADE_LEVEL);
    if (currentLevel >= maxAllowedLevel) {
      pushToast("warning", `This building already reached max level ${maxAllowedLevel}.`);
      return false;
    }

    const nextLevel = currentLevel + 1;
    const levelData = getBuildingLevelData(cell.buildingId, nextLevel);
    if (!levelData) {
      pushToast("error", "Upgrade data not found.");
      return false;
    }

    if (!canAffordCost(levelData.cost)) {
      pushToast("error", "Insufficient resources for this upgrade.");
      return false;
    }

    spendResources(levelData.cost);
    const optimistic = applyLocalUpgrade(island, { x, y, level: nextLevel });
    setIslandCache((prev) => ({ ...prev, [islandId]: optimistic }));

    try {
      const response = await buildOrUpgrade({ islandId, x, y, buildingId: cell.buildingId, level: nextLevel, timeMultiplier });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      pushToast("success", `Building upgraded to level ${nextLevel}.`);
      return true;
    } catch (_error) {
      pushToast("error", "Upgrade request failed. Local simulation kept.");
      return true;
    }
  };

  const destroyAtCell = async ({ islandId, x, y }) => {
    const island = islandCache[islandId] || (await fetchIsland(islandId));
    const cell = island.grid.find((entry) => entry.x === x && entry.y === y);

    if (!isIslandOwnedByMe(island)) {
      pushToast("error", "You can only edit your own island.");
      return false;
    }

    if (!cell || cell.type !== "land") {
      pushToast("error", "This cell is blocked terrain.");
      return false;
    }

    if (!cell.buildingId) {
      pushToast("warning", "There is no building to destroy in this cell.");
      return false;
    }

    const optimistic = applyLocalDestroy(island, { x, y });
    setIslandCache((prev) => ({ ...prev, [islandId]: optimistic }));

    try {
      const response = await destroyBuilding({ islandId, x, y, timeMultiplier });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      pushToast("success", "Building destroyed. Cell is buildable again.");
      return true;
    } catch (_error) {
      pushToast("error", "Destroy request failed. Local simulation kept.");
      return true;
    }
  };

  const renameIsland = async ({ islandId, name }) => {
    const island = islandCache[islandId] || (await fetchIsland(islandId));
    const nextName = String(name || "").trim();

    if (!isIslandOwnedByMe(island)) {
      pushToast("error", "You can only rename your own island.");
      return false;
    }

    if (nextName.length < 3 || nextName.length > 28) {
      pushToast("warning", "Island name must be 3-28 characters.");
      return false;
    }

    setIslandCache((prev) => ({
      ...prev,
      [islandId]: { ...prev[islandId], name: nextName }
    }));
    setWorldIslands((prev) => prev.map((entry) => (String(entry.id) === String(islandId) ? { ...entry, name: nextName } : entry)));

    try {
      const response = await renameIslandApi({ islandId, name: nextName });
      if (response?.island) {
        const normalized = decorateIsland(response.island);
        setIslandCache((prev) => ({
          ...prev,
          [islandId]: { ...(prev[islandId] || island), ...normalized, name: normalized.name }
        }));
        setWorldIslands((prev) => prev.map((entry) => (String(entry.id) === String(islandId) ? { ...entry, ...normalized } : entry)));
      }
      pushToast("success", "Island name updated.");
      return true;
    } catch (_error) {
      pushToast("error", "Rename request failed.");
      return false;
    }
  };

  const activateCore = async () => {
    if (heliumCore?.active) {
      pushToast("warning", "Helium Core is already active.");
      return false;
    }

    if (!canAffordCost(CORE_ACTIVATION_COST)) {
      pushToast("error", "Not enough resources to activate Helium Core.");
      return false;
    }

    spendResources(CORE_ACTIVATION_COST);

    try {
      const response = await activateHeliumCore({
        playerId: user?.id,
        username: user?.username,
        cost: CORE_ACTIVATION_COST
      });
      if (response) {
        setHeliumCore(response);
      }
      pushToast("success", "Helium Core activated. You won the game.");
      return true;
    } catch (_error) {
      pushToast("error", "Core activation failed.");
      return false;
    }
  };

  const sendChatMessage = (text) => {
    const content = text?.trim();
    if (!content) {
      return;
    }

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("chat_message", { message: content });
    }

    setChatMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        user: user?.username || "You",
        message: content,
        type: "player",
        createdAt: new Date().toISOString()
      }
    ]);
  };

  useEffect(() => {
    if (!token) {
      disconnectSocket();
      setConnectedUsers([]);
      return;
    }

    const socket = connectSocket(token);

    socket.on("connect", () => {
      pushToast("success", "Realtime link active.");
      fetchResources();
      fetchWorld();
      fetchCore();
      if (currentIslandRef.current) {
        fetchIsland(currentIslandRef.current);
      }
    });

    socket.on("player_joined", (payload) => {
      setConnectedUsers((prev) => [...new Set([...prev, payload?.username || payload?.id || "Player"])]);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          user: "System",
          message: `${payload?.username || "A player"} joined`,
          type: "system",
          createdAt: new Date().toISOString()
        }
      ]);
      fetchWorld();
    });

    socket.on("player_left", (payload) => {
      setConnectedUsers((prev) => prev.filter((name) => name !== payload?.username));
      setChatMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          user: "System",
          message: `${payload?.username || "A player"} left`,
          type: "system",
          createdAt: new Date().toISOString()
        }
      ]);
    });

    socket.on("resource_update", (payload) => {
      setResources((prev) => mergeResources(prev, payload));
      if (typeof payload?.time_multiplier === "number") {
        setTimeMultiplier(payload.time_multiplier);
      }
      syncMyIslandEfficiency(payload?.efficiency);
    });

    socket.on("tick_update", (payload) => {
      setResources((prev) => mergeResources(prev, payload?.resources || payload));
      if (typeof payload?.time_multiplier === "number") {
        setTimeMultiplier(payload.time_multiplier);
      }
      syncMyIslandEfficiency(payload?.resources?.efficiency ?? payload?.efficiency);
    });

    socket.on("building_update", (payload) => {
      if (!payload?.islandId || !payload?.grid) {
        return;
      }
      setIslandCache((prev) => ({
        ...prev,
        [payload.islandId]: decorateIsland({
          ...(prev[payload.islandId] || mockIslandDetails(payload.islandId)),
          ...payload,
          grid: payload.grid
        })
      }));
    });

    socket.on("chat_message", (payload) => {
      setChatMessages((prev) => [
        ...prev,
        {
          id: payload?.id || `chat-${Date.now()}`,
          user: payload?.user || payload?.username || "Player",
          message: payload?.message || "",
          type: payload?.type || "player",
          createdAt: payload?.createdAt || new Date().toISOString()
        }
      ]);
    });

    socket.io.on("reconnect", () => {
      pushToast("success", "Connection restored.");
      fetchResources();
      fetchWorld();
      fetchCore();
      if (currentIslandRef.current) {
        fetchIsland(currentIslandRef.current);
      }
    });

    return () => {
      socket.off("connect");
      socket.off("player_joined");
      socket.off("player_left");
      socket.off("resource_update");
      socket.off("building_update");
      socket.off("chat_message");
      socket.off("tick_update");
      socket.io.off("reconnect");
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchResources();
      fetchWorld();
      fetchCore();
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit("set_time_multiplier", { multiplier: timeMultiplier });
    }
  }, [token, timeMultiplier]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const resourceTimer = setInterval(() => {
      fetchResources();
    }, 15000);

    const worldTimer = setInterval(() => {
      fetchWorld();
    }, 30000);

    return () => {
      clearInterval(resourceTimer);
      clearInterval(worldTimer);
    };
  }, [token]);

  const value = useMemo(
    () => ({
      biomes: BIOMES,
      resources,
      worldIslands,
      heliumCore,
      connectedUsers,
      chatMessages,
      islandCache,
      timeMultiplier,
      toasts,
      CORE_ACTIVATION_COST,
      fetchWorld,
      fetchResources,
      fetchIsland,
      fetchCore,
      buildAtCell,
      upgradeAtCell,
      destroyAtCell,
      renameIsland,
      activateCore,
      canActivateCore: !heliumCore?.active && canAffordCost(CORE_ACTIVATION_COST),
      sendChatMessage,
      setTimeMultiplier,
      pushToast,
      isIslandOwnedByMe
    }),
    [
      resources,
      worldIslands,
      heliumCore,
      connectedUsers,
      chatMessages,
      islandCache,
      timeMultiplier,
      toasts,
      user
    ]
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGame must be used inside GameProvider");
  }
  return context;
}


