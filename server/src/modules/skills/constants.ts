import type { SkillSource, SkillType } from '@devdigest/shared';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const MAX_EXPANDED_BYTES = 5 * 1024 * 1024;

export const MAX_ARCHIVE_ENTRIES = 1000;

export const ACCEPTED_IMPORT_EXTENSIONS = ['.md', '.markdown', '.zip'] as const;

export const SKILL_DOCUMENT_NAME = 'skill.md';

export const DEFAULT_SKILL_TYPE: SkillType = 'custom';

export const DEFAULT_SKILL_SOURCE: SkillSource = 'manual';

export const IMPORTED_SKILL_SOURCE: SkillSource = 'imported_url';

export const IMPORT_URL_ALLOWED_HOSTS = [
  'raw.githubusercontent.com',
  'gist.githubusercontent.com',
  'github.com',
  'gist.github.com',
] as const;

export const IMPORT_URL_MAX_REDIRECTS = 3;

export const IMPORT_URL_MAX_BYTES = 1 * 1024 * 1024;

export const IMPORT_URL_TIMEOUT_MS = 10_000;

export const SCAN_MAX_PROMPT_CHARS = 8000;
export const MAX_SKILL_BODY_CHARS = 64_000;

export const SCAN_ATTEMPT_TIMEOUT_MS = 8_000;

export const SCAN_DEADLINE_MS = 12_000;
