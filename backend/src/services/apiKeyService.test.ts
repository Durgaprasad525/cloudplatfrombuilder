import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as bcrypt from 'bcrypt';
import * as apiKeyService from './apiKeyService';

vi.mock('../db/client', () => ({
  query: vi.fn(),
}));

const { query } = await import('../db/client');

describe('apiKeyService', () => {
  beforeEach(() => {
    vi.mocked(query).mockReset();
  });

  describe('createApiKey', () => {
    it('inserts key with hashed value and returns raw key once', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 1 } as never);
      const result = await apiKeyService.createApiKey('Test Key');
      expect(result.name).toBe('Test Key');
      expect(result.key).toHaveLength(64);
      expect(result.prefix).toHaveLength(8);
      expect(result.key.startsWith(result.prefix)).toBe(true);
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO api_keys'),
        expect.arrayContaining([result.id, 'Test Key', expect.any(String), result.prefix])
      );
    });
  });

  describe('validateApiKey', () => {
    it('returns null when no row matches prefix', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as never);
      const result = await apiKeyService.validateApiKey('a'.repeat(64));
      expect(result).toBeNull();
    });

    it('returns null when bcrypt compare fails', async () => {
      vi.mocked(query).mockResolvedValue({
        rows: [
          {
            id: 'id1',
            name: 'K',
            key_hash: await bcrypt.hash('other', 10),
            key_prefix: 'aaaaaaaa',
            created_at: new Date(),
            last_used_at: null,
            usage_count: '0',
          },
        ],
        rowCount: 1,
      } as never);
      const result = await apiKeyService.validateApiKey('a'.repeat(64));
      expect(result).toBeNull();
    });

    it('returns record when key is valid', async () => {
      const rawKey = 'a'.repeat(64);
      const keyHash = await bcrypt.hash(rawKey, 10);
      vi.mocked(query).mockResolvedValue({
        rows: [
          {
            id: 'id1',
            name: 'My Key',
            key_hash: keyHash,
            key_prefix: rawKey.substring(0, 8),
            created_at: new Date(),
            last_used_at: null,
            usage_count: '5',
          },
        ],
        rowCount: 1,
      } as never);
      const result = await apiKeyService.validateApiKey(rawKey);
      expect(result).not.toBeNull();
      expect(result!.id).toBe('id1');
      expect(result!.name).toBe('My Key');
      expect(result!.usageCount).toBe(5);
    });
  });

  describe('deleteApiKey', () => {
    it('returns true when rowCount > 0', async () => {
      vi.mocked(query).mockResolvedValue({ rowCount: 1 } as never);
      const result = await apiKeyService.deleteApiKey('id1');
      expect(result).toBe(true);
    });

    it('returns false when no row deleted', async () => {
      vi.mocked(query).mockResolvedValue({ rowCount: 0 } as never);
      const result = await apiKeyService.deleteApiKey('id1');
      expect(result).toBe(false);
    });
  });
});
