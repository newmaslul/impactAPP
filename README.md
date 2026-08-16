# מסלול IMPACT

> Move · Connect · Impact — הופכים פעילות אישית להשפעה משותפת

React + Vite app implementing the mobile + admin screens from [PRODUCT_SPEC.md](./PRODUCT_SPEC.md), backed by a real Node/Express + SQLite API in [server/](./server).

## Develop

Two processes: the frontend, and the backend it talks to for auth + the admin employee list.

```bash
# terminal 1 — backend (http://localhost:4000)
cd server
npm install
npm run dev

# terminal 2 — frontend (http://localhost:5173)
npm install
npm run dev
```

The frontend calls `http://localhost:4000` by default; copy `.env.example` to `.env` and set `VITE_API_URL` to point it elsewhere.

## Backend

- **Auth**: phone + password, real bcrypt hashing, JWT sessions (`POST /api/auth/register`, `/login`, `/forgot-password`, `GET /me`).
- **Admin**: `GET/PATCH/DELETE /api/admin/employees`, `POST /api/admin/employees/invite` — currently open (no admin-role check yet); see the comment in `server/routes/employees.js` before deploying this for real.
- **Storage**: SQLite via Node's built-in `node:sqlite` (no native build step). The database file lives at `server/data/maslul.db` and is gitignored.
- **Biometric login**: `POST /api/auth/biometric-login` is a documented simplification — it trusts the client's local WebAuthn check rather than verifying a signed assertion server-side. See the comment in `server/routes/auth.js`.

Copy `server/.env.example` to `server/.env` to set `JWT_SECRET` and `PORT` for a real deployment (the code falls back to dev defaults otherwise).

## Deploy

**Frontend:**

```bash
npm run deploy
```

Builds the app and publishes `dist/` to the `gh-pages` branch, which GitHub Pages serves at the live URL. Rebuild with `VITE_API_URL` set to your hosted backend before deploying, or the live site will try to reach `localhost:4000` and fail.

**Backend:** not deployed anywhere public yet — it only runs locally. It needs a host that can run a persistent Node process (Render, Railway, Fly.io, etc.); GitHub Pages only serves static files.
