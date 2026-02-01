import { Request, Response } from 'express';
import * as apiKeyService from '../services/apiKeyService';

export async function createKey(req: Request, res: Response): Promise<void> {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    res.status(400).json({
      error: { message: 'Missing or invalid "name" field', code: 'invalid_name' },
    });
    return;
  }
  try {
    const result = await apiKeyService.createApiKey(name.trim());
    res.status(201).json({
      id: result.id,
      name: result.name,
      key: result.key,
      prefix: result.prefix,
      createdAt: result.createdAt.toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Create API key error:', err);
    res.status(500).json({
      error: {
        message:
          process.env.NODE_ENV === 'production'
            ? 'Failed to create API key'
            : `Failed to create API key: ${message}`,
        code: 'internal_error',
      },
    });
  }
}

export async function listKeys(req: Request, res: Response): Promise<void> {
  try {
    const keys = await apiKeyService.listApiKeys();
    res.json({
      keys: keys.map((k) => ({
        id: k.id,
        name: k.name,
        prefix: k.prefix,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        usageCount: k.usageCount,
      })),
    });
  } catch (err) {
    console.error('List API keys error:', err);
    res.status(500).json({
      error: { message: 'Failed to list API keys', code: 'internal_error' },
    });
  }
}

export async function deleteKey(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  try {
    const deleted = await apiKeyService.deleteApiKey(id);
    if (!deleted) {
      res.status(404).json({
        error: { message: 'API key not found', code: 'not_found' },
      });
      return;
    }
    res.status(204).send();
  } catch (err) {
    console.error('Delete API key error:', err);
    res.status(500).json({
      error: { message: 'Failed to delete API key', code: 'internal_error' },
    });
  }
}
