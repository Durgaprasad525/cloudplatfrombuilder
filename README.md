# GPU Cloud Platform

A mini AI PaaS platform with OpenAI-compatible API, API key management, distributed inference queue, and usage dashboard.

---

### Live demo

**[→ Open live demo (Railway)](https://gpu-cloudfrontend-production.up.railway.app/)**

Dashboard: API keys, deployed models, and usage metrics. Backend API and frontend are deployed on Railway.

---

## Prerequisites

- **Node.js 18+**
- **Docker** (for Redis and PostgreSQL)
- Ports **3000** (frontend), **4000** (API), **5432** (Postgres), **6379** (Redis) free

## Quick Start

**1. Start Redis and PostgreSQL (required before the API):**

```bash
npm run infra
# or: docker-compose up -d redis postgres
```

**2. Install dependencies and build:**

```bash
npm install
npm run build -w @gpu-cloud/shared
```

**3. Run database migrations (first time only):**

```bash
npm run db:migrate -w @gpu-cloud/backend
```

**4. Start the API server:**

```bash
npm run dev -w @gpu-cloud/backend
```

The API will not listen until Redis and Postgres are reachable. If you see "Cannot connect to PostgreSQL" or "Cannot connect to Redis", run step 1 and try again.

**5. Start the dashboard (in a second terminal):**

```bash
npm run dev -w @gpu-cloud/frontend
```

If port 3000 is already in use, run: `PORT=3001 npm run dev -w @gpu-cloud/frontend` and open http://localhost:3001.

- **API:** http://localhost:4000  
- **Dashboard:** http://localhost:3000 (or 3001 if you set PORT)  

## Full stack with Docker

```bash
docker-compose up --build
```

- API: http://localhost:4000  
- Dashboard: http://localhost:3000  

## Deployment

Both **backend** and **frontend** are deployed on **Railway**. See [Deploy to Railway](docs/DEPLOY_RAILWAY.md) for full steps.

- **Backend:** Postgres + Redis add-ons, Dockerfile `backend/Dockerfile`, set `RAILWAY_DOCKERFILE_PATH=backend/Dockerfile`, `RUN_MIGRATIONS=1`, and link `DATABASE_URL` / `REDIS_URL`.
- **Frontend:** Same Railway project; add a second service with `RAILWAY_DOCKERFILE_PATH=frontend/Dockerfile` and `NEXT_PUBLIC_API_URL` = your backend public URL.

## API Keys

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/keys | Create key (body: `{ "name": "My Key" }`) |
| GET | /api/keys | List keys (prefix, usage, last used) |
| DELETE | /api/keys/:id | Revoke key |

Create a key, then use it:

```bash
curl -X POST http://localhost:4000/api/keys -H "Content-Type: application/json" -d '{"name":"Test"}'
# Copy the "key" value, then:
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
```

## Testing API keys and deployments

### 1. Test an API key (inference)

Use any API key you created in the dashboard. Replace `YOUR_API_KEY` with the full key (you only see it once at creation; use one you saved).

**Non-streaming (single JSON response):**

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Say hello in one sentence."}]
  }'
```

**Streaming (SSE chunks):**

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Count from 1 to 3."}],
    "stream": true
  }'
```

You should get a JSON response (or stream of `data: {...}` lines). After a successful call, the dashboard **Usage metrics** and the key’s **usage count** / **last used** will update.

### 2. Deployments

Deployments in the dashboard are **model deployment records** (name, model type, status). They are not yet a separate “endpoint” to call. Inference is done via **API keys** and `POST /v1/chat/completions`; the backend uses the simulated model `gpt-3.5-turbo` for all requests. So:

- **API keys** → use them as above to call the chat API; that’s how you “test” that a key works.
- **Deployments** → you’ve already tested creating/viewing them in the dashboard; they represent a deployment lifecycle (e.g. provisioning → running). Future work could link a deployment to a dedicated model or endpoint.

### 3. Quick checks from the dashboard

- **API keys:** Create a key, copy it, then run the `curl` command above; if you get a valid JSON response, the key works. The key’s **Last used** and **Requests** in the dashboard will update.
- **Metrics:** After a few inference requests, open **Usage metrics** on the dashboard to see request/token volume over time.

## Inference

| Method | Path | Description |
|--------|------|-------------|
| POST | /v1/chat/completions | OpenAI-compatible chat (streaming + non-streaming) |

- **Auth:** `Authorization: Bearer <api_key>`
- **Rate limit:** 100 requests/minute per key (configurable)
- **Model:** `gpt-3.5-turbo` (simulated)

### Streaming

```bash
curl -X POST http://localhost:4000/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hi"}],"stream":true}'
```

## Health & Metrics

- `GET /health` — API and dependencies status  
- `GET /api/metrics` — Usage metrics (optional `?apiKeyId=...&hours=24`)  

## Project structure

```
/backend   — Node.js API (Express, BullMQ, Redis, PostgreSQL)
/frontend  — React dashboard (Next.js, Tailwind, Recharts)
/shared    — Shared TypeScript types
/docs      — OpenAPI spec (openapi.yaml), architecture (ARCHITECTURE.md)
```

- **OpenAPI:** `docs/openapi.yaml` — OpenAI-compatible and dashboard endpoints.
- **Architecture:** `docs/ARCHITECTURE.md` — System overview, queue pattern, scaling, trade-offs. Export to PDF e.g. `pandoc docs/ARCHITECTURE.md -o docs/architecture.pdf`.

## Development

- Backend: `npm run dev -w @gpu-cloud/backend`
- Worker: `npm run worker -w @gpu-cloud/backend` (run 2–3 instances for distributed workers)
- Frontend: `npm run dev -w @gpu-cloud/frontend`
- Tests: `npm run test -w @gpu-cloud/backend`

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 4000 | API port |
| DATABASE_URL | postgresql://gpucloud:gpucloud_secret@localhost:5432/gpucloud | PostgreSQL |
| REDIS_URL | redis://localhost:6379 | Redis for queue and rate limiting |
