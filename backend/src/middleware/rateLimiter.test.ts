import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue('OK'),
    quit: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls next when under limit', async () => {
    const { rateLimiter } = await import('./rateLimiter');
    const middleware = rateLimiter({ limit: 10 });
    const req = {
      apiKey: { id: 'key1', name: 'K', keyHash: '', prefix: '', createdAt: new Date(), lastUsedAt: null, usageCount: 0 },
      headers: {},
    } as Request;
    const res = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as unknown as Response;
    const next = vi.fn();
    await middleware(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(429);
  });
});
