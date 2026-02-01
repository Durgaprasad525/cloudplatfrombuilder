-- GPU Cloud Platform - Database Schema
-- Run via: psql $DATABASE_URL -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  key_hash VARCHAR(255) NOT NULL UNIQUE,
  key_prefix VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  usage_count BIGINT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX IF NOT EXISTS idx_api_keys_created_at ON api_keys(created_at);

CREATE TABLE IF NOT EXISTS usage_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  request_count INTEGER DEFAULT 1,
  token_count INTEGER DEFAULT 0,
  latency_ms INTEGER DEFAULT 0,
  model VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_usage_metrics_api_key_id ON usage_metrics(api_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_timestamp ON usage_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_usage_metrics_api_key_timestamp ON usage_metrics(api_key_id, timestamp);

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  model_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'provisioning', 'running', 'failed', 'stopped'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_deployments_created_at ON deployments(created_at);
