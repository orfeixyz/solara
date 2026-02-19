const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

function createToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username,
      islandId: user.island_id,
      bioma: user.bioma
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 32);
}

function deriveUsernameFromEmail(email) {
  const local = String(email || '').split('@')[0];
  return normalizeUsername(local) || `player_${Date.now()}`;
}

async function register(req, res) {
  try {
    const { email, password, bioma = 'default' } = req.body;
    const requestedUsername = req.body.username;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'password must contain at least 6 characters' });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const username = normalizeUsername(requestedUsername) || deriveUsernameFromEmail(normalizedEmail);

    const existingEmail = await userModel.findByEmail(normalizedEmail);
    if (existingEmail) {
      return res.status(409).json({ message: 'email already registered' });
    }

    const existingUsername = await userModel.findByUsername(username);
    if (existingUsername) {
      return res.status(409).json({ message: 'username already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created = await userModel.createUserWithIsland({
      email: normalizedEmail,
      username,
      hashedPassword,
      bioma
    });

    const token = createToken(created);

    return res.status(201).json({
      token,
      user: {
        id: created.id,
        username: created.username,
        email: created.email,
        bioma: created.bioma,
        island_id: created.island_id
      }
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'email or username already registered' });
    }
    return res.status(500).json({ message: 'register failed', details: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, username, password } = req.body;
    const identifier = String(email || username || '').trim().toLowerCase();

    if (!identifier || !password) {
      return res.status(400).json({ message: 'username/email and password are required' });
    }

    const user = await userModel.findByUsernameOrEmail(identifier);

    if (!user) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.hashed_password);
    if (!valid) {
      return res.status(401).json({ message: 'invalid credentials' });
    }

    const token = createToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        bioma: user.bioma,
        island_id: user.island_id
      }
    });
  } catch (error) {
    return res.status(500).json({ message: 'login failed', details: error.message });
  }
}

async function deleteMe(req, res) {
  try {
    const deleted = await userModel.deleteById(req.user.id);
    if (!deleted) {
      return res.status(404).json({ message: 'user not found' });
    }
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ message: 'delete account failed', details: error.message });
  }
}

module.exports = {
  register,
  login,
  deleteMe
};
