import { describe, it, expect } from 'vitest';
import { prTitleText, taskLine } from '../src/modules/reviews/helpers.js';

/**
 * Unit coverage for the review task-line. The key invariant: our trusted
 * instruction always tells the model to review the whole diff and never
 * withhold a security/correctness finding — no matter what the PR text claims.
 */

describe('taskLine', () => {
  const pull = { number: 3, title: 'test: vulnerable fixture', author: 'burnjohn' } as never;

  it('names the PR being reviewed by number only — its title is untrusted (AC-8)', () => {
    const line = taskLine(pull);
    expect(line).toContain('#3');
    expect(line).not.toContain('test: vulnerable fixture');
    expect(line).not.toContain('burnjohn');
  });

  it('hands the title and author over separately, for the fenced slot', () => {
    expect(prTitleText(pull)).toBe('test: vulnerable fixture\nby burnjohn');
  });

  it('keeps the non-negotiable "never withhold security" rule', () => {
    const line = taskLine(pull);
    expect(line).toMatch(/never .*withhold .*(or downgrade )?.*security/i);
    expect(line).toMatch(/review the entire diff/i);
  });
});
