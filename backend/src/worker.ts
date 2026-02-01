/**
 * BullMQ worker: consumes inference jobs from Redis queue.
 * Run 2-3 processes for simulated distributed workers:
 *   npx tsx src/worker.ts
 */
import { Worker } from 'bullmq';
import { mockInference } from './services/inferenceService';
import { recordInferenceUsage, countTokens } from './services/inferenceService';
import type { InferenceJobData } from '@gpu-cloud/shared';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const connection = {
  host: new URL(REDIS_URL).hostname,
  port: parseInt(new URL(REDIS_URL).port || '6379', 10),
};

const worker = new Worker<InferenceJobData>(
  'inference',
  async (job) => {
    const { model, messages, apiKeyId } = job.data;
    const start = Date.now();
    const content = await mockInference(messages);
    const latencyMs = Date.now() - start;
    const promptTokens = countTokens(messages.map((m) => m.content).join(' '));
    const completionTokens = countTokens(content);

    await recordInferenceUsage(
      apiKeyId,
      model,
      promptTokens,
      completionTokens,
      latencyMs
    );

    return {
      content,
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: promptTokens + completionTokens,
      },
    };
  },
  {
    connection,
    concurrency: 4,
  }
);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error('[Worker] Error:', err);
});

console.log('Inference worker started. Waiting for jobs...');

process.on('SIGTERM', async () => {
  await worker.close();
  process.exit(0);
});
