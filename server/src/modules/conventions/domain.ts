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

export function renderSkillBody(
  skillName: string,
  repoFullName: string,
  candidates: RenderableCandidate[],
): string {
  const rules = candidates.map((c, i) => {
    const rule = asContent(c.rule)
      .split('\n')
      .map((line, j) => (j === 0 ? line : `   ${line}`))
      .join('\n');
    const where = `${c.evidencePath}:${c.evidenceStartLine}-${c.evidenceEndLine}`;
    return `${i + 1}. ${rule}\n\n   Category: ${asInlineContent(c.category)}\n   Detected in \`${where}\``;
  });

  return [
    `# ${skillName}`,
    '',
    `House conventions detected in \`${repoFullName}\`. Flag any change that violates a rule below,`,
    'and cite the offending `file:line`. Each rule was verified against real code at the commit named',
    'with it; if the cited code no longer exists, say so instead of guessing.',
    '',
    '## Rules',
    '',
    rules.join('\n\n'),
    '',
  ].join('\n');
}

export function describeSkill(repoFullName: string, count: number): string {
  const noun = count === 1 ? 'house convention' : 'house conventions';
  return `${count} ${noun} extracted from ${repoFullName}`;
}
