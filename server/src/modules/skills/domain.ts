import { strFromU8, unzipSync, type UnzipFileInfo } from 'fflate';
import type {
  ImportSignal,
  ImportSignalRule,
  SkillImportPreview,
  SkillThreatLevel,
} from '@devdigest/shared';
import { ValidationError } from '../../platform/errors.js';
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  DEFAULT_SKILL_TYPE,
  IMPORT_URL_ALLOWED_HOSTS,
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
  const scan = scanSkillBody(body);
  return {
    name: name.trim().length > 0 ? name.trim() : 'Imported skill',
    description: '',
    type: DEFAULT_SKILL_TYPE,
    source: IMPORTED_SKILL_SOURCE,
    body,
    ignored_files: ignoredFiles,
    signals: scan.signals,
    threat_level: scan.level,
  };
}

function markdownTitle(text: string): string | undefined {
  const heading = /^#\s+(.+)$/m.exec(text)?.[1];
  if (heading === undefined) return undefined;
  const plain = heading
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 0 ? plain.slice(0, 64) : undefined;
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

export type ImportUrlRefusal =
  | 'not_a_url'
  | 'scheme_not_https'
  | 'host_not_allowed'
  | 'credentials_in_url'
  | 'no_document_path';

export interface AllowedImportUrl {
  url: string;
  filename: string;
}

export function refusalMessage(reason: ImportUrlRefusal): string {
  switch (reason) {
    case 'not_a_url':
      return 'That is not a URL.';
    case 'scheme_not_https':
      return 'Only https:// addresses can be imported.';
    case 'credentials_in_url':
      return 'A URL carrying a username or password cannot be imported.';
    case 'no_document_path':
      return 'The URL must point at a Markdown document.';
    case 'host_not_allowed':
      return `Only these hosts can be imported from: ${IMPORT_URL_ALLOWED_HOSTS.join(', ')}.`;
  }
}

export function isAllowedImportHost(hostname: string): boolean {
  return (IMPORT_URL_ALLOWED_HOSTS as readonly string[]).includes(hostname.toLowerCase());
}

export function resolveImportUrl(
  raw: string,
): { ok: true; value: AllowedImportUrl } | { ok: false; reason: ImportUrlRefusal } {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return { ok: false, reason: 'not_a_url' };
  }

  if (parsed.protocol !== 'https:') return { ok: false, reason: 'scheme_not_https' };
  if (parsed.username || parsed.password) return { ok: false, reason: 'credentials_in_url' };
  if (!isAllowedImportHost(parsed.hostname)) return { ok: false, reason: 'host_not_allowed' };

  const raws = toRawGithubUrl(parsed);
  const filename = documentFilename(raws.pathname);
  if (!filename) return { ok: false, reason: 'no_document_path' };

  raws.hash = '';
  raws.search = '';
  return { ok: true, value: { url: raws.toString(), filename } };
}

function toRawGithubUrl(url: URL): URL {
  if (url.hostname.toLowerCase() !== 'github.com') return new URL(url.toString());
  const segments = url.pathname.split('/').filter(Boolean);
  const blob = segments.indexOf('blob');
  if (blob !== 2 || segments.length < 5) return new URL(url.toString());
  const [owner, repo] = segments;
  const rest = segments.slice(blob + 1).join('/');
  return new URL(`https://raw.githubusercontent.com/${owner}/${repo}/${rest}`);
}

function documentFilename(pathname: string): string | null {
  const last = pathname.split('/').filter(Boolean).pop();
  if (!last) return null;
  const decoded = safeDecode(last);
  return hasExtension(decoded, ['.md', '.markdown']) ? decoded : null;
}

function safeDecode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

const DANGEROUS_PATTERNS: ReadonlyArray<{ rule: ImportSignalRule; pattern: RegExp }> = [
  {
    rule: 'instruction_override',
    pattern: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|earlier|above|all|any)\b[^.\n]{0,40}\b(instruction|prompt|rule|direction|guideline|safety|restriction)/i,
  },
  {
    rule: 'instruction_override',
    pattern: /\boverride\s+(all\s+)?(safety|guidelines?|restrictions?|rules?)/i,
  },
  {
    rule: 'role_hijack',
    pattern: /\byou\s+are\s+now\b[^.\n]{0,40}\b(unrestricted|jailbroken|uncensored|free|helpful assistant)/i,
  },
  {
    rule: 'role_hijack',
    pattern: /\bact\s+as\s+(an?\s+)?(unrestricted|jailbroken|uncensored)/i,
  },
  { rule: 'role_hijack', pattern: /^\s{0,3}(system|assistant|developer)\s*:\s*\S/im },
  {
    rule: 'verdict_rigging',
    pattern: /\balways\s+(give|return|output|set)\b[^.\n]{0,30}\bscore\b[^.\n]{0,10}\b100\b/i,
  },
  {
    rule: 'verdict_rigging',
    pattern: /\b(always|never)\s+(approve|accept|pass|reject)\b[^.\n]{0,30}\b(prs?|pull\s+requests?|everything|all)\b/i,
  },
  {
    rule: 'finding_suppression',
    pattern: /\b(never|do\s+not|don't)\s+(flag|report|mention|identify|surface)\b[^.\n]{0,30}\b(security|vulnerabilit|issue|finding)/i,
  },
  { rule: 'delimiter_escape', pattern: /<\s*\/?\s*untrusted\b/i },
];

