/**
 * Shared Redis URL and connection for BullMQ / IORedis.
 * Use the full URL so auth (username + password) is always included;
 * Railway and other hosted Redis require authentication.
 */

import IORedis from 'ioredis';

const REDIS_URL = (process.env.REDIS_URL || 'redis://localhost:6379').trim();

if (!process.env.REDIS_URL && process.env.NODE_ENV === 'production') {
  console.warn('REDIS_URL is not set; using default redis://localhost:6379 (will fail if Redis is remote).');
}

export function getRedisUrl(): string {
  return REDIS_URL;
}

/** Connection options parsed from URL (host, port, password, username). */
export function getRedisConnectionOptions(): { host: string; port: number; password?: string; username?: string } {
  const u = new URL(REDIS_URL);
  return {
    host: u.hostname,
    port: parseInt(u.port || '6379', 10),
    ...(u.password && { password: decodeURIComponent(u.password) }),
    ...(u.username && u.username !== '' && { username: decodeURIComponent(u.username) }),
  };
}

/**
 * Create an IORedis connection from the full URL (includes auth).
 * Pass this to BullMQ so all internal Redis commands use authentication.
 */
export function createRedisConnection(): IORedis {
  return new IORedis(REDIS_URL, { maxRetriesPerRequest: 3 });
}
