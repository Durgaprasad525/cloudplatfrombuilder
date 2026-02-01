/**
 * Shared types for GPU Cloud Platform
 * Used by backend and frontend
 */

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyHash: string;
  prefix: string;
  createdAt: Date;
  lastUsedAt: Date | null;
  usageCount: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

export interface ChatCompletionChoice {
  index: number;
  message: ChatMessage;
  finish_reason: string;
}

export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: Partial<ChatMessage>;
    finish_reason: string | null;
  }>;
}

export interface UsageMetric {
  apiKeyId: string;
  timestamp: Date;
  requestCount: number;
  tokenCount: number;
  latencyMs: number;
}

export interface InferenceJobData {
  requestId: string;
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream: boolean;
  apiKeyId: string;
}
