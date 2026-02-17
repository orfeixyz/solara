# Solara Backend

Node.js + Express + Socket.IO backend for Solara multiplayer gameplay.

## Setup

```bash
cd backend
npm install
npm run migrate
npm run dev
```

## Environment

Use `backend/.env` and update:

- `DATABASE_URL`: Neon Postgres connection string
- `JWT_SECRET`: JWT signing key
- `CLIENT_ORIGIN`: frontend URL
- `TICK_INTERVAL_MS`: production tick interval (default 60000)

## REST API

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/island/:id` (auth)
- `POST /api/build` (auth)
- `GET /api/resources` (auth)
- `GET /api/health`

## Socket Events

- `player_joined`
- `player_left`
- `resource_update`
- `building_update`
- `chat_message`
- `tick_update`
- `sync_state` (sent by server on connect/reconnect)

## Notes

- Persisted entities: users, islands, buildings, chat, production_log.
- Production ticker runs globally and logs every tick.
- Build endpoint deducts resources before commit and broadcasts updates.
