-- Add username support for frontend compatibility
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE users
SET username = COALESCE(
  NULLIF(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9_]+', '', 'g'), ''),
  'player_' || id
)
WHERE username IS NULL;

WITH ranked AS (
  SELECT id, username, ROW_NUMBER() OVER (PARTITION BY username ORDER BY id) AS rn
  FROM users
)
UPDATE users u
SET username = u.username || '_' || u.id
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username);
