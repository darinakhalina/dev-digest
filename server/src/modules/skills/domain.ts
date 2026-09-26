import { strFromU8, unzipSync, type UnzipFileInfo } from 'fflate';
import type { SkillImportPreview } from '@devdigest/shared';
import { ValidationError } from '../../platform/errors.js';
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  DEFAULT_SKILL_TYPE,
  IMPORTED_SKILL_SOURCE,
  MAX_ARCHIVE_ENTRIES,
  MAX_EXPANDED_BYTES,
  MAX_IMPORT_BYTES,
  SKILL_DOCUMENT_NAME,
} from './constants.js';

export function parseSkillImport(filename: string, bytes: Uint8Array): SkillImportPreview {
  assertDeliveredSizeWithinCap(bytes);

  if (hasExtension(filename, ['.md', '.markdown'])) return previewFromMarkdown(filename, bytes);
  if (hasExtension(filename, ['.zip'])) return previewFromArchive(bytes);

  throw new ValidationError(
    `Unsupported import file type. Accepted: ${ACCEPTED_IMPORT_EXTENSIONS.join(', ')}`,
    { filename, accepted: [...ACCEPTED_IMPORT_EXTENSIONS] },
  );
}

function previewFromMarkdown(filename: string, bytes: Uint8Array): SkillImportPreview {
  const body = strFromU8(bytes);
  return toPreview(markdownTitle(body) ?? filenameStem(filename), body, []);
}

function previewFromArchive(bytes: Uint8Array): SkillImportPreview {
  const entries = readArchiveIndex(bytes);
  assertExpandedSizeWithinCap(entries);

  const documentName = pickSkillDocument(entries);
  const extracted = unzip(bytes, (file) => file.name === documentName);
  const documentBytes = extracted[documentName];
  if (!documentBytes) {
    throw new ValidationError('Could not read the skill document from the archive', {
      entry: documentName,
    });
  }
  assertDeliveredSizeWithinCap(documentBytes);

  const body = strFromU8(documentBytes);
  const ignored = entries
    .map((e) => e.name)
    .filter((name) => name !== documentName && !name.endsWith('/'));

  return toPreview(markdownTitle(body) ?? filenameStem(documentName), body, ignored);
}

function readArchiveIndex(bytes: Uint8Array): UnzipFileInfo[] {
  const entries: UnzipFileInfo[] = [];
  unzip(bytes, (file) => {
    if (entries.length >= MAX_ARCHIVE_ENTRIES) {
      throw new ValidationError(
        `Archive has more than ${MAX_ARCHIVE_ENTRIES} entries`,
        { max_entries: MAX_ARCHIVE_ENTRIES },
      );
    }
    entries.push(file);
    return false;
  });
  return entries;
}

function unzip(
  bytes: Uint8Array,
  filter: (file: UnzipFileInfo) => boolean,
): Record<string, Uint8Array> {
  try {
    return unzipSync(bytes, { filter });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    throw new ValidationError('Could not read the archive', {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

function pickSkillDocument(entries: UnzipFileInfo[]): string {
  const names = entries.map((e) => e.name).filter((name) => !name.endsWith('/'));
  const skillDocument = names.find((name) => name.toLowerCase() === SKILL_DOCUMENT_NAME);
  if (skillDocument) return skillDocument;

  const topLevelMarkdown = names.find(
    (name) => !name.includes('/') && hasExtension(name, ['.md', '.markdown']),
  );
  if (topLevelMarkdown) return topLevelMarkdown;

  throw new ValidationError('Archive contains no skill document', {
    expected: [SKILL_DOCUMENT_NAME, '*.md'],
  });
}

function assertDeliveredSizeWithinCap(bytes: Uint8Array): void {
  if (bytes.byteLength > MAX_IMPORT_BYTES) {
    throw new ValidationError(`Import exceeds ${MAX_IMPORT_BYTES} bytes`, {
      bytes: bytes.byteLength,
      max_bytes: MAX_IMPORT_BYTES,
    });
  }
}

function assertExpandedSizeWithinCap(entries: UnzipFileInfo[]): void {
  const expanded = entries.reduce((total, entry) => total + entry.originalSize, 0);
  if (expanded > MAX_EXPANDED_BYTES) {
    throw new ValidationError(`Archive expands to more than ${MAX_EXPANDED_BYTES} bytes`, {
      expanded_bytes: expanded,
      max_bytes: MAX_EXPANDED_BYTES,
    });
  }
}

function toPreview(name: string, body: string, ignoredFiles: string[]): SkillImportPreview {
  if (body.trim().length === 0) {
    throw new ValidationError('The imported skill body is empty');
  }
  return {
    name: name.trim().length > 0 ? name.trim() : 'Imported skill',
    description: '',
    type: DEFAULT_SKILL_TYPE,
    source: IMPORTED_SKILL_SOURCE,
    body,
    ignored_files: ignoredFiles,
  };
}

function markdownTitle(text: string): string | undefined {
  return /^#\s+(.+)$/m.exec(text)?.[1]?.trim();
}

function filenameStem(filename: string): string {
  const base = filename.split('/').pop() ?? filename;
  const dot = base.lastIndexOf('.');
  return dot > 0 ? base.slice(0, dot) : base;
}

function hasExtension(filename: string, extensions: string[]): boolean {
  const lower = filename.toLowerCase();
  return extensions.some((ext) => lower.endsWith(ext));
}
