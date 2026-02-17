const { createApp } = require('../backend/server');

const { app } = createApp({ enableRealtime: true });

module.exports = app;
