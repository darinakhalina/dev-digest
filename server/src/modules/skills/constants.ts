import type { SkillSource, SkillType } from '@devdigest/shared';

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export const MAX_EXPANDED_BYTES = 5 * 1024 * 1024;

export const MAX_ARCHIVE_ENTRIES = 1000;

export const ACCEPTED_IMPORT_EXTENSIONS = ['.md', '.markdown', '.zip'] as const;

export const SKILL_DOCUMENT_NAME = 'skill.md';

export const DEFAULT_SKILL_TYPE: SkillType = 'custom';

export const DEFAULT_SKILL_SOURCE: SkillSource = 'manual';

export const IMPORTED_SKILL_SOURCE: SkillSource = 'imported_url';
