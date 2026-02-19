const jwt = require('jsonwebtoken');
const { withTransaction } = require('../models/db');
const islandModel = require('../models/islandModel');
const buildingModel = require('../models/buildingModel');
const chatModel = require('../models/chatModel');
const productionLogModel = require('../models/productionLogModel');
const { computeProductionTick, isCoreReady } = require('../models/gameRules');

const connectedUsers = new Map();

function getOnlineCount() {
  return new Set(Array.from(connectedUsers.values()).map((u) => u.userId)).size;
}

function readSocketToken(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const authHeader = socket.handshake.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  return null;
}

async function sendSyncState(socket) {
  const island = await islandModel.getById(socket.user.islandId);
  const buildings = await buildingModel.getByIslandId(socket.user.islandId);
  const chat = await chatModel.getLatest(Number(process.env.CHAT_HISTORY_LIMIT) || 100);

  // sync_state is used on reconnect to restore full island + chat snapshots from DB.
  socket.emit('sync_state', {
    island,
    buildings,
    chat
  });
}

function registerSocketHandlers(io) {
  io.use((socket, next) => {
    try {
      const token = readSocketToken(socket);
      if (!token) {
        return next(new Error('Missing auth token'));
      }

      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        userId: payload.userId,
        email: payload.email,
        username: payload.username || payload.email,
        islandId: payload.islandId
      };
      return next();
    } catch (error) {
      return next(new Error('Unauthorized socket'));
    }
  });

  io.on('connection', async (socket) => {
    connectedUsers.set(socket.id, socket.user);

    socket.join(`island:${socket.user.islandId}`);

    // player_joined lets clients update online presence indicators.
    io.emit('player_joined', {
      userId: socket.user.userId,
      email: socket.user.email,
      username: socket.user.username,
      islandId: socket.user.islandId,
      onlineCount: getOnlineCount()
    });

    await sendSyncState(socket);

    socket.on('request_sync', async () => {
      await sendSyncState(socket);
    });

    socket.on('chat_message', async (payload) => {
      const message = String(payload?.message || '').trim();
      if (!message) {
        return;
      }

      const cropped = message.slice(0, 500);
      const saved = await chatModel.addMessage({ userId: socket.user.userId, message: cropped });

      // chat_message persists to DB first, then broadcasts the committed message to clients.
      io.emit('chat_message', {
        ...saved,
        email: socket.user.email,
        username: socket.user.username,
        user: socket.user.username
      });
    });

    socket.on('set_time_multiplier', async (payload) => {
      const requested = Number(payload?.multiplier);
      if (![1, 2, 5].includes(requested)) {
        socket.emit('error_message', { error: 'multiplier must be 1, 2 or 5' });
        return;
      }

      try {
        const updated = await withTransaction(async (client) => {
          const islandRes = await client.query(
            `SELECT id, user_id, energy, water, biomass, time_multiplier, first_level3_announced, alpha_completed
             FROM islands
             WHERE id = $1
             FOR UPDATE`,
            [socket.user.islandId]
          );

          const island = islandRes.rows[0];
          if (!island || island.user_id !== socket.user.userId) {
            throw new Error('Island ownership validation failed');
          }

          const updateRes = await client.query(
            `UPDATE islands
             SET time_multiplier = $2
             WHERE id = $1
             RETURNING id, user_id, energy, water, biomass, time_multiplier,
                       first_level3_announced, alpha_completed`,
            [island.id, requested]
          );

          return updateRes.rows[0];
        });

        // resource_update informs all island viewers about current multiplier/resource values.
        io.to(`island:${socket.user.islandId}`).emit('resource_update', {
          islandId: updated.id,
          energy: updated.energy,
          water: updated.water,
          biomass: updated.biomass,
          time_multiplier: updated.time_multiplier
        });
      } catch (error) {
        socket.emit('error_message', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
      connectedUsers.delete(socket.id);

      // player_left lets clients remove users from presence lists.
      io.emit('player_left', {
        userId: socket.user.userId,
        username: socket.user.username,
        islandId: socket.user.islandId,
        onlineCount: getOnlineCount()
      });
    });
  });
}

function startProductionTicker(io) {
  const interval = Number(process.env.TICK_INTERVAL_MS || 60000);

  setInterval(async () => {
    const islands = await islandModel.getAll();

    for (const island of islands) {
      try {
        const tickResult = await withTransaction(async (client) => {
          const islandRes = await client.query(
            `SELECT i.id, i.user_id, i.energy, i.water, i.biomass, i.time_multiplier,
                    i.first_level3_announced, i.alpha_completed, u.bioma
             FROM islands i
             JOIN users u ON u.id = i.user_id
             WHERE i.id = $1
             FOR UPDATE`,
            [island.id]
          );

          const lockedIsland = islandRes.rows[0];
          if (!lockedIsland) {
            return null;
          }

          const buildingRows = (
            await client.query(
              `SELECT id, island_id, type, level, pos_x, pos_y
               FROM buildings
               WHERE island_id = $1`,
              [lockedIsland.id]
            )
          ).rows;

          let tick = computeProductionTick({
            island: lockedIsland,
            buildings: buildingRows
          });

          let multiplierDowngraded = false;
          let finalMultiplier = lockedIsland.time_multiplier;

          if (lockedIsland.energy < tick.consumed.energy && lockedIsland.time_multiplier > 1) {
            multiplierDowngraded = true;
            finalMultiplier = 1;
            tick = computeProductionTick({
              island: { ...lockedIsland, time_multiplier: 1 },
              buildings: buildingRows
            });
          }

          const updatedResources = {
            energy: Math.max(0, lockedIsland.energy + tick.net.energy),
            water: Math.max(0, lockedIsland.water + tick.net.water),
            biomass: Math.max(0, lockedIsland.biomass + tick.net.biomass)
          };

          const level3Count = buildingRows.filter((b) => b.level >= 3).length;
          const firstLevel3ReachedNow = !lockedIsland.first_level3_announced && level3Count >= 1;

          const alphaNow =
            !lockedIsland.alpha_completed &&
            isCoreReady({
              island: {
                ...lockedIsland,
                ...updatedResources
              },
              efficiency: tick.efficiency,
              buildings: buildingRows,
              productionNet: tick.net
            });

          const islandUpdate = (
            await client.query(
              `UPDATE islands
               SET energy = $2,
                   water = $3,
                   biomass = $4,
                   time_multiplier = $5,
                   first_level3_announced = $6,
                   alpha_completed = $7
               WHERE id = $1
               RETURNING id, user_id, energy, water, biomass, time_multiplier,
                         first_level3_announced, alpha_completed`,
              [
                lockedIsland.id,
                updatedResources.energy,
                updatedResources.water,
                updatedResources.biomass,
                finalMultiplier,
                lockedIsland.first_level3_announced || firstLevel3ReachedNow,
                lockedIsland.alpha_completed || alphaNow
              ]
            )
          ).rows[0];

          await client.query(
            `INSERT INTO production_log (island_id, energy_produced, water_produced, biomass_produced)
             VALUES ($1, $2, $3, $4)`,
            [lockedIsland.id, tick.produced.energy, tick.produced.water, tick.produced.biomass]
          );

          return {
            island: islandUpdate,
            tick,
            firstLevel3ReachedNow,
            alphaNow,
            multiplierDowngraded
          };
        });

        if (!tickResult) {
          continue;
        }

        // tick_update broadcasts every production cycle and feeds client animations/progress bars.
        io.to(`island:${tickResult.island.id}`).emit('tick_update', {
          islandId: tickResult.island.id,
          efficiency: tickResult.tick.efficiency,
          produced: tickResult.tick.produced,
          net: tickResult.tick.net,
          time_multiplier: tickResult.island.time_multiplier
        });

        // resource_update keeps resource counters consistent with the persisted island state.
        io.to(`island:${tickResult.island.id}`).emit('resource_update', {
          islandId: tickResult.island.id,
          energy: tickResult.island.energy,
          water: tickResult.island.water,
          biomass: tickResult.island.biomass,
          time_multiplier: tickResult.island.time_multiplier
        });

        if (tickResult.multiplierDowngraded) {
          const systemMessage = await chatModel.addMessage({
            userId: null,
            message: `System: island ${tickResult.island.id} multiplier reset to x1 due to low energy.`
          });
          io.emit('chat_message', systemMessage);
        }

        if (tickResult.firstLevel3ReachedNow) {
          const systemMessage = await chatModel.addMessage({
            userId: null,
            message: `System: island ${tickResult.island.id} reached first level 3 building.`
          });
          io.emit('chat_message', systemMessage);
        }

        if (tickResult.alphaNow) {
          const systemMessage = await chatModel.addMessage({
            userId: null,
            message: `System: island ${tickResult.island.id} completed Helium Core requirements.`
          });
          io.emit('chat_message', systemMessage);
        }
      } catch (error) {
        io.emit('error_message', {
          error: `tick failed for island ${island.id}`,
          details: error.message
        });
      }
    }
  }, interval);
}

module.exports = {
  registerSocketHandlers,
  startProductionTicker
};


