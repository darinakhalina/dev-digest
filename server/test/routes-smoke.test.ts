import { describe, it, expect, afterAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/platform/config.js';
import { MockGitHubClient, MockLLMProvider } from '../src/adapters/mocks.js';

/**
 * No-DB route smoke tests via app.inject(). `/health` and the validation/error
 * envelope don't touch the database (postgres-js connects lazily), so these run
 * without Docker. DB-backed routes are covered in integration.test.ts.
 */
const config = loadConfig({ ...process.env, NODE_ENV: 'test' } as NodeJS.ProcessEnv);

describe('routes (no DB)', () => {
  it('GET /health → ok', async () => {
    const app = await buildApp({ config });
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: 'ok' });
    await app.close();
  });

  it('POST /settings/test-connection (github) returns structured ConnTestResult', async () => {
    const app = await buildApp({
      config,
      overrides: { github: new MockGitHubClient({ login: 'octocat' }) },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      payload: { provider: 'github' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.provider).toBe('github');
    expect(body.ok).toBe(true);
    expect(body.message).toContain('octocat');
    await app.close();
  });

  it('POST /settings/test-connection (openai) uses injected LLM listModels', async () => {
    const app = await buildApp({
      config,
      overrides: {
        llm: { openai: new MockLLMProvider('openai', { models: [{ id: 'gpt-4.1', provider: 'openai' }] }) },
      },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      payload: { provider: 'openai' },
    });
    expect(res.json().ok).toBe(true);
    await app.close();
  });

  it('returns 422 structured error on invalid body', async () => {
    const app = await buildApp({ config });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      payload: { provider: 'not-a-provider' },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().error.code).toBe('validation_error');
    await app.close();
  });

  it('AC-10: an unanticipated error answers a fixed message, never its own text', async () => {
    const app = await buildApp({ config });
    app.get('/__boom', async () => {
      throw new Error('duplicate key value violates unique constraint "repos_workspace_full_name_uq"');
    });
    const res = await app.inject({ method: 'GET', url: '/__boom' });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'internal_error', message: 'Internal error' } });
    expect(res.body).not.toContain('constraint');
    await app.close();
  });

  it('AC-11: a request the framework rejects keeps its status and its own code', async () => {
    const app = await buildApp({ config });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      headers: { 'content-type': 'application/json' },
      payload: '{"provider":',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).not.toBe('internal_error');
    expect(res.json().error.code).toMatch(/^FST_/);
    await app.close();
  });
});

describe('test-connection saves a key only after it works — SPEC-2026-09-25-run-reliability', () => {
  function memorySecrets() {
    const saved = new Map<string, string>([['OPENAI_API_KEY', 'working-key']]);
    return {
      saved,
      get: async (k: string) => saved.get(k),
      set: async (k: string, v: string) => {
        saved.set(k, v);
      },
    };
  }

  it('keeps the working key when the new one fails', async () => {
    const secrets = memorySecrets();
    const failing = new MockLLMProvider('openai');
    failing.listModels = async () => {
      throw new Error('401 invalid key');
    };
    const app = await buildApp({ config, overrides: { secrets: secrets as never, llm: { openai: failing } } });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      payload: { provider: 'openai', key: 'typo-key' },
    });
    expect(res.json().ok).toBe(false);
    expect(secrets.saved.get('OPENAI_API_KEY')).toBe('working-key');
    await app.close();
  });

  it('saves the new key when it works', async () => {
    const secrets = memorySecrets();
    const app = await buildApp({
      config,
      overrides: { secrets: secrets as never, llm: { openai: new MockLLMProvider('openai') } },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/settings/test-connection',
      payload: { provider: 'openai', key: 'new-key' },
    });
    expect(res.json().ok).toBe(true);
    expect(secrets.saved.get('OPENAI_API_KEY')).toBe('new-key');
    await app.close();
  });
});

describe('listening host — SPEC-2026-09-25-security-hardening AC-7', () => {
  it('defaults to loopback', () => {
    expect(loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv).apiHost).toBe('localhost');
  });

  it('uses API_HOST when it is set', () => {
    expect(loadConfig({ NODE_ENV: 'test', API_HOST: '0.0.0.0' } as NodeJS.ProcessEnv).apiHost).toBe('0.0.0.0');
  });
});
