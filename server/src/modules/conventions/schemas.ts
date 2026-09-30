import { z } from 'zod';
import { MAX_SNIPPET_CHARS } from './constants.js';

export const ConventionExtractionCandidate = z.object({
  category: z.string().min(1).max(40),
  rule: z.string().min(1).max(500),
  evidence_path: z.string().min(1),
  evidence_snippet: z.string().min(1).max(MAX_SNIPPET_CHARS),
  confidence: z.number().min(0).max(1),
});
export type ConventionExtractionCandidate = z.infer<typeof ConventionExtractionCandidate>;

export const ConventionExtractionOutput = z.object({
  candidates: z.array(ConventionExtractionCandidate),
});
export type ConventionExtractionOutput = z.infer<typeof ConventionExtractionOutput>;
