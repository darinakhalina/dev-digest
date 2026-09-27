import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CloneSampleProvider } from '../src/modules/conventions/samples.js';
import { MAX_FILE_BYTES } from '../src/modules/conventions/constants.js';

const SECRET = 'SUPER-SECRET-TOKEN=sk_live_do_not_leak';

let root: string;
let clone: string;

const provider = () =>
  new CloneSampleProvider({
    repoIntel: { getConventionSamples: async () => [] },
    git: { currentHead: async () => 'deadbeef' },
  });

const repo = () => ({
  id: 'r1',
  owner: 'acme',
  name: 'demo',
  fullName: 'acme/demo',
  clonePath: clone,
});

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'conv-samples-'));
  clone = join(root, 'clone');
  await mkdir(clone, { recursive: true });
  await writeFile(join(root, 'secrets.json'), SECRET, 'utf8');
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('CloneSampleProvider', () => {
  it('refuses a config file that is a symlink pointing outside the clone', async () => {
    await symlink(join(root, 'secrets.json'), join(clone, 'tsconfig.json'));

    const sample = await provider().sample(repo());

    expect(sample.configFiles).toHaveLength(0);
    const everything = JSON.stringify(sample);
    expect(everything).not.toContain('sk_live_do_not_leak');
  });

  it('refuses a config file that is a symlink to a file inside the clone', async () => {
    await writeFile(join(clone, 'real.json'), '{"inside":true}', 'utf8');
    await symlink(join(clone, 'real.json'), join(clone, '.prettierrc'));

    const sample = await provider().sample(repo());

    expect(sample.configFiles.map((f) => f.path)).not.toContain('.prettierrc');
  });

  it('refuses a config file bigger than the byte cap', async () => {
    await writeFile(join(clone, '.eslintrc'), 'x'.repeat(MAX_FILE_BYTES + 1), 'utf8');

    const sample = await provider().sample(repo());

    expect(sample.configFiles.map((f) => f.path)).not.toContain('.eslintrc');
  });

  it('reads an ordinary config file', async () => {
    await writeFile(join(clone, '.eslintrc.json'), '{"root":true}', 'utf8');

    const sample = await provider().sample(repo());
    const found = sample.configFiles.find((f) => f.path === '.eslintrc.json');

    expect(found?.content).toBe('{"root":true}');
  });

  it('reports the repo as unindexed when the index has no ranked files', async () => {
    const sample = await provider().sample(repo());
    expect(sample.indexed).toBe(false);
    expect(sample.sourceFiles).toHaveLength(0);
  });

  it('refuses to scan a repo with no working copy', async () => {
    await expect(provider().sample({ ...repo(), clonePath: null })).rejects.toThrow(
      'CLONE_MISSING',
    );
  });
});
