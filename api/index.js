let app = null;
let bootError = null;

function getApp() {
  if (app || bootError) {
    return;
  }

  try {
    const { createApp } = require('../backend/server');
    app = createApp({ enableRealtime: false }).app;
  } catch (error) {
    bootError = error;
  }
}

module.exports = (req, res) => {
  const path = req.url || '';

  if (path.startsWith('/api/health')) {
    return res.status(200).json({
      ok: true,
      service: 'solara-api-wrapper',
      timestamp: new Date().toISOString(),
      runtime: process.version
    });
  }

  getApp();

  if (bootError) {
    const details = bootError?.stack || bootError?.message || String(bootError);
    return res.status(500).json({
      ok: false,
      error: 'api_boot_failed',
      details
    });
  }

  return app(req, res);
};
