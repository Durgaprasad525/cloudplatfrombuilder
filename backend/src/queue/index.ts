import { Queue, QueueOptions } from 'bullmq';
import type { InferenceJobData } from '@gpu-cloud/shared';
import { createRedisConnection } from '../redis';

const connection = createRedisConnection();

const queueOptions: QueueOptions = {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
};

export const inferenceQueue = new Queue<InferenceJobData>('inference', queueOptions);

export async function addInferenceJob(data: InferenceJobData) {
  return inferenceQueue.add('inference', data, {
    jobId: data.requestId,
  });
}

export async function getQueueHealth(): Promise<boolean> {
  try {
    const client = await inferenceQueue.client;
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
