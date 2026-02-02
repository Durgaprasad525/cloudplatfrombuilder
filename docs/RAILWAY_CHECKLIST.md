# Railway setup checklist

Use this when the **frontend** keeps building the backend (e.g. "WORKDIR /app/backend" in build logs, or "Cannot find module '/app/backend/server.js'").

---

## Frontend service (@gpu-cloud/frontend)

1. Open the **frontend** service (not the backend).
2. **Variables** → Add or edit:
   - **Name:** `RAILWAY_DOCKERFILE_PATH`  
   - **Value:** `frontend/Dockerfile`  
   (Exact spelling. No quotes. No space.)
3. **Settings** → **Deploy**:
   - **Healthcheck path:** Leave **empty** or set to `/` (the frontend app has no `/health`).
   - **Start command:** Leave **empty** (Dockerfile runs `node server.js`).
4. **Settings** → **Build**:
   - **Custom build command:** Leave **empty**.
5. Force a new build:
   - Option A: **Deployments** → **Redeploy** (three dots on latest deployment).
   - Option B: In **Variables**, add `NO_CACHE=1`, save, redeploy, then remove `NO_CACHE=1` and redeploy again if you want cache back.

---

## Backend service

1. **Variables:**  
   `RAILWAY_DOCKERFILE_PATH` = `backend/Dockerfile`  
   Plus `DATABASE_URL`, `REDIS_URL`, `RUN_MIGRATIONS=1`.
2. **Deploy:**  
   **Healthcheck path:** `/health`.

---

## If the frontend still builds the backend

- Confirm you’re in the **frontend** service (tab/title shows @gpu-cloud/frontend).
- Confirm **Variables** shows `RAILWAY_DOCKERFILE_PATH` = `frontend/Dockerfile` (no typo).
- Redeploy **after** saving the variable (Deployments → Redeploy, or push a commit).
- Do **not** add a `railway.json` at the repo root; it overrides per-service settings.
