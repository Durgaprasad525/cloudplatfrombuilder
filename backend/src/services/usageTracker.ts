import { query } from '../db/client';

export interface RecordUsageInput {
  apiKeyId: string;
  requestCount?: number;
  tokenCount?: number;
  latencyMs?: number;
  model?: string;
}

export async function recordUsage(input: RecordUsageInput): Promise<void> {
  const { apiKeyId, requestCount = 1, tokenCount = 0, latencyMs = 0, model } = input;
  await query(
    `INSERT INTO usage_metrics (api_key_id, request_count, token_count, latency_ms, model)
     VALUES ($1, $2, $3, $4, $5)`,
    [apiKeyId, requestCount, tokenCount, latencyMs, model ?? null]
  );
}

export interface UsageSummary {
  apiKeyId: string;
  totalRequests: number;
  totalTokens: number;
  avgLatencyMs: number;
}

export async function getUsageByApiKey(
  apiKeyId: string,
  from?: Date,
  to?: Date
): Promise<UsageSummary> {
  let sql = `
    SELECT
      api_key_id as "apiKeyId",
      COALESCE(SUM(request_count), 0)::int as "totalRequests",
      COALESCE(SUM(token_count), 0)::int as "totalTokens",
      COALESCE(AVG(latency_ms), 0)::int as "avgLatencyMs"
    FROM usage_metrics
    WHERE api_key_id = $1
  `;
  const params: unknown[] = [apiKeyId];
  let i = 2;
  if (from) {
    sql += ` AND timestamp >= $${i}`;
    params.push(from);
    i++;
  }
  if (to) {
    sql += ` AND timestamp <= $${i}`;
    params.push(to);
  }
  sql += ` GROUP BY api_key_id`;

  const result = await query<UsageSummary>(sql, params);
  const row = result.rows[0];
  return (
    row ?? {
      apiKeyId,
      totalRequests: 0,
      totalTokens: 0,
      avgLatencyMs: 0,
    }
  );
}

export interface TimeSeriesPoint {
  timestamp: string;
  requestCount: number;
  tokenCount: number;
}

export async function getUsageTimeSeries(
  apiKeyId: string,
  bucketMinutes: number = 60,
  hoursBack: number = 24
): Promise<TimeSeriesPoint[]> {
  const result = await query<TimeSeriesPoint>(
    `
    SELECT
      date_trunc('hour', timestamp)::text as timestamp,
      COALESCE(SUM(request_count), 0)::int as "requestCount",
      COALESCE(SUM(token_count), 0)::int as "tokenCount"
    FROM usage_metrics
    WHERE api_key_id = $1 AND timestamp >= NOW() - ($2 || ' hours')::interval
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY timestamp ASC
  `,
    [apiKeyId, hoursBack]
  );
  return result.rows;
}

export async function getGlobalUsageTimeSeries(
  hoursBack: number = 24
): Promise<TimeSeriesPoint[]> {
  const result = await query<TimeSeriesPoint>(
    `
    SELECT
      date_trunc('hour', timestamp)::text as timestamp,
      COALESCE(SUM(request_count), 0)::int as "requestCount",
      COALESCE(SUM(token_count), 0)::int as "tokenCount"
    FROM usage_metrics
    WHERE timestamp >= NOW() - ($1 || ' hours')::interval
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY timestamp ASC
  `,
    [hoursBack]
  );
  return result.rows;
}
