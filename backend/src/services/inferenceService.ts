import { v4 as uuidv4 } from 'uuid';
import { addInferenceJob } from '../queue';
import { recordApiKeyUsage } from './apiKeyService';
import { recordUsage } from './usageTracker';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
  InferenceJobData,
} from '@gpu-cloud/shared';

const SUPPORTED_MODEL = 'gpt-3.5-turbo';

/**
 * Submit inference request to the queue. For non-streaming, waits for job result.
 * For streaming, returns a job ID and the worker will stream via a different path
 * (in this simplified version we handle streaming in-process for the HTTP response).
 */
export async function submitInference(
  request: ChatCompletionRequest,
  apiKeyId: string
): Promise<{ jobId: string; stream: boolean }> {
  const requestId = uuidv4();
  await recordApiKeyUsage(apiKeyId);

  const jobData: InferenceJobData = {
    requestId,
    model: request.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.max_tokens,
    stream: Boolean(request.stream),
    apiKeyId,
  };

  await addInferenceJob(jobData);
  return { jobId: requestId, stream: Boolean(request.stream) };
}

/**
 * Mock inference for in-process simulation (used by worker and by sync path).
 * Simulates GPU inference with a short delay and deterministic response.
 */
export async function mockInference(messages: ChatMessage[]): Promise<string> {
  await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));
  const lastUser = messages.filter((m) => m.role === 'user').pop();
  const prompt = lastUser?.content ?? 'Hello';
  const words = prompt.split(/\s+/).length;
  const mockResponse = `This is a simulated response to your message (${words} words). The GPU worker processed your request.`;
  return mockResponse;
}

/**
 * Build OpenAI-format completion response.
 */
export function buildCompletionResponse(
  requestId: string,
  model: string,
  content: string,
  promptTokens: number,
  completionTokens: number
): ChatCompletionResponse {
  return {
    id: `chatcmpl-${requestId}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: promptTokens + completionTokens,
    },
  };
}

export function countTokens(text: string): number {
  if (!text || !text.trim()) return 0;
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

export async function recordInferenceUsage(
  apiKeyId: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  latencyMs: number
): Promise<void> {
  await recordUsage({
    apiKeyId,
    requestCount: 1,
    tokenCount: promptTokens + completionTokens,
    latencyMs,
    model,
  });
}

export { SUPPORTED_MODEL };
