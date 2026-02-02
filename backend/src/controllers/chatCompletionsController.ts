import { Request, Response } from 'express';
import {
  mockInference,
  buildCompletionResponse,
  countTokens,
  recordInferenceUsage,
} from '../services/inferenceService';
import type { ChatCompletionRequest, ChatCompletionChunk } from '@gpu-cloud/shared';

/**
 * Non-streaming: wait for job result from queue (with timeout).
 * In a full implementation the worker would process the job; here we optionally
 * process in-place for simplicity when queue is same process, or we block on job.
 */
export async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  const start = Date.now();
  const body = req.body as ChatCompletionRequest;
  const apiKey = req.apiKey!;

  if (body.stream) {
    await handleStreaming(req, res);
    return;
  }

  try {
    const content = await mockInference(body.messages);
    const promptTokens = countTokens(body.messages.map((m) => m.content).join(' '));
    const completionTokens = countTokens(content);
    const latencyMs = Date.now() - start;

    await recordInferenceUsage(
      apiKey.id,
      body.model,
      promptTokens,
      completionTokens,
      latencyMs
    );

    const requestId = `req_${Date.now()}`;
    const response = buildCompletionResponse(
      requestId,
      body.model,
      content,
      promptTokens,
      completionTokens
    );
    res.json(response);
  } catch (err) {
    console.error('Chat completion error:', err);
    res.status(500).json({
      error: {
        message: 'Inference failed',
        type: 'internal_error',
        code: 'inference_error',
      },
    });
  }
}

/**
 * Streaming: SSE response with chunked deltas.
 */
async function handleStreaming(req: Request, res: Response): Promise<void> {
  const body = req.body as ChatCompletionRequest;
  const apiKey = req.apiKey!;
  const start = Date.now();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const content = await mockInference(body.messages);
    const promptTokens = countTokens(body.messages.map((m) => m.content).join(' '));
    const completionTokens = countTokens(content);
    const latencyMs = Date.now() - start;

    await recordInferenceUsage(
      apiKey.id,
      body.model,
      promptTokens,
      completionTokens,
      latencyMs
    );

    const requestId = `chatcmpl-${Date.now()}`;
    const created = Math.floor(Date.now() / 1000);

    const words = content.split(/\s+/);
    for (let i = 0; i < words.length; i++) {
      const delta = (i === 0 ? '' : ' ') + words[i];
      const chunk: ChatCompletionChunk = {
        id: requestId,
        object: 'chat.completion.chunk',
        created,
        model: body.model,
        choices: [
          {
            index: 0,
            delta: { content: delta },
            finish_reason: null,
          },
        ],
      };
      res.write(`data: ${JSON.stringify(chunk)}\n\n`);
    }

    const doneChunk: ChatCompletionChunk = {
      id: requestId,
      object: 'chat.completion.chunk',
      created,
      model: body.model,
      choices: [
        {
          index: 0,
          delta: {},
          finish_reason: 'stop',
        },
      ],
    };
    res.write(`data: ${JSON.stringify(doneChunk)}\n\n`);
    res.write('data: [DONE]\n\n');
  } catch (err) {
    console.error('Streaming error:', err);
    res.write(
      `data: ${JSON.stringify({
        error: {
          message: 'Inference failed',
          type: 'internal_error',
          code: 'inference_error',
        },
      })}\n\n`
    );
  } finally {
    res.end();
  }
}
