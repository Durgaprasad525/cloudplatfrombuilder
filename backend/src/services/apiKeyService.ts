import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/client';
import type { ApiKeyRecord } from '@gpu-cloud/shared';

const SALT_ROUNDS = 10;
const KEY_PREFIX_LENGTH = 8;

export interface CreateApiKeyResult {
  id: string;
  name: string;
  key: string;
  prefix: string;
  createdAt: Date;
}

export async function createApiKey(name: string): Promise<CreateApiKeyResult> {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const keyHash = await bcrypt.hash(rawKey, SALT_ROUNDS);
  const prefix = rawKey.substring(0, KEY_PREFIX_LENGTH);
  const id = uuidv4();

  await query(
    `INSERT INTO api_keys (id, name, key_hash, key_prefix) VALUES ($1, $2, $3, $4)`,
    [id, name, keyHash, prefix]
  );

  return {
    id,
    name,
    key: rawKey,
    prefix,
    createdAt: new Date(),
  };
}

export async function validateApiKey(rawKey: string): Promise<ApiKeyRecord | null> {
  const prefix = rawKey.substring(0, KEY_PREFIX_LENGTH);
  const result = await query<ApiKeyRow>(
    `SELECT id, name, key_hash, key_prefix, created_at, last_used_at, usage_count
     FROM api_keys WHERE key_prefix = $1`,
    [prefix]
  );
  const row = result.rows[0];
  if (!row) return null;

  const valid = await bcrypt.compare(rawKey, row.key_hash);
  if (!valid) return null;

  return rowToRecord(row);
}

interface ApiKeyRow {
  id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  created_at: Date;
  last_used_at: Date | null;
  usage_count: string;
}

function rowToRecord(row: ApiKeyRow): ApiKeyRecord {
  return {
    id: row.id,
    name: row.name,
    keyHash: row.key_hash,
    prefix: row.key_prefix,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    usageCount: parseInt(row.usage_count ?? '0', 10),
  };
}

export async function recordApiKeyUsage(apiKeyId: string): Promise<void> {
  await query(
    `UPDATE api_keys SET last_used_at = NOW(), usage_count = usage_count + 1 WHERE id = $1`,
    [apiKeyId]
  );
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const result = await query<ApiKeyRow>(
    `SELECT id, name, key_hash, key_prefix, created_at, last_used_at, usage_count
     FROM api_keys ORDER BY created_at DESC`
  );
  return result.rows.map(rowToRecord);
}

export async function deleteApiKey(id: string): Promise<boolean> {
  const result = await query(
    `DELETE FROM api_keys WHERE id = $1`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getApiKeyById(id: string): Promise<ApiKeyRecord | null> {
  const result = await query<ApiKeyRow>(
    `SELECT id, name, key_hash, key_prefix, created_at, last_used_at, usage_count
     FROM api_keys WHERE id = $1`,
    [id]
  );
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}
