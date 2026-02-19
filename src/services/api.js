import axios from "axios";
import { imageMap } from "../data/imageMap";
import { mockIslandDetails, mockIslands, mockResources } from "../data/mockData";

const API_URL =
  process.env.REACT_APP_API_URL?.trim() ||
  (process.env.NODE_ENV === "development" ? "http://localhost:4000" : "");
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === "true";

const MOCK_WORLD_ISLANDS_KEY = "solara_mock_world_islands";
const MOCK_CORE_STATE_KEY = "solara_mock_helium_core_state";
const FRONTEND_TO_BACKEND_BUILDING = {
  centro_solar: "solar_center",
  biojardin: "bio_garden",
  centro_comunitario: "community_center"
};
const BACKEND_TO_FRONTEND_BUILDING = Object.fromEntries(
  Object.entries(FRONTEND_TO_BACKEND_BUILDING).map(([front, back]) => [back, front])
);

export const apiClient = axios.create({
  baseURL: API_URL || "",
  timeout: 10000
});

function asNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeEfficiency(value, fallback = mockResources.efficiency) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return fallback;
  }
  if (value <= 1.2) {
    return Math.round(value * 100);
  }
  return Math.round(value);
}

function normalizeResources(payload) {
  const totalsSource = payload?.totals || payload || {};
  const productionSource = payload?.productionPerHour || payload?.net || payload?.productionPerMinute || {};

  const totals = {
    energy: asNumber(totalsSource.energy, mockResources.totals.energy),
    water: asNumber(totalsSource.water, mockResources.totals.water),
    biomass: asNumber(totalsSource.biomass, mockResources.totals.biomass)
  };

  const productionPerHour = {
    energy: asNumber(productionSource.energy, mockResources.productionPerHour.energy),
    water: asNumber(productionSource.water, mockResources.productionPerHour.water),
    biomass: asNumber(productionSource.biomass, mockResources.productionPerHour.biomass)
  };

  const imbalance = Math.round((totals.energy - totals.water + (totals.water - totals.biomass)) / 2);

  return {
    totals,
    productionPerHour,
    efficiency: normalizeEfficiency(payload?.efficiency),
    imbalance: typeof payload?.imbalance === "number" ? payload.imbalance : imbalance
  };
}

function applyBuildingsToGrid(baseGrid, buildings) {
  const byCoordinate = new Map(
    (Array.isArray(buildings) ? buildings : []).map((building) => [
      `${building.pos_x}-${building.pos_y}`,
      building
    ])
  );

  return (baseGrid || []).map((cell) => {
    const building = byCoordinate.get(`${cell.x}-${cell.y}`);
    if (!building) {
      return {
        ...cell,
        buildingId: null,
        level: 0,
        upgradeEndsAt: null
      };
    }

    return {
      ...cell,
      buildingId: BACKEND_TO_FRONTEND_BUILDING[building.type] || null,
      level: Math.max(1, asNumber(building.level, 1)),
      upgradeEndsAt: null
    };
  });
}

function readMockUsers() {
  try {
    return JSON.parse(localStorage.getItem("solara_mock_users") || "[]");
  } catch (_error) {
    return [];
  }
}

function writeMockUsers(users) {
  localStorage.setItem("solara_mock_users", JSON.stringify(users));
}

function readStoredWorldIslandsRaw() {
  try {
    const saved = JSON.parse(localStorage.getItem(MOCK_WORLD_ISLANDS_KEY) || "null");
    if (Array.isArray(saved)) {
      return saved;
    }
  } catch (_error) {
    // ignore parse errors and fallback
  }
  return [];
}

function writeMockWorldIslands(islands) {
  localStorage.setItem(MOCK_WORLD_ISLANDS_KEY, JSON.stringify(islands));
}

