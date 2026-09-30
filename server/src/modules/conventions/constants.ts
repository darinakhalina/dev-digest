export const CONFIG_SAMPLE_PATHS = [
  '.eslintrc',
  '.eslintrc.json',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yml',
  'eslint.config.js',
  'eslint.config.mjs',
  '.prettierrc',
  '.prettierrc.json',
  '.prettierrc.js',
  '.prettierrc.yml',
  'prettier.config.js',
  'tsconfig.json',
] as const;

export const SOURCE_SAMPLE_COUNT = 12;
export const MAX_CANDIDATES = 12;
export const MAX_SNIPPET_CHARS = 2000;

export const MAX_FILE_LINES = 400;
export const MAX_FILE_BYTES = 512_000;
export const MAX_PROMPT_CHARS = 150_000;

export const MIN_EVIDENCE_LINES = 2;
export const MIN_EVIDENCE_CHARS = 24;
export const MIN_EVIDENCE_CHARS_MULTILINE = 12;

export const ATTEMPT_TIMEOUT_MS = 45_000;
export const SCAN_TIMEOUT_MS = 100_000;

export const DEFAULT_SKILL_NAME_SUFFIX = 'conventions';
export const FALLBACK_SKILL_NAME = 'repo-conventions';
