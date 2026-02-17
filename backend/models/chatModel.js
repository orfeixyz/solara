const { query } = require('./db');

async function addMessage({ userId, message }) {
  const result = await query(
    `INSERT INTO chat (user_id, message)
     VALUES ($1, $2)
     RETURNING id, user_id, message, timestamp`,
    [userId || null, message]
  );
  return result.rows[0];
}

async function getLatest(limit = 100) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 300));
  const result = await query(
    `SELECT c.id, c.user_id, u.email, c.message, c.timestamp
     FROM chat c
     LEFT JOIN users u ON u.id = c.user_id
     ORDER BY c.timestamp DESC
     LIMIT $1`,
    [safeLimit]
  );
  return result.rows.reverse();
}

module.exports = {
  addMessage,
  getLatest
};
