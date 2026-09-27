import {
  MAX_FILE_LINES,
  MIN_EVIDENCE_CHARS,
  MIN_EVIDENCE_LINES,
  DEFAULT_SKILL_NAME_SUFFIX,
  FALLBACK_SKILL_NAME,
} from './constants.js';

export interface VerifiedLineRange {
  startLine: number;
  endLine: number;
}

export interface SampledFile {
  path: string;
  content: string;
  truncatedAtLine: number | null;
}

export interface RenderableCandidate {
  category: string;
  rule: string;
  evidencePath: string;
  evidenceStartLine: number;
  evidenceEndLine: number;
  evidenceSnippet: string;
}

function normalizeLine(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

function trimBlankEdges(lines: string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start]!.trim() === '') start++;
  while (end > start && lines[end - 1]!.trim() === '') end--;
  return lines.slice(start, end);
}

export function hasEvidentialSubstance(snippet: string): boolean {
  const lines = trimBlankEdges(snippet.split(/\r?\n/));
  if (lines.length === 0) return false;

  const joined = lines.join('');
  if (!/[A-Za-z0-9_]/.test(joined)) return false;

  if (lines.length >= MIN_EVIDENCE_LINES) return true;

  const dense = lines[0]!.replace(/\s+/g, '');
  return dense.length >= MIN_EVIDENCE_CHARS;
}

export function findSnippetLines(
  fileContent: string,
  snippet: string,
): VerifiedLineRange | null {
  const fileLines = fileContent.split(/\r?\n/);
  const snippetLines = trimBlankEdges(snippet.split(/\r?\n/));
  if (snippetLines.length === 0) return null;

  const normFile = fileLines.map(normalizeLine);
  const normSnippet = snippetLines.map(normalizeLine);

  for (let i = 0; i <= normFile.length - normSnippet.length; i++) {
    let matched = true;
    for (let j = 0; j < normSnippet.length; j++) {
      if (normFile[i + j] !== normSnippet[j]) {
        matched = false;
        break;
      }
    }
    if (matched) return { startLine: i + 1, endLine: i + normSnippet.length };
  }
  return null;
}

export function truncateForPrompt(path: string, content: string): SampledFile {
  const lines = content.split(/\r?\n/);
  if (lines.length <= MAX_FILE_LINES) {
    return { path, content, truncatedAtLine: null };
  }
  return {
    path,
    content: lines.slice(0, MAX_FILE_LINES).join('\n'),
    truncatedAtLine: MAX_FILE_LINES,
  };
}

export function fenceFor(content: string): string {
  const longest = [...content.matchAll(/`{3,}/g)].reduce(
    (max, m) => Math.max(max, m[0].length),
    2,
  );
  return '`'.repeat(longest + 1);
}

const STRUCTURAL_LINE =
  /^\s*(#{1,6}\s|`{3,}|~{3,}|-{3,}\s*$|\*{3,}\s*$|_{3,}\s*$|---\s*$)/;

export function asContent(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => (STRUCTURAL_LINE.test(line) ? `\\${line.trimStart()}` : line))
    .join('\n');
}

export function asInlineContent(text: string): string {
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function suggestSkillName(repoFullName: string): string {
  const tail = repoFullName.split('/').pop() ?? '';
  const slug = tail
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug ? `${slug}-${DEFAULT_SKILL_NAME_SUFFIX}` : FALLBACK_SKILL_NAME;
}

const RULE_STOPWORDS = new Set([
  'always', 'use', 'the', 'a', 'an', 'to', 'of', 'instead', 'must', 'should',
  'all', 'in', 'via', 'through', 'are', 'is', 'and', 'with', 'for', 'every',
]);

export function slugifyRule(rule: string): string {
  const words = rule
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .split('-')
    .filter((w) => w && !RULE_STOPWORDS.has(w));
  return words.slice(0, 4).join('-');
}

export function formatEvidenceRange(
  path: string,
  startLine: number,
  endLine: number,
): string {
  return startLine === endLine ? `${path}:${startLine}` : `${path}:${startLine}-${endLine}`;
}

export function renderSkillBody(
  skillName: string,
  repoFullName: string,
  candidates: RenderableCandidate[],
): string {
  const sections = candidates.map((c, i) => {
    const heading = slugifyRule(c.rule) || `rule-${i + 1}`;
    const fence = fenceFor(c.evidenceSnippet);
    const where = formatEvidenceRange(c.evidencePath, c.evidenceStartLine, c.evidenceEndLine);
    return [
      `## ${heading}`,
      asContent(c.rule),
      '',
      `Detected in \`${where}\`:`,
      '',
      fence,
      c.evidenceSnippet,
      fence,
    ].join('\n');
  });

  return [
    `# ${skillName}`,
    '',
    `House conventions for \`${repoFullName}\`. Flag changes that violate any rule below and cite the offending \`file:line\`.`,
    '',
    sections.join('\n\n'),
    '',
  ].join('\n');
}

export function describeSkill(
  repoFullName: string,
  candidates: RenderableCandidate[],
): string {
  if (candidates.length === 1) return asInlineContent(candidates[0]!.rule);
  return `${candidates.length} house conventions extracted from ${repoFullName}`;
}

export function proposeSkillName(
  repoFullName: string,
  candidates: RenderableCandidate[],
): string {
  if (candidates.length === 1) {
    const slug = slugifyRule(candidates[0]!.rule);
    if (slug) return slug;
  }
  return suggestSkillName(repoFullName);
}
