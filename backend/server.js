require('dotenv').config();

const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const { registerSocketHandlers, startProductionTicker } = require('./ws');

const authRoutes = require('./routes/authRoutes');
const islandRoutes = require('./routes/islandRoutes');
const buildRoutes = require('./routes/buildRoutes');
const resourceRoutes = require('./routes/resourceRoutes');
const healthRoutes = require('./routes/healthRoutes');
const worldRoutes = require('./routes/worldRoutes');
const socialRoutes = require('./routes/socialRoutes');
const coreRoutes = require('./routes/coreRoutes');
const authMiddleware = require('./middleware/auth');
const authController = require('./controllers/authController');
const islandController = require('./controllers/islandController');
const buildController = require('./controllers/buildController');
const resourceController = require('./controllers/resourceController');

function createNoopIo() {
  return {
    to() {
      return {
        emit() {}
      };
    },
    emit() {}
  };
}

function createApp(options = {}) {
  const enableRealtime = options.enableRealtime ?? process.env.ENABLE_REALTIME !== 'false';

  const app = express();

  const allowedOrigin = process.env.CLIENT_ORIGIN || '*';
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }

    return next();
  });

  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ service: 'solara-backend', status: 'ok' });
  });

  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/island', islandRoutes);
  app.use('/api/build', buildRoutes);
  app.use('/api/resources', resourceRoutes);
  app.use('/api/world', worldRoutes);
  app.use('/api', socialRoutes);
  app.use('/api/core', coreRoutes);

  app.post('/register', authController.register);
  app.post('/login', authController.login);
  app.get('/island/:id', authMiddleware, islandController.getIsland);
  app.post('/build', authMiddleware, buildController.buildOrUpgrade);
  app.post('/destroy', authMiddleware, buildController.destroyBuilding);
  app.get('/resources', authMiddleware, resourceController.getResources);
  app.get('/health', (req, res) => res.json({ ok: true }));

  const server = http.createServer(app);

  if (enableRealtime) {
    const io = new Server(server, {
      cors: {
        origin: process.env.CLIENT_ORIGIN || '*',
        methods: ['GET', 'POST']
      }
    });

    app.set('io', io);
    registerSocketHandlers(io);
    startProductionTicker(io);
  } else {
    app.set('io', createNoopIo());
  }

  return { app, server };
}

function startServer() {
  const { server } = createApp({ enableRealtime: true });
  const PORT = Number(process.env.PORT || 4000);
  server.listen(PORT, () => {
    console.log(`Solara backend listening on port ${PORT}`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createApp,
  startServer
};

