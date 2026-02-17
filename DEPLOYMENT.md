# Solara Deployment (Neon + One Vercel Project)

## 1) Neon database
1. Create a Neon project and copy the connection string.
2. Put the value in local `backend/.env` as `DATABASE_URL`.
3. Run migrations locally once:
   - `cd backend`
   - `npm install`
   - `npm run migrate`

## 2) Single Vercel project (Root Directory = `/`)
Import `https://github.com/orfeixyz/solara` only once.

Set these environment variables in Vercel project:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_ORIGIN=https://<your-project>.vercel.app`
- `TICK_INTERVAL_MS=60000`
- `CHAT_HISTORY_LIMIT=100`
- `NODE_ENV=production`
- `REACT_APP_USE_MOCK_API=false`

Notes:
- Frontend uses same-origin API by default, so `REACT_APP_API_URL` and `REACT_APP_WS_URL` are optional.
- Root `vercel.json` now routes API endpoints to `api/index.js` and serves React build for app routes.

## 3) Post-deploy verification checklist
1. Register a new user.
2. Login and open `/island/:id`.
3. Build and upgrade a building (resources must decrease and persist after refresh).
4. Wait one tick (`TICK_INTERVAL_MS`) and confirm resources increase.
5. Destroy a building and confirm persistence after refresh.
6. Change time multiplier (x1/x2/x5) and verify server-applied value in the resource panel.