function nextIslandId(islands) {
  const maxId = islands.reduce((acc, island) => {
    const n = Number(island.id);
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return String(maxId + 1);
}

function pickBiomeId(index) {
  const biomePool = [...new Set(mockIslands.map((island) => island.biomeId).filter(Boolean))];
  if (!biomePool.length) {
    return mockIslands[0]?.biomeId;
  }
  return biomePool[index % biomePool.length];
}

function syncWorldIslandsWithUsers() {
  const users = readMockUsers();
  const stored = readStoredWorldIslandsRaw();

  if (!users.length) {
    writeMockWorldIslands([]);
    return [];
  }

  const byOwnerId = new Map(stored.map((island) => [island.ownerId, island]));
  const usedIds = new Set(stored.map((island) => String(island.id)));
  const synced = [];

  users.forEach((user, index) => {
    const existing = byOwnerId.get(user.id);
    if (existing) {
      synced.push({
        ...existing,
        ownerId: user.id,
        ownerName: user.username,
        biomeId: existing.biomeId || pickBiomeId(index),
        name: existing.name || `${user.username} Island`
      });
      return;
    }

    let id = nextIslandId([...synced, ...stored]);
    while (usedIds.has(id)) {
      id = String(Number(id) + 1);
    }
    usedIds.add(id);

    synced.push({
      id,
      name: `${user.username} Island`,
      ownerId: user.id,
      ownerName: user.username,
      biomeId: pickBiomeId(index),
      score: 0,
      efficiency: 0,
      position: { x: 0, y: 0 }
    });
  });

  writeMockWorldIslands(synced);
  return synced;
}

function ensureUserIsland(user) {
  if (!user?.id) {
    return;
  }
  syncWorldIslandsWithUsers();
}

function readMockCoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(MOCK_CORE_STATE_KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        active: Boolean(saved.active),
        activatedBy: saved.activatedBy || null,
        activatedAt: saved.activatedAt || null
      };
    }
  } catch (_error) {
    // ignore parse errors
  }

  return {
    active: false,
    activatedBy: null,
    activatedAt: null
  };
}

function writeMockCoreState(state) {
  localStorage.setItem(MOCK_CORE_STATE_KEY, JSON.stringify(state));
}

function readMockIslandGrid(islandId) {
  try {
    const key = `solara_mock_grid_${islandId}`;
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (Array.isArray(saved)) {
      return saved;
    }
  } catch (_error) {
    // ignore parse errors and fallback to defaults
  }
  return null;
}

function writeMockIslandGrid(islandId, grid) {
  const key = `solara_mock_grid_${islandId}`;
  localStorage.setItem(key, JSON.stringify(grid));
}

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
}

function flattenErrorText(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => flattenErrorText(entry)).filter(Boolean).join(" | ");
  }

  if (typeof value === "object") {
    const message = flattenErrorText(value.message);
    const error = flattenErrorText(value.error);
    const details = flattenErrorText(value.details);
    const combined = [message, error, details].filter(Boolean).join(" | ");

    if (combined) {
      return combined;
    }

    try {
      const json = JSON.stringify(value);
      return json === "{}" ? "" : json;
    } catch (_e) {
      return "";
    }
  }

  return "";
}

function parseError(error, fallback = "Request failed") {
  const responseData = error?.response?.data;
  const resolved =
    flattenErrorText(responseData) ||
    flattenErrorText(error?.message) ||
    fallback;

  return resolved === "[object Object]" ? fallback : resolved;
}

