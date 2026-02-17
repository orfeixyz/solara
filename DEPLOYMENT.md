# Solara Deployment (Neon + Vercel)

## 1) Neon database
1. Create a Neon project and copy the connection string.
2. Put the value in `backend/.env` as `DATABASE_URL`.
3. Run migrations locally once:
   - `cd backend`
   - `npm install`
   - `npm run migrate`

## 2) Backend deploy (Vercel project, Root Directory = `backend`)
Set these environment variables in Vercel:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN` (recommended: `7d`)
- `CLIENT_ORIGIN` (your frontend URL)
- `TICK_INTERVAL_MS` (recommended production: `60000`)
- `CHAT_HISTORY_LIMIT` (recommended: `100`)
- `NODE_ENV=production`

Deploy command: default Vercel settings are enough with `backend/vercel.json`.

Important:
- Vercel serverless instances are ephemeral. This project now includes polling fallback in the frontend so resource gameplay stays functional even when realtime socket delivery is degraded.

## 3) Frontend deploy (Vercel project, Root Directory = repository root)
Set these environment variables in Vercel:
- `REACT_APP_API_URL` = backend deployment URL
- `REACT_APP_WS_URL` = backend deployment URL

`vercel.json` at root enables SPA routing (`/world`, `/island/:id`, etc.).

## 4) Post-deploy verification checklist
1. Register a new user.
2. Login and open `/island/:id`.
3. Build and upgrade a building (resource totals must decrease and persist after refresh).
4. Wait one tick (`TICK_INTERVAL_MS`) and confirm resources increase.
5. Destroy a building and confirm persistence after refresh.
6. Change time multiplier (x1/x2/x5) and verify server-applied value in resource panel.
