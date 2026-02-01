import { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/apiKeyService';
import type { ApiKeyRecord } from '@gpu-cloud/shared';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKeyRecord;
    }
  }
}

const BEARER_PREFIX = 'Bearer ';
// Node/Express lowercases header names; use lowercase key
const AUTH_HEADER = 'authorization';

export async function authenticateApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers[AUTH_HEADER];
  if (!header || typeof header !== 'string') {
    res.status(401).json({
      error: {
        message: 'Missing Authorization header. Use: Authorization: Bearer <api_key>',
        type: 'invalid_request_error',
        code: 'missing_authorization',
      },
    });
    return;
  }

  if (!header.startsWith(BEARER_PREFIX)) {
    res.status(401).json({
      error: {
        message: 'Invalid Authorization format. Use: Bearer <api_key>',
        type: 'invalid_request_error',
        code: 'invalid_authorization',
      },
    });
    return;
  }

  const rawKey = header.slice(BEARER_PREFIX.length).trim();
  if (!rawKey) {
    res.status(401).json({
      error: {
        message: 'API key is empty',
        type: 'invalid_request_error',
        code: 'empty_api_key',
      },
    });
    return;
  }

  try {
    const apiKey = await validateApiKey(rawKey);
    if (!apiKey) {
      res.status(401).json({
        error: {
          message: 'Invalid API key',
          type: 'invalid_request_error',
          code: 'invalid_api_key',
        },
      });
      return;
    }
    req.apiKey = apiKey;
    next();
  } catch (err) {
    console.error('Auth error:', err);
    res.status(500).json({
      error: {
        message: 'Authentication failed',
        type: 'internal_error',
        code: 'auth_error',
      },
    });
  }
}
