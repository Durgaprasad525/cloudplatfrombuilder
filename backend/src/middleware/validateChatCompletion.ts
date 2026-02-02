import { Request, Response, NextFunction } from 'express';
import type { ChatCompletionRequest } from '@gpu-cloud/shared';

/** Model names accepted by the chat completions API (same mock inference for all). */
export const SUPPORTED_MODELS = [
  'gpt-3.5-turbo',
  'gpt-4',
  'gpt-4-turbo',
  'gpt-4o',
  'gpt-4o-mini',
  'llama-2-7b',
  'llama-2-13b',
  'llama-2-70b',
  'mistral-7b',
  'mixtral-8x7b',
  'falcon-40b',
] as const;

export function validateChatCompletionRequest(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body !== 'object') {
    res.status(400).json({
      error: {
        message: 'Request body must be a JSON object',
        type: 'invalid_request_error',
        code: 'invalid_body',
      },
    });
    return;
  }

  const { model, messages, stream, temperature, max_tokens } = body;

  if (!model || typeof model !== 'string') {
    res.status(400).json({
      error: {
        message: 'Missing or invalid "model" field',
        type: 'invalid_request_error',
        code: 'missing_model',
      },
    });
    return;
  }

  if (!SUPPORTED_MODELS.includes(model as (typeof SUPPORTED_MODELS)[number])) {
    res.status(400).json({
      error: {
        message: `Model "${model}" is not supported. Use one of: ${SUPPORTED_MODELS.join(', ')}.`,
        type: 'invalid_request_error',
        code: 'model_not_found',
      },
    });
    return;
  }

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: {
        message: 'Missing or invalid "messages" array',
        type: 'invalid_request_error',
        code: 'missing_messages',
      },
    });
    return;
  }

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (!m || typeof m !== 'object' || typeof m.role !== 'string' || typeof m.content !== 'string') {
      res.status(400).json({
        error: {
          message: `Invalid message at index ${i}: must have "role" and "content" strings`,
          type: 'invalid_request_error',
          code: 'invalid_message',
        },
      });
      return;
    }
    const role = m.role as string;
    if (!['system', 'user', 'assistant'].includes(role)) {
      res.status(400).json({
        error: {
          message: `Invalid role "${role}" at index ${i}`,
          type: 'invalid_request_error',
          code: 'invalid_role',
        },
      });
      return;
    }
  }

  (req as Request & { body: ChatCompletionRequest }).body = {
    model,
    messages: messages as ChatCompletionRequest['messages'],
    stream: Boolean(stream),
    temperature: typeof temperature === 'number' ? temperature : undefined,
    max_tokens: typeof max_tokens === 'number' ? max_tokens : undefined,
  };
  next();
}