export async function registerUser(payload) {
  if (USE_MOCK_API) {
    const users = readMockUsers();
    const exists = users.some((u) => u.username === payload.username);
    if (exists) {
      throw new Error("Username already exists (mock mode)");
    }

    const createdUser = {
      id: `p_${Date.now()}`,
      username: payload.username,
      email: payload.email,
      password: payload.password
    };

    users.push(createdUser);
    writeMockUsers(users);
    ensureUserIsland(createdUser);

    return { ok: true, message: "Registered in mock mode" };
  }

  try {
    const { data } = await apiClient.post("/api/auth/register", payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Register failed"));
  }
}

export async function loginUser(payload) {
  if (USE_MOCK_API) {
    const users = readMockUsers();
    const user = users.find(
      (u) => u.username === payload.username && u.password === payload.password
    );

    if (!user) {
      throw new Error("Invalid credentials (mock mode)");
    }

    ensureUserIsland(user);

    return {
      token: `mock-token-${user.id}`,
      user: { id: user.id, username: user.username, email: user.email }
    };
  }

  try {
    const { data } = await apiClient.post("/api/auth/login", payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Login failed"));
  }
}

export async function getIslandById(islandId) {
  if (USE_MOCK_API) {
    const worldIslands = syncWorldIslandsWithUsers();
    const worldIsland = worldIslands.find((island) => String(island.id) === String(islandId));
    const base = mockIslandDetails(islandId);
    const mergedBase = worldIsland ? { ...base, ...worldIsland } : base;
    const savedGrid = readMockIslandGrid(islandId);

    if (Array.isArray(savedGrid)) {
      const savedMap = new Map(savedGrid.map((cell) => [`${cell.x}-${cell.y}`, cell]));
      const normalizedGrid = mergedBase.grid.map((cell) => {
        const savedCell = savedMap.get(`${cell.x}-${cell.y}`);
        if (!savedCell) {
          return cell;
        }
        return {
          ...cell,
          buildingId: savedCell.buildingId || null,
          level: savedCell.buildingId ? (savedCell.level || 1) : 0,
          upgradeEndsAt: savedCell.buildingId ? savedCell.upgradeEndsAt || null : null
        };
      });

      return {
        ...mergedBase,
        grid: normalizedGrid
      };
    }

    return {
      ...mergedBase,
      grid: mergedBase.grid
    };
  }

  try {
    const { data } = await apiClient.get(`/api/island/${islandId}`);
    if (data?.island) {
      const base = mockIslandDetails(String(islandId));
      const island = data.island;
      const resources = normalizeResources(data?.resources || island);

      return {
        ...base,
        id: String(island.id ?? islandId),
        ownerId: String(island.user_id ?? ""),
        ownerName: "You",
        biomeId: island.bioma || base.biomeId,
        grid: applyBuildingsToGrid(base.grid, data.buildings),
        resources,
        efficiency: resources.efficiency
      };
    }
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not fetch island"));
  }
}

export async function buildOrUpgrade(payload) {
  if (USE_MOCK_API) {
    const islandId = payload?.islandId || "1";
    const current = await getIslandById(islandId);
    const targetLevel = Math.max(1, Math.min(Number(payload?.level || 1), 3));

    const grid = (current.grid || []).map((cell) => {
      if (cell.x !== payload?.x || cell.y !== payload?.y) {
        return cell;
      }

      if (cell.type !== "land") {
        return cell;
      }

      if (!cell.buildingId) {
        if (!payload?.buildingId) {
          return cell;
        }
        return {
          ...cell,
          buildingId: payload?.buildingId,
          level: 1,
          upgradeEndsAt: null
        };
      }

      const nextLevel = Math.max(cell.level || 1, targetLevel);
      return {
        ...cell,
        level: Math.min(nextLevel, 3),
        upgradeEndsAt: null
      };
    });

    writeMockIslandGrid(islandId, grid);

    return {
      island: { ...current, grid },
      resources: mockResources
    };
  }

  try {
    const requestedLevel = Math.max(1, Number(payload?.level || 1));
    const action = requestedLevel > 1 ? "upgrade" : "build";
    const backendType = FRONTEND_TO_BACKEND_BUILDING[payload?.buildingId] || payload?.buildingId;

    const body = {
      islandId: Number(payload?.islandId),
      posX: Number(payload?.x),
      posY: Number(payload?.y),
      action
    };
    if (action === "build") {
      body.type = backendType;
    }

    const { data } = await apiClient.post("/api/build", body);
    const refreshedIsland = await getIslandById(payload?.islandId);
    return {
      ...data,
      island: refreshedIsland,
      resources: normalizeResources(data?.island)
    };
  } catch (error) {
    throw new Error(parseError(error, "Build action failed"));
  }
}
export async function renameIsland(payload) {
  if (USE_MOCK_API) {
    const islandId = String(payload?.islandId || "");
    const nextName = String(payload?.name || "").trim();

    if (!islandId) {
      throw new Error("Invalid island id");
    }

    if (!nextName) {
      throw new Error("Island name is required");
    }

    const islands = syncWorldIslandsWithUsers();
    const target = islands.find((island) => String(island.id) === islandId);
    if (!target) {
      throw new Error("Island not found");
    }

    const updated = islands.map((island) =>
      String(island.id) === islandId ? { ...island, name: nextName } : island
    );
    writeMockWorldIslands(updated);

    return {
      island: { ...target, name: nextName }
    };
  }

  try {
    const { data } = await apiClient.patch(`/api/island/${payload?.islandId}/name`, {
      name: payload?.name
    });
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Rename island failed"));
  }
}

export async function destroyBuilding(payload) {
  if (USE_MOCK_API) {
    const islandId = payload?.islandId || "1";
    const current = await getIslandById(islandId);
    const grid = (current.grid || []).map((cell) => {
      if (cell.x !== payload?.x || cell.y !== payload?.y || !cell.buildingId) {
        return cell;
      }
      return {
        ...cell,
        buildingId: null,
        level: 0,
        upgradeEndsAt: null
      };
    });

    writeMockIslandGrid(islandId, grid);

    return {
      island: { ...current, grid },
      resources: mockResources
    };
  }

  try {
    const { data } = await apiClient.post("/api/build/destroy", {
      islandId: Number(payload?.islandId),
      posX: Number(payload?.x),
      posY: Number(payload?.y)
    });
    const refreshedIsland = await getIslandById(payload?.islandId);
    return {
      ...data,
      island: refreshedIsland,
      resources: normalizeResources(data?.island)
    };
  } catch (error) {
    throw new Error(parseError(error, "Destroy action failed"));
  }
}

export async function getResourceTotals() {
  if (USE_MOCK_API) {
    return mockResources;
  }

  try {
    const { data } = await apiClient.get("/api/resources");
    return normalizeResources(data);
  } catch (error) {
    throw new Error(parseError(error, "Could not fetch resources"));
  }
}

export async function getWorldIslands() {
  if (USE_MOCK_API) {
    const islands = syncWorldIslandsWithUsers();
    return { islands };
  }

  try {
    const { data } = await apiClient.get("/api/world");
    return data;
  } catch (_error) {
    return null;
  }
}

export async function getHeliumCoreState() {
  if (USE_MOCK_API) {
    const state = readMockCoreState();
    return {
      ...state,
      image: state.active ? imageMap.buildings.heliosCoreActive : imageMap.buildings.heliosCoreInactive
    };
  }

  try {
    const { data } = await apiClient.get("/api/core");
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not fetch Helium Core state"));
  }
}

export async function activateHeliumCore(payload) {
  if (USE_MOCK_API) {
    const current = readMockCoreState();
    if (current.active) {
      return {
        ...current,
        image: imageMap.buildings.heliosCoreActive
      };
    }

    const nextState = {
      active: true,
      activatedBy: payload?.username || "Player",
      activatedAt: new Date().toISOString()
    };
    writeMockCoreState(nextState);
    return {
      ...nextState,
      image: imageMap.buildings.heliosCoreActive
    };
  }

  try {
    const { data } = await apiClient.post("/api/core/activate", payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Activate core failed"));
  }
}

export { API_URL, USE_MOCK_API };








export async function contributeHeliumCore(payload) {
  if (USE_MOCK_API) {
    const current = readMockCoreState();
    return {
      ...current,
      totals: {
        energy: Number(payload?.energy || 0),
        water: Number(payload?.water || 0),
        biomass: Number(payload?.biomass || 0)
      }
    };
  }

  try {
    const { data } = await apiClient.post("/api/core/contribute", payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Core contribution failed"));
  }
}

export async function getChatMessages(limit = 80) {
  if (USE_MOCK_API) {
    return { messages: [] };
  }

  try {
    const { data } = await apiClient.get(`/api/chat?limit=${Math.max(1, Math.min(Number(limit) || 80, 200))}`);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not fetch chat"));
  }
}

export async function postChatMessage(payload) {
  if (USE_MOCK_API) {
    return {
      message: {
        id: `${Date.now()}`,
        user: payload?.username || "You",
        message: payload?.message || "",
        createdAt: new Date().toISOString(),
        type: "player"
      }
    };
  }

  try {
    const { data } = await apiClient.post("/api/chat", payload);
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not send chat message"));
  }
}

export async function pingPresence() {
  if (USE_MOCK_API) {
    return { ok: true };
  }

  try {
    const { data } = await apiClient.post("/api/presence/ping", {});
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not update presence"));
  }
}

export async function getPresence() {
  if (USE_MOCK_API) {
    return { users: [] };
  }

  try {
    const { data } = await apiClient.get("/api/presence");
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not fetch online users"));
  }
}

export async function setResourceMultiplier(multiplier) {
  if (USE_MOCK_API) {
    return { ok: true, time_multiplier: multiplier };
  }

  try {
    const { data } = await apiClient.post("/api/resources/multiplier", { multiplier });
    return data;
  } catch (error) {
    throw new Error(parseError(error, "Could not update multiplier"));
  }
}


