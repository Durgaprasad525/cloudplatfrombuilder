# Deploy Backend to Railway

This guide walks through deploying the GPU Cloud API backend to [Railway](https://railway.app). Railway will run the Node.js API and provide Postgres and Redis add-ons.

## Prerequisites

- GitHub repo pushed (this project)
- [Railway](https://railway.app) account (GitHub login)
- Railway CLI optional; you can do everything in the dashboard

---

## 1. Create a new project

1. Go to [railway.app](https://railway.app) and sign in with GitHub.
2. Click **New Project**.
3. Choose **Deploy from GitHub repo** and select your `cloudplatfrombuilder` (or this repo) repository.
4. Railway will create a project. You’ll add three services: **Postgres**, **Redis**, and the **Backend** API.

---

## 2. Add Postgres

1. In the project, click **+ New** → **Database** → **PostgreSQL**.
2. Railway provisions Postgres and exposes **`DATABASE_URL`** (and often `PGHOST`, `PGPORT`, etc.).
3. You don’t need to copy the URL yet; we’ll link it to the backend service.

---

## 3. Add Redis

1. Click **+ New** → **Database** → **Redis** (or **Add Redis** if shown).
2. Railway provisions Redis and exposes **`REDIS_URL`** (or similar).
3. Again, linking will provide this to the backend.

---

## 4. Add Backend service (API)

1. Click **+ New** → **GitHub Repo** (or **Empty Service** if you already have the repo connected).
2. Select the same repository.
3. Configure the service:

### Build & run (Docker)

- **Build**: Railway can use the existing Dockerfile.
- **Dockerfile path**: `backend/Dockerfile`
- **Root directory**: leave default (repo root). Railway uses the repo root as build context, so the Dockerfile’s `COPY` paths are correct.
- **Start command**: leave default (the Dockerfile `CMD` runs `node dist/index.js`).

If your Railway plan uses **Nixpacks** instead of Docker:

- **Root directory**: `.` (repo root)
- **Build command**: `npm run build -w @gpu-cloud/shared && npm run build -w @gpu-cloud/backend`
- **Start command**: `npm run start -w @gpu-cloud/backend`
- **Watch paths**: `backend/**`, `shared/**` (optional; redeploy only when these change)

### Variables

In the backend service → **Variables** (or **Settings** → **Variables**):

1. **Link Postgres**  
   Use “Add variable” / “Reference” and select the Postgres service’s **`DATABASE_URL`**. Railway will inject it.

2. **Link Redis**  
   Add a reference to the Redis service’s **`REDIS_URL`** (or the variable name Railway shows). If Redis only exposes a host/port, set:
   - `REDIS_URL=redis://default:<password>@<host>:<port>`
   using the values from the Redis service.

3. **Migrations**
   - Add: **`RUN_MIGRATIONS`** = **`1`**  
   So the API runs schema migrations on startup (idempotent; safe on every deploy).

4. **PORT**  
   Railway sets **`PORT`** automatically; the backend already uses `process.env.PORT`, so no need to set it.

Example variables:

| Variable         | Value / source                    |
|------------------|-----------------------------------|
| `DATABASE_URL`   | Referenced from Postgres service |
| `REDIS_URL`      | Referenced from Redis service    |
| `RUN_MIGRATIONS` | `1`                              |

---

## 5. Deploy

1. Save the variables and trigger a deploy (push to the connected branch, or **Deploy** in the dashboard).
2. Wait for the build to finish. The first deploy may take a few minutes (install, build shared, build backend).
3. Open the **Backend** service → **Settings** → **Networking** (or **Deployments** → deployment) and create a **Public URL** (e.g. **Generate domain**). You’ll get something like:
   - `https://your-backend-name.up.railway.app`

---

## 6. Verify

1. **Health**
   - Open `https://<your-backend-url>/health` in a browser or with `curl`.
   - You should see JSON with `"status":"ok"` and `database` / `redis` up when Postgres and Redis are linked correctly.

2. **API**
   - Create a key:  
     `curl -X POST https://<your-backend-url>/api/keys -H "Content-Type: application/json" -d '{"name":"Test"}'`
   - Use the returned key with:  
     `curl -X POST https://<your-backend-url>/v1/chat/completions -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}]}'`

---

## 7. (Optional) Workers

The repo also has a **worker** process (`worker.ts`) that consumes the BullMQ queue. On Railway you can:

- Add a second service from the same repo, same Dockerfile (`backend/Dockerfile`), but with **Start command** overridden to:  
  `node dist/worker.js`  
  and the same `DATABASE_URL`, `REDIS_URL` (no `RUN_MIGRATIONS` needed for the worker), **or**
- Omit workers for a minimal demo; the API does in-process mock inference, so the app works without workers. Workers are for scaling out job processing.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| Build fails (e.g. “module not found”) | Ensure build uses repo root and builds `@gpu-cloud/shared` then backend (Docker or build command above). |
| 503 / DB or Redis down | In `/health`, see which service is down. Confirm `DATABASE_URL` and `REDIS_URL` are set and linked from Postgres/Redis. |
| “Relation does not exist” | Set `RUN_MIGRATIONS=1` and redeploy so migrations run on startup. |
| CORS errors from frontend | Backend uses `cors()` with default (allows all). If you restrict origins later, add your Vercel/frontend URL. |

---

## Next: frontend (e.g. Vercel)

After the backend is live, set your frontend’s **`NEXT_PUBLIC_API_URL`** to your Railway backend URL (e.g. `https://your-backend-name.up.railway.app`) so the dashboard calls the deployed API.
