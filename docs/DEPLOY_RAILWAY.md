# Deploy Backend to Railway

This guide walks through deploying the GPU Cloud API backend to [Railway](https://railway.app). Railway will run the Node.js API and provide Postgres and Redis add-ons.

**Important:** Do **not** add a `railway.json` at the repo root. Railway applies config-in-code to **all** services from this repo. A root config with `dockerfilePath: "backend/Dockerfile"` would make the **frontend** service build the backend image (causing errors like "Cannot find module '/app/backend/server.js'"). Each service must set **`RAILWAY_DOCKERFILE_PATH`** in the dashboard instead (backend: `backend/Dockerfile`, frontend: `frontend/Dockerfile`).

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

There is **no** `railway.json` at the repo root so that the **frontend** service can use its own Dockerfile via the dashboard. For the **backend** service you must set:

- **Variables** → **`RAILWAY_DOCKERFILE_PATH`** = **`backend/Dockerfile`**
- **Settings** → **Deploy** → **Healthcheck path**: **`/health`** (optional but recommended)

- **Root directory**: leave default (repo root). Build context is repo root so the Dockerfile’s `COPY` paths are correct.
- **Start command**: leave empty (the Dockerfile `CMD` runs `node dist/index.js`).

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
   Use the Redis service’s **public** URL so the backend can resolve the hostname. Reference **`REDIS_PUBLIC_URL`** (not `REDIS_URL`), or the backend will get `redis.railway.internal`, which may not resolve and cause `ENOTFOUND redis.railway.internal`. Set:
   - **`REDIS_URL`** = **`${{Redis.REDIS_PUBLIC_URL}}`**
   If you paste values manually, use the URL that contains `.proxy.rlwy.net` (the public proxy), not `redis.railway.internal`.

3. **Migrations**
   - Add: **`RUN_MIGRATIONS`** = **`1`**  
   So the API runs schema migrations on startup (idempotent; safe on every deploy).

4. **PORT**  
   Railway sets **`PORT`** automatically; the backend already uses `process.env.PORT`, so no need to set it.

**Paste in Variables (Raw Editor):**  
In the backend service → **Variables** → open the **RAW** editor and paste:

```json
{
  "RAILWAY_DOCKERFILE_PATH": "backend/Dockerfile",
  "DATABASE_URL": "${{Postgres.DATABASE_URL}}",
  "REDIS_URL": "${{Redis.REDIS_PUBLIC_URL}}",
  "RUN_MIGRATIONS": "1"
}
```

Use **`REDIS_PUBLIC_URL`** as the **value** for the variable **`REDIS_URL`**: the backend reads only **`REDIS_URL`**. So set `REDIS_URL` = `${{Redis.REDIS_PUBLIC_URL}}` (or paste the public `redis://...@*.proxy.rlwy.net:...` URL). Using the internal host `redis.railway.internal` can cause `ENOTFOUND`; if you see `ECONNREFUSED 127.0.0.1:6379`, the app did not receive `REDIS_URL` (wrong variable name or not set).

Replace `Postgres` and `Redis` with your actual Postgres and Redis **service names** in the project if different (e.g. `${{MyPostgres.DATABASE_URL}}`).

Example variables:

| Variable                  | Value / source                          |
|---------------------------|-----------------------------------------|
| `RAILWAY_DOCKERFILE_PATH` | `backend/Dockerfile`                    |
| `DATABASE_URL`            | Referenced from Postgres service        |
| `REDIS_URL`               | Referenced from Redis **REDIS_PUBLIC_URL** |
| `RUN_MIGRATIONS`          | `1`                                     |

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

**If healthcheck never becomes healthy:** The server now starts first and then checks DB/Redis, so the process stays up. Check deployment logs: if you see “Cannot connect to PostgreSQL” or “Cannot connect to Redis”, use the **public** URLs for both:
- **`REDIS_URL`** = Redis service’s **REDIS_PUBLIC_URL** (host like `*.proxy.rlwy.net`, not `redis.railway.internal`).
- **`DATABASE_URL`** = Postgres service’s **DATABASE_PUBLIC_URL** (host like `*.proxy.rlwy.net`, not `postgres.railway.internal`) if the internal host doesn’t resolve.

2. **API**
   - Create a key:  
     `curl -X POST https://<your-backend-url>/api/keys -H "Content-Type: application/json" -d '{"name":"Test"}'`
   - Use the returned key with:  
     `curl -X POST https://<your-backend-url>/v1/chat/completions -H "Authorization: Bearer <key>" -H "Content-Type: application/json" -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}]}'`

---

## 7. Deploy Frontend (dashboard)

Deploy the Next.js dashboard from the same repo as a **separate service** so it uses your deployed backend API.

### Add Frontend service

1. In the same Railway project, click **+ New** → **GitHub Repo** (or **Service** if you already have the repo).
2. Select the **same repository** as the backend.
3. Configure the service to use the frontend Dockerfile (otherwise Railway uses the root `railway.json` and builds the **backend** image for this service):

**Build (Docker) – required**

- There is no root `railway.json` in the repo, so the frontend service will use dashboard settings. In the **frontend** service → **Variables**, add:
  - **`RAILWAY_DOCKERFILE_PATH`** = **`frontend/Dockerfile`**
  Without this, Railway may auto-detect the backend Dockerfile and you may see **"No workspaces found: --workspace=@gpu-cloud/frontend"** or healthcheck on `/health` failing.
- **Root directory**: leave default (repo root). Build context must be repo root so the Dockerfile can `COPY` workspace files.
- **Settings** → **Build** / **Deploy**: leave **Custom Build Command** and **Start Command** empty so the Dockerfile controls build and run (`node server.js`).

**Variables (required)**

- **`NEXT_PUBLIC_API_URL`** = your backend’s public URL, e.g. `https://your-backend-name.up.railway.app`  
  **Important:** Next.js bakes `NEXT_PUBLIC_*` into the client at **build time**. Set this variable **before** the first build (or redeploy after setting it) so the dashboard calls the correct API.

**Paste in Variables (Raw Editor):**

```json
{
  "RAILWAY_DOCKERFILE_PATH": "frontend/Dockerfile",
  "NEXT_PUBLIC_API_URL": "https://YOUR_BACKEND_URL.up.railway.app"
}
```

Replace `YOUR_BACKEND_URL` with your actual backend service domain (from Backend → Settings → Networking → Public URL).

### Deploy and expose

1. Save variables and trigger a deploy (or push to the connected branch).
2. After the build finishes, open the **Frontend** service → **Settings** → **Networking** → **Generate domain** (or **Public URL**). You’ll get something like:
   - `https://your-frontend-name.up.railway.app`
3. Open that URL in a browser. The dashboard should load and use the backend URL you set in `NEXT_PUBLIC_API_URL` (API keys, metrics, etc.).

### Frontend variables summary

| Variable                  | Value / purpose                                      |
|---------------------------|------------------------------------------------------|
| `RAILWAY_DOCKERFILE_PATH` | `frontend/Dockerfile` (so this service builds the frontend) |
| `NEXT_PUBLIC_API_URL`     | Backend public URL (e.g. `https://...up.railway.app`) |

`PORT` is set by Railway; the frontend Dockerfile already uses `PORT` and `HOSTNAME="0.0.0.0"`.

---

## 8. (Optional) Workers

The repo also has a **worker** process (`worker.ts`) that consumes the BullMQ queue. On Railway you can:

- Add a second service from the same repo, same Dockerfile (`backend/Dockerfile`), but with **Start command** overridden to:  
  `node dist/worker.js`  
  and the same `DATABASE_URL`, `REDIS_URL` (no `RUN_MIGRATIONS` needed for the worker), **or**
- Omit workers for a minimal demo; the API does in-process mock inference, so the app works without workers. Workers are for scaling out job processing.

---

## Troubleshooting

| Issue | Check |
|-------|--------|
| **"1/1 replicas never became healthy"** | Add Postgres and Redis; in backend Variables reference `DATABASE_URL` and `REDIS_URL`, set `RUN_MIGRATIONS` = `1`; redeploy; check Logs. |
| Build fails (e.g. “module not found”) | Ensure build uses repo root and builds `@gpu-cloud/shared` then backend (Docker or build command above). |
| 503 / DB or Redis down | In `/health`, see which service is down. Confirm `DATABASE_URL` and `REDIS_URL` are set and linked from Postgres/Redis. |
| “Relation does not exist” | Set `RUN_MIGRATIONS=1` and redeploy so migrations run on startup. |
| CORS errors from frontend | Backend uses `cors()` with default (allows all). If you restrict origins later, add your frontend URL. |
| Frontend builds backend instead | Set **`RAILWAY_DOCKERFILE_PATH`** = **`frontend/Dockerfile`** in the frontend service Variables so Railway uses the frontend Dockerfile. |
| Frontend shows “Ensure the API is running” | Set **`NEXT_PUBLIC_API_URL`** to your backend public URL and **redeploy** (Next.js bakes it in at build time). |
| **"No workspaces found: --workspace=@gpu-cloud/frontend"** on frontend | The frontend service is building with the **backend** Dockerfile (root `railway.json`). Set **`RAILWAY_DOCKERFILE_PATH`** = **`frontend/Dockerfile`** in the **frontend** service Variables and clear any custom **Start Command** in Settings → Build/Deploy, then redeploy. |

---

**Frontend on Railway:** See [§ 7. Deploy Frontend](#7-deploy-frontend-dashboard) above. Set **`RAILWAY_DOCKERFILE_PATH`** = **`frontend/Dockerfile`** and **`NEXT_PUBLIC_API_URL`** = your backend URL, then deploy and generate a domain.
