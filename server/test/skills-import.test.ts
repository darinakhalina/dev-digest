import { describe, it, expect } from 'vitest';
import { strToU8, zipSync } from 'fflate';
import { parseSkillImport } from '../src/modules/skills/domain.js';
import {
  MAX_EXPANDED_BYTES,
  MAX_IMPORT_BYTES,
} from '../src/modules/skills/constants.js';
import { AppError } from '../src/platform/errors.js';

const md = (text: string) => strToU8(text);

function zip(entries: Record<string, string>): Uint8Array {
  const input: Record<string, Uint8Array> = {};
  for (const [name, text] of Object.entries(entries)) input[name] = strToU8(text);
  return zipSync(input);
}

function expectValidationError(run: () => unknown): AppError {
  let thrown: unknown;
  try {
    run();
  } catch (err) {
    thrown = err;
  }
  expect(thrown).toBeInstanceOf(AppError);
  const error = thrown as AppError;
  expect(error.code).toBe('validation_error');
  expect(error.statusCode).toBe(422);
  return error;
}

describe('parseSkillImport — markdown (AC-16)', () => {
  it('takes the whole file as the body and the name from the first # heading', () => {
    const preview = parseSkillImport(
      'severity-rubric.md',
      md('# Severity Rubric\n\nBlock on data loss.\n'),
    );
    expect(preview).toEqual({
      name: 'Severity Rubric',
      description: '',
      type: 'custom',
      source: 'imported_url',
      body: '# Severity Rubric\n\nBlock on data loss.\n',
      ignored_files: [],
    });
  });

  it('falls back to the filename stem when there is no # heading', () => {
    const preview = parseSkillImport('house-conventions.md', md('- prefer named exports\n'));
    expect(preview.name).toBe('house-conventions');
    expect(preview.body).toBe('- prefer named exports\n');
  });

  it('ignores a heading that is not at the start of a line', () => {
    const preview = parseSkillImport('rule.markdown', md('not a heading # Nope\n'));
    expect(preview.name).toBe('rule');
  });

  it('refuses a body that is empty or whitespace only', () => {
    expectValidationError(() => parseSkillImport('blank.md', md('   \n\t\n')));
  });
});

describe('parseSkillImport — archive (AC-17)', () => {
  it('reads SKILL.md and lists every other entry as ignored', () => {
    const preview = parseSkillImport(
      'skill.zip',
      zip({
        'SKILL.md': '# Test Quality\n\nCheck boundaries.\n',
        'install.sh': 'rm -rf /',
        'reference.md': '# Not this one',
      }),
    );
    expect(preview.name).toBe('Test Quality');
    expect(preview.body).toBe('# Test Quality\n\nCheck boundaries.\n');
    expect(preview.body).not.toContain('rm -rf');
    expect(preview.ignored_files.sort()).toEqual(['install.sh', 'reference.md']);
  });

  it('matches the skill document case-insensitively', () => {
    const preview = parseSkillImport(
      'skill.zip',
      zip({ 'skill.md': '# Lowercase\n', 'other.md': '# Other\n' }),
    );
    expect(preview.name).toBe('Lowercase');
    expect(preview.ignored_files).toEqual(['other.md']);
  });

  it('falls back to the first top-level markdown when no skill document exists', () => {
    const preview = parseSkillImport(
      'skill.zip',
      zip({ 'nested/SKILL.md': '# Nested\n', 'rubric.md': '# Rubric\n', 'notes.txt': 'hi' }),
    );
    expect(preview.name).toBe('Rubric');
    expect(preview.ignored_files.sort()).toEqual(['nested/SKILL.md', 'notes.txt']);
  });

  it('refuses an archive with no markdown document at all', () => {
    expectValidationError(() => parseSkillImport('skill.zip', zip({ 'run.sh': 'echo hi' })));
  });

  it('refuses bytes that are not a readable archive', () => {
    expectValidationError(() => parseSkillImport('skill.zip', md('this is not a zip')));
  });
});

describe('parseSkillImport — size caps (AC-19)', () => {
  it('refuses a file larger than the delivered cap', () => {
    const error = expectValidationError(() =>
      parseSkillImport('big.md', new Uint8Array(MAX_IMPORT_BYTES + 1)),
    );
    expect(error.details).toMatchObject({ max_bytes: MAX_IMPORT_BYTES });
  });

  it('refuses an archive that is small compressed but huge expanded', () => {
    const bomb = zip({ 'SKILL.md': '#\n' + 'a'.repeat(MAX_EXPANDED_BYTES + 1) });
    expect(bomb.byteLength).toBeLessThan(MAX_IMPORT_BYTES);

    const error = expectValidationError(() => parseSkillImport('bomb.zip', bomb));
    expect(error.details).toMatchObject({ max_bytes: MAX_EXPANDED_BYTES });
  });
});

describe('parseSkillImport — accepted kinds (AC-21)', () => {
  it.each(['payload.exe', 'script.sh', 'notes.txt', 'archive.tar.gz'])(
    'refuses %s and names the accepted kinds',
    (filename) => {
      const error = expectValidationError(() => parseSkillImport(filename, md('anything')));
      expect(error.message).toContain('.md');
      expect(error.message).toContain('.zip');
      expect(error.details).toMatchObject({ accepted: ['.md', '.markdown', '.zip'] });
    },
  );
});
