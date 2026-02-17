module.exports = (req, res) => {
  const path = req.url || '';

  if (path.startsWith('/api/health')) {
    return res.status(200).json({
      ok: true,
      service: 'solara-api-diagnostic',
      marker: 'DIAG_NO_BACKEND_LOAD',
      timestamp: new Date().toISOString()
    });
  }

  return res.status(503).json({
    ok: false,
    error: 'diagnostic_mode',
    message: 'Backend load intentionally disabled for deployment verification.'
  });
};
