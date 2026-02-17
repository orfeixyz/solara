const { createApp } = require('../server');

const { app } = createApp({ enableRealtime: true });

module.exports = app;

