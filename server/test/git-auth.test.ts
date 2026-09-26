import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { simpleGit } from 'simple-git';
import { SimpleGitClient } from '../src/adapters/git/simple-git.js';

const TOKEN = 'ghp_secret_token_value_123';

async function filesUnder(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await filesUnder(p)));
    else out.push(p);
  }
  return out;
}

async function containsToken(dir: string): Promise<boolean> {
  for (const f of await filesUnder(dir)) {
    if ((await readFile(f)).includes(TOKEN)) return true;
  }
  return false;
}

describe('SimpleGitClient — SPEC-2026-09-25-security-hardening', () => {
  let root: string;
  let origin: string;
  let cloneDir: string;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'devdigest-git-auth-'));
    const src = join(root, 'src');
    await mkdir(src);
    const g = simpleGit(src);
    await g.init();
    await g.addConfig('user.email', 't@example.com');
    await g.addConfig('user.name', 't');
    await writeFile(join(src, 'README.md'), 'hi\n');
    await g.add('.');
    await g.commit('init');
    origin = join(root, 'origin.git');
    await simpleGit(root).clone(src, origin, ['--bare']);
    cloneDir = join(root, 'workspace');
    await mkdir(cloneDir);
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('AC-3: refuses a clone location outside the clone directory and deletes nothing', async () => {
    const sibling = join(root, 'x');
    await mkdir(sibling);
    await writeFile(join(sibling, 'keep.txt'), 'keep');
    const git = new SimpleGitClient(cloneDir);
    await expect(git.clone({ owner: '..', name: 'x' }, origin)).rejects.toThrow(/outside the clone directory/);
    expect((await stat(join(sibling, 'keep.txt'))).isFile()).toBe(true);
  });

  it('AC-4: a clone made with a token set holds the token in no file', async () => {
    const git = new SimpleGitClient(cloneDir, async () => TOKEN);
    const { path } = await git.clone({ owner: 'acme', name: 'private' }, origin, { depth: 1 });
    expect(await containsToken(path)).toBe(false);
  });

  it('AC-6: a remote op removes credentials an earlier version stored in the remote address', async () => {
    const git = new SimpleGitClient(cloneDir, async () => TOKEN);
    const { path } = await git.clone({ owner: 'acme', name: 'legacy' }, origin);
    await simpleGit(path).remote(['set-url', 'origin', `https://x-access-token:${TOKEN}@127.0.0.1:1/acme/legacy.git`]);
    expect(await containsToken(path)).toBe(true);

    await git.sync({ owner: 'acme', name: 'legacy' }, 'main').catch(() => undefined);

    expect(await containsToken(path)).toBe(false);
    const url = (await simpleGit(path).remote(['get-url', 'origin'])) as string;
    expect(url.trim()).toBe('https://127.0.0.1:1/acme/legacy.git');
  });
});