const SUSPICIOUS_PATTERNS: ReadonlyArray<{ rule: ImportSignalRule; pattern: RegExp }> = [
  { rule: 'role_hijack', pattern: /\b(from now on you|your new role is|new instructions\s*:)/i },
  { rule: 'role_hijack', pattern: /\[INST\]|\[SYS\]|<\|system\|>|<\|user\|>|<\|im_start\|>/i },
  {
    rule: 'secret_request',
    pattern: /\b(api[ _-]?keys?|access[ _-]?tokens?|process\.env|\.env\b|secrets?\.json|private[ _-]?keys?)\b/i,
  },
  {
    rule: 'exfiltration',
    pattern: /\b(curl|wget|fetch|send (?:it|them|this|the \w+) to)\b[^\n]{0,60}https?:\/\//i,
  },
  { rule: 'shell_block', pattern: /^\s*```\s*(bash|sh|zsh|shell|powershell|cmd)\b/im },
  { rule: 'hidden_characters', pattern: /[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/ },
];

const MAX_SIGNALS = 20;
const EXCERPT_CHARS = 160;

export interface SkillBodyScan {
  level: SkillThreatLevel;
  signals: ImportSignal[];
}

export function scanSkillBody(body: string): SkillBodyScan {
  const dangerous = matchesIn(body, DANGEROUS_PATTERNS);
  if (dangerous.length > 0) return { level: 'dangerous', signals: dangerous };

  const suspicious = matchesIn(body, SUSPICIOUS_PATTERNS);
  if (suspicious.length > 0) return { level: 'suspicious', signals: suspicious };

  return { level: 'safe', signals: [] };
}

function matchesIn(
  body: string,
  patterns: ReadonlyArray<{ rule: ImportSignalRule; pattern: RegExp }>,
): ImportSignal[] {
  const lines = body.split(/\r?\n/);
  const signals: ImportSignal[] = [];
  const seen = new Set<string>();

  for (const [index, line] of lines.entries()) {
    for (const { rule, pattern } of patterns) {
      if (signals.length >= MAX_SIGNALS) return signals;
      if (seen.has(`${rule}:${index}`)) continue;
      if (!pattern.test(line)) continue;
      seen.add(`${rule}:${index}`);
      signals.push({ rule, line: index + 1, excerpt: excerptOf(line) });
    }
  }

  const joined = lines.join(' ');
  const lineStarts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }

  for (const { rule, pattern } of patterns) {
    if (signals.length >= MAX_SIGNALS) return signals;
    const match = pattern.exec(joined);
    pattern.lastIndex = 0;
    if (!match) continue;
    const index = lineIndexAt(lineStarts, match.index);
    if (seen.has(`${rule}:${index}`)) continue;
    seen.add(`${rule}:${index}`);
    signals.push({
      rule,
      line: index + 1,
      excerpt: excerptOf(joined.slice(match.index, match.index + EXCERPT_CHARS)),
    });
  }

  return signals;
}

function lineIndexAt(lineStarts: number[], offset: number): number {
  let index = 0;
  while (index + 1 < lineStarts.length && lineStarts[index + 1]! <= offset) index += 1;
  return index;
}

function excerptOf(line: string): string {
  const visible = line.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g, '\uFFFD').trim();
  return visible.length > EXCERPT_CHARS ? `${visible.slice(0, EXCERPT_CHARS)}\u2026` : visible;
}

export interface ThreatState {
  level: SkillThreatLevel;
  acceptedAt: Date | null;
}

export function isRiskAccepted(state: ThreatState): boolean {
  return state.acceptedAt !== null;
}

export function needsRiskAcceptance(state: ThreatState): boolean {
  return state.level === 'dangerous';
}

export function isBlockedFromModel(state: ThreatState): boolean {
  return needsRiskAcceptance(state) && !isRiskAccepted(state);
}

const THREAT_SEVERITY: Record<SkillThreatLevel, number> = {
  unknown: 0,
  safe: 1,
  suspicious: 2,
  dangerous: 3,
};

export function worseThreat(a: SkillThreatLevel, b: SkillThreatLevel): SkillThreatLevel {
  return THREAT_SEVERITY[a] >= THREAT_SEVERITY[b] ? a : b;
}
