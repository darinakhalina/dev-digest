import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../src/adapters/llm/openai.js';
import { AnthropicProvider } from '../src/adapters/llm/anthropic.js';

describe('LLM SDK clients own no retries of their own — SPEC-2026-09-25-onion-debt-cleared', () => {
  it('OpenAI client is built with maxRetries: 0, leaving withRetry as the only retrier', () => {
    const provider = new OpenAIProvider('test-key');
    const client = (provider as unknown as { client: { maxRetries: number } }).client;
    expect(client.maxRetries).toBe(0);
  });

  it('Anthropic client is built with maxRetries: 0', () => {
    const provider = new AnthropicProvider('test-key');
    const client = (provider as unknown as { client: { maxRetries: number } }).client;
    expect(client.maxRetries).toBe(0);
  });
});
