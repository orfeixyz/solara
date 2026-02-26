import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import { BUILDINGS, getBuildingLevelData } from "../data/buildings";
import { BIOMES } from "../data/biomes";
import { mockIslandDetails, mockIslands, mockResources } from "../data/mockData";
import {
  activateHeliumCore,
  buildOrUpgrade,
  contributeHeliumCore,
  destroyBuilding,
  getChatMessages,
  getHeliumCoreState,
  getIslandById,
  getPresence,
  getResourceTotals,
  getWorldIslands,
  pingPresence,
  postChatMessage,
  renameIsland as renameIslandApi,
  requestGameRestart,
  acceptGameRestart
} from "../services/api";
import { CRITICAL_ASSETS, preloadAssets } from "../utils/assetLoader";

const GameContext = createContext(null);
const MAX_UPGRADE_LEVEL = 3;
const CORE_ACTIVATION_COST = { energy: 1200, water: 800, biomass: 1000 };

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

  const productionSource = incoming?.productionPerMinute || incoming?.productionPerHour || incoming?.net;

  return {
    totals,
    productionPerMinute: {
      energy: productionSource?.energy ?? current?.productionPerMinute?.energy ?? 0,
      water: productionSource?.water ?? current?.productionPerMinute?.water ?? 0,
      biomass: productionSource?.biomass ?? current?.productionPerMinute?.biomass ?? 0
    },
    productionPerHour: {
      energy: productionSource?.energy ?? current?.productionPerHour?.energy ?? 0,
      water: productionSource?.water ?? current?.productionPerHour?.water ?? 0,
      biomass: productionSource?.biomass ?? current?.productionPerHour?.biomass ?? 0
    },
    efficiency: 100,
    imbalance: 0,
    time_multiplier: 1
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
  const [toasts, setToasts] = useState([]);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  const coreActiveNotifiedRef = useRef(false);
  const worldCacheRef = useRef({ ts: 0, data: null });
  const resourcesCacheRef = useRef({ ts: 0, data: null });
  const coreCacheRef = useRef({ ts: 0, data: null });

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
    return String(island.ownerId) === String(user?.id) || island.ownerName === user?.username || island.ownerName === "You";
  };

  const canAffordCost = (cost) => {
    const totals = resources?.totals || {};
    return Object.entries(cost).every(([key, value]) => (totals[key] || 0) >= value);
  };

  const spendResources = (cost) => {
    setResources((prev) => ({
      ...prev,
      totals: {
        energy: Math.max(0, (prev?.totals?.energy || 0) - (cost.energy || 0)),
        water: Math.max(0, (prev?.totals?.water || 0) - (cost.water || 0)),
        biomass: Math.max(0, (prev?.totals?.biomass || 0) - (cost.biomass || 0))
      }
    }));
  };

  const fetchWorld = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && worldCacheRef.current.data && now - worldCacheRef.current.ts < 8000) {
      return worldCacheRef.current.data;
    }

    const remote = await getWorldIslands();
    if (Array.isArray(remote?.islands)) {
      const decorated = remote.islands.map(decorateIsland);
      worldCacheRef.current = { ts: now, data: decorated };
      setWorldIslands(decorated);
      return decorated;
    }

    const fallback = mockIslands
      .filter((island) => String(island.ownerId) === String(user?.id))
      .map(decorateIsland);

    worldCacheRef.current = { ts: now, data: fallback };
    setWorldIslands(fallback);
    return fallback;
  };

  const fetchResources = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && resourcesCacheRef.current.data && now - resourcesCacheRef.current.ts < 5000) {
      return resourcesCacheRef.current.data;
    }

    try {
      const remote = await getResourceTotals();
      resourcesCacheRef.current = { ts: now, data: remote };
      setResources((prev) => mergeResources(prev, remote));
      return remote;
    } catch (_error) {
      setResources((prev) => mergeResources(prev, mockResources));
      return null;
    }
  };

  const fetchCore = async ({ force = false } = {}) => {
    const now = Date.now();
    if (!force && coreCacheRef.current.data && now - coreCacheRef.current.ts < 5000) {
      return coreCacheRef.current.data;
    }

    try {
      const remote = await getHeliumCoreState();
      if (remote) {
        coreCacheRef.current = { ts: now, data: remote };
        setHeliumCore(remote);
      }
      return remote;
    } catch (_error) {
      return coreCacheRef.current.data || heliumCore;
    }
  };

  const fetchChat = async () => {
    try {
      const remote = await getChatMessages(100);
      if (Array.isArray(remote?.messages)) {
        setChatMessages(remote.messages);
      }
    } catch (_error) {
      // keep state
    }
  };

  const fetchPresence = async () => {
    try {
      const remote = await getPresence();
      setConnectedUsers(Array.isArray(remote?.users) ? remote.users : []);
    } catch (_error) {
      setConnectedUsers([]);
    }
  };

  const sendPresencePing = async () => {
    try {
      await pingPresence();
    } catch (_error) {
      // ignore ping failures
    }
  };

  const fetchIsland = async (islandId) => {
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
      const response = await buildOrUpgrade({ islandId, x, y, buildingId, level: 1, timeMultiplier: 1 });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      await fetchResources({ force: true });
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
      const response = await buildOrUpgrade({ islandId, x, y, buildingId: cell.buildingId, level: nextLevel, timeMultiplier: 1 });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      await fetchResources({ force: true });
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
      const response = await destroyBuilding({ islandId, x, y, timeMultiplier: 1 });
      if (response?.island) {
        setIslandCache((prev) => ({ ...prev, [islandId]: decorateIsland(response.island) }));
      }
      await fetchResources({ force: true });
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

  const contributeToCore = async (payload) => {
    const energy = Math.max(0, Number(payload?.energy || 0));
    const water = Math.max(0, Number(payload?.water || 0));
    const biomass = Math.max(0, Number(payload?.biomass || 0));

    if (!energy && !water && !biomass) {
      pushToast("warning", "Enter at least one resource amount.");
      return false;
    }

    if (!canAffordCost({ energy, water, biomass })) {
      pushToast("error", "Not enough resources for this contribution.");
      return false;
    }

    try {
      const next = await contributeHeliumCore({ energy, water, biomass });
      setHeliumCore(next);
      await fetchResources({ force: true });
      pushToast("success", "Resources contributed to Helium Core.");
      return true;
    } catch (error) {
      pushToast("error", error.message || "Core contribution failed.");
      return false;
    }
  };

  const activateCore = async () => {
    if (heliumCore?.active) {
      pushToast("warning", "Helium Core is already active.");
      return false;
    }

    if (!heliumCore?.readyToActivate) {
      pushToast("warning", "Core goals are not reached yet.");
      return false;
    }

    try {
      const response = await activateHeliumCore({ playerId: user?.id, username: user?.username });
      if (response) {
        setHeliumCore(response);
      }
      pushToast("success", "Helium Core activated. You won the game.");
      return true;
    } catch (error) {
      pushToast("error", error.message || "Core activation failed.");
      return false;
    }
  };

  const sendChatMessage = async (text) => {
    const content = text?.trim();
    if (!content) {
      return;
    }

    try {
      await postChatMessage({ message: content, username: user?.username });
      await fetchChat();
    } catch (error) {
      pushToast("error", error.message || "Could not send chat message.");
    }
  };

  const requestRestartVote = async () => {
    try {
      const next = await requestGameRestart();
      if (next) {
        setHeliumCore(next);
      }
      pushToast("success", "Restart vote started. Active players must accept.");
      return true;
    } catch (error) {
      pushToast("error", error.message || "Could not request restart vote.");
      return false;
    }
  };

  const acceptRestartVote = async () => {
    try {
      const next = await acceptGameRestart();
      if (next) {
        setHeliumCore(next);
      }
      if (next?.restarted) {
        pushToast("success", "All active players accepted. Game restarted.");
        await Promise.allSettled([fetchResources({ force: true }), fetchWorld({ force: true })]);
      } else {
        pushToast("success", "Restart vote accepted.");
      }
      return true;
    } catch (error) {
      pushToast("error", error.message || "Could not accept restart vote.");
      return false;
    }
  };

  useEffect(() => {
    if (!token) {
      setConnectedUsers([]);
      setChatMessages([]);
      setIsBootstrapping(false);
      return;
    }

    let mounted = true;

    const bootstrap = async () => {
      setIsBootstrapping(true);
      preloadAssets(CRITICAL_ASSETS);

      await Promise.allSettled([
        fetchResources({ force: true }),
        fetchWorld({ force: true }),
        fetchCore({ force: true }),
        fetchChat(),
        fetchPresence(),
        sendPresencePing()
      ]);

      if (mounted) {
        setIsBootstrapping(false);
      }
    };

    bootstrap();

    const resourceTimer = setInterval(() => fetchResources(), 10000);
    const worldTimer = setInterval(() => fetchWorld(), 20000);
    const coreTimer = setInterval(() => fetchCore(), 9000);
    const chatTimer = setInterval(fetchChat, 5000);
    const presenceTimer = setInterval(fetchPresence, 10000);
    const presencePingTimer = setInterval(sendPresencePing, 20000);

    return () => {
      mounted = false;
      clearInterval(resourceTimer);
      clearInterval(worldTimer);
      clearInterval(coreTimer);
      clearInterval(chatTimer);
      clearInterval(presenceTimer);
      clearInterval(presencePingTimer);
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      coreActiveNotifiedRef.current = false;
      return;
    }

    if (heliumCore?.active && !coreActiveNotifiedRef.current) {
      coreActiveNotifiedRef.current = true;
      pushToast("success", "Helio Core activated. Vote to restart when all players are ready.");
    }

    if (!heliumCore?.active) {
      coreActiveNotifiedRef.current = false;
    }
  }, [heliumCore?.active, token]);

  const value = useMemo(
    () => ({
      biomes: BIOMES,
      resources,
      worldIslands,
      heliumCore,
      connectedUsers,
      chatMessages,
      islandCache,
      toasts,
      isBootstrapping,
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
      contributeToCore,
      requestRestartVote,
      acceptRestartVote,
      canActivateCore: !heliumCore?.active && Boolean(heliumCore?.readyToActivate),
      sendChatMessage,
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
      toasts,
      isBootstrapping,
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


