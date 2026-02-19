const { query } = require('../models/db');
const chatModel = require('../models/chatModel');

async function getMessages(req, res) {
  try {
    const limit = Number(req.query?.limit || 80);
    const rows = await chatModel.getLatest(limit);

    const messages = rows.map((row) => ({
      id: row.id,
      user: row.email ? String(row.email).split('@')[0] : 'System',
      username: row.email ? String(row.email).split('@')[0] : 'System',
      message: row.message,
      createdAt: row.timestamp,
      type: row.user_id ? 'player' : 'system'
    }));

    return res.json({ messages });
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch chat messages', details: error.message });
  }
}

async function postMessage(req, res) {
  try {
    const message = String(req.body?.message || '').trim();
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const saved = await chatModel.addMessage({
      userId: req.user.id,
      message: message.slice(0, 240)
    });

    return res.status(201).json({
      message: {
        id: saved.id,
        user: req.user.username,
        username: req.user.username,
        message: saved.message,
        createdAt: saved.timestamp,
        type: 'player'
      }
    });
  } catch (error) {
    return res.status(500).json({ error: 'failed to send chat message', details: error.message });
  }
}

async function pingPresence(req, res) {
  try {
    await query(
      `INSERT INTO player_presence (user_id, username, last_seen)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET username = EXCLUDED.username, last_seen = NOW()`,
      [req.user.id, req.user.username || req.user.email || `player_${req.user.id}`]
    );

    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: 'failed to update presence', details: error.message });
  }
}

async function getPresence(req, res) {
  try {
    const rows = (
      await query(
        `SELECT username
         FROM player_presence
         WHERE last_seen >= NOW() - INTERVAL '90 seconds'
         ORDER BY username ASC`
      )
    ).rows;

    const users = rows.map((row) => row.username).filter(Boolean);
    return res.json({ users });
  } catch (error) {
    return res.status(500).json({ error: 'failed to fetch presence', details: error.message });
  }
}

module.exports = {
  getMessages,
  postMessage,
  pingPresence,
  getPresence
};
