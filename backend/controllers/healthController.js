function health(req, res) {
  return res.json({
    ok: true,
    service: 'solara-backend',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  health
};
