import { describe, it, expect, vi } from 'vitest';
import { mockInference, countTokens, buildCompletionResponse } from './inferenceService';

describe('inferenceService', () => {
  describe('mockInference', () => {
    it('returns simulated response string', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello world' }];
      const result = await mockInference(messages);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
      expect(result).toContain('simulated');
    });
  });

  describe('countTokens', () => {
    it('returns positive number for non-empty text', () => {
      expect(countTokens('one two three')).toBeGreaterThan(0);
    });
    it('returns 0 for empty string', () => {
      expect(countTokens('')).toBe(0);
      expect(countTokens('   ')).toBe(0);
    });
  });

  describe('buildCompletionResponse', () => {
    it('builds valid OpenAI-format response', () => {
      const res = buildCompletionResponse('req-1', 'gpt-3.5-turbo', 'Hi', 5, 10);
      expect(res.id).toContain('req-1');
      expect(res.object).toBe('chat.completion');
      expect(res.model).toBe('gpt-3.5-turbo');
      expect(res.choices).toHaveLength(1);
      expect(res.choices[0].message.content).toBe('Hi');
      expect(res.choices[0].message.role).toBe('assistant');
      expect(res.usage).toEqual({
        prompt_tokens: 5,
        completion_tokens: 10,
        total_tokens: 15,
      });
    });
  });
});
