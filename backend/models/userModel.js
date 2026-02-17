const { withTransaction } = require('./db');
const { createEmptyGrid } = require('./gameRules');

async function createUserWithIsland({ email, username, hashedPassword, bioma }) {
  return withTransaction(async (client) => {
    const userInsert = await client.query(
      `INSERT INTO users (email, username, hashed_password, bioma)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, username, bioma`,
      [email, username, hashedPassword, bioma]
    );

    const user = userInsert.rows[0];

    const islandInsert = await client.query(
      `INSERT INTO islands (user_id, grid, energy, water, biomass, time_multiplier)
       VALUES ($1, $2::jsonb, 220, 220, 220, 1)
       RETURNING id, user_id, grid, energy, water, biomass, time_multiplier`,
      [user.id, JSON.stringify(createEmptyGrid())]
    );

    const island = islandInsert.rows[0];

    await client.query('UPDATE users SET island_id = $1 WHERE id = $2', [island.id, user.id]);

    return { ...user, island_id: island.id };
  });
}

async function findByEmail(email) {
  const { query } = require('./db');
  const result = await query(
    `SELECT id, email, username, hashed_password, bioma, island_id
     FROM users
     WHERE email = $1`,
    [email]
  );
  return result.rows[0] || null;
}

async function findByUsername(username) {
  const { query } = require('./db');
  const result = await query(
    `SELECT id, email, username, hashed_password, bioma, island_id
     FROM users
     WHERE username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

async function findByUsernameOrEmail(identifier) {
  const { query } = require('./db');
  const result = await query(
    `SELECT id, email, username, hashed_password, bioma, island_id
     FROM users
     WHERE email = $1 OR username = $1
     LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
}

async function findById(userId) {
  const { query } = require('./db');
  const result = await query(
    `SELECT id, email, username, bioma, island_id
     FROM users
     WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

module.exports = {
  createUserWithIsland,
  findByEmail,
  findByUsername,
  findByUsernameOrEmail,
  findById
};
