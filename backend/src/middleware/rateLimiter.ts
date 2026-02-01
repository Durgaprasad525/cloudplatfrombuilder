import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const WINDOW_SECONDS = 60;
const DEFAULT_LIMIT = 100; // requests per minute per API key

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, { maxRetriesPerRequest: 3 });
  }
  return redis;
}

export function rateLimiter(options: { windowSeconds?: number; limit?: number } = {}) {
  const windowSeconds = options.windowSeconds ?? WINDOW_SECONDS;
  const limit = options.limit ?? DEFAULT_LIMIT;

  return async function rateLimit(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const apiKey = req.apiKey;
    if (!apiKey) {
      next();
      return;
    }

    const key = `rate:${apiKey.id}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;
    const client = getRedis();

    try {
      const count = await client.incr(key);
      if (count === 1) {
        await client.expire(key, windowSeconds * 2);
      }
      const remaining = Math.max(0, limit - count);
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(remaining));

      if (count > limit) {
        res.status(429).json({
          error: {
            message: `Rate limit exceeded. Maximum ${limit} requests per ${windowSeconds} seconds.`,
            type: 'rate_limit_error',
            code: 'rate_limit_exceeded',
          },
        });
        return;
      }
      next();
    } catch (err) {
      console.error('Rate limit Redis error:', err);
      next();
    }
  };
}

export async function closeRateLimitRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
