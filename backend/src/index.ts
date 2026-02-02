import express from 'express';
import cors from 'cors';
import router from './routes';
import { healthCheck } from './db/client';
import { runMigrations } from './db/migrate';
import { getQueueHealth } from './queue';

const PORT = parseInt(process.env.PORT || '4000', 10);
const app = express();

app.use(cors());
app.use(express.json());

app.use(router);

app.get('/health', async (_req, res) => {
  const [dbOk, queueOk] = await Promise.all([
    healthCheck(),
    getQueueHealth(),
  ]);
  const status = dbOk && queueOk ? 'ok' : 'degraded';
  res.status(status === 'ok' ? 200 : 503).json({
    status,
    services: {
      database: dbOk ? 'up' : 'down',
      redis: queueOk ? 'up' : 'down',
    },
  });
});

app.get('/ready', async (_req, res) => {
  const dbOk = await healthCheck();
  res.status(dbOk ? 200 : 503).json({ ready: dbOk });
});

app.use((_req, res) => {
  res.status(404).json({
    error: { message: 'Not found', type: 'invalid_request_error', code: 'not_found' },
  });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: { message: 'Internal server error', type: 'internal_error', code: 'server_error' },
  });
});

async function start() {
  // Listen first so the process stays up and /health is reachable (returns 503 if DB/Redis down).
  // This prevents Railway/containers from exiting before the healthcheck can run or show logs.
  const server = app.listen(PORT, async () => {
    console.log(`GPU Cloud API listening on http://localhost:${PORT}`);
    console.log('  Health: GET /health');
    console.log('  OpenAI: POST /v1/chat/completions');
    console.log('  Keys:   GET/POST/DELETE /api/keys');
    console.log('  Metrics: GET /api/metrics');

    const dbOk = await healthCheck();
    if (!dbOk) {
      console.error('Cannot connect to PostgreSQL. Check DATABASE_URL.');
      return;
    }
    if (process.env.RUN_MIGRATIONS === '1') {
      try {
        await runMigrations();
      } catch (err) {
        console.error('Startup migration failed:', err);
        return;
      }
    }
    const queueOk = await getQueueHealth();
    if (!queueOk) {
      console.error('Cannot connect to Redis. Check REDIS_URL (use public URL if internal host fails).');
    }
  });

  server.on('error', (err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

start();
