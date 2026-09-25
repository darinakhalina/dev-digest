import { describe, it, expect } from 'vitest';
import { parseRepoUrl } from '../src/modules/repos/helpers.js';

describe('parseRepoUrl — SPEC-2026-09-25-security-hardening AC-1, AC-2', () => {
  it.each([
    ['https://github.com/octocat/hello-world', 'octocat', 'hello-world'],
    ['https://github.com/octocat/hello-world.git', 'octocat', 'hello-world'],
    ['https://github.com/octocat/hello-world/', 'octocat', 'hello-world'],
    ['git@github.com:octocat/hello-world.git', 'octocat', 'hello-world'],
    ['https://github.com/vercel/next.js', 'vercel', 'next.js'],
    ['https://github.com/a-b/c_d.e', 'a-b', 'c_d.e'],
  ])('accepts %s', (url, owner, name) => {
    expect(parseRepoUrl(url)).toEqual({ owner, name });
  });

  it.each([
    'https://github.com/../x',
    'https://github.com/./x',
    'https://github.com/a/..',
    'https://github.com/a/.',
    'https://github.com/%2e%2e/x',
    'git@github.com:../x.git',
    'https://evil.host/github.com/a/b',
    'https://github.com.evil.host/a/b',
    'https://github.com/a',
    'https://github.com/a/b/c',
    'https://user:pass@github.com/a/b',
    'http://github.com/a/b',
    'file:///etc/passwd',
    'not a url',
  ])('refuses %s', (url) => {
    expect(() => parseRepoUrl(url)).toThrow(expect.objectContaining({ code: 'invalid_repo_url' }));
  });
});
