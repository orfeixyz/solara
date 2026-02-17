const { createApp } = require('../backend/server');

const { app } = createApp({ enableRealtime: false });

module.exports = app;

