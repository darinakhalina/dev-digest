import { and, desc, eq, inArray } from 'drizzle-orm';
import type { ConventionStatus, Provider } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';

export type ConventionScanRow = typeof t.conventionScans.$inferSelect;
export type ConventionRow = typeof t.conventions.$inferSelect;

export interface InsertScan {
  workspaceId: string;
  repoId: string;
  sampleFileCount: number;
  discardedCount: number;
  sourceSha: string;
  provider: Provider;
  model: string;
  tokensIn: number | null;
  tokensOut: number | null;
  costUsd: number | null;
}

export interface InsertCandidate {
  category: string;
  rule: string;
  evidencePath: string;
  evidenceStartLine: number;
  evidenceEndLine: number;
  evidenceSnippet: string;
  confidence: number;
}

export class ConventionsRepository {
  constructor(private db: Db) {}

  async recordScan(
    scan: InsertScan,
    candidates: InsertCandidate[],
  ): Promise<{ scan: ConventionScanRow; candidates: ConventionRow[] }> {
    return this.db.transaction(async (tx) => {
      const [row] = await tx.insert(t.conventionScans).values(scan).returning();
      if (candidates.length === 0) return { scan: row!, candidates: [] };
      const inserted = await tx
        .insert(t.conventions)
        .values(
          candidates.map((c) => ({
            workspaceId: scan.workspaceId,
            repoId: scan.repoId,
            scanId: row!.id,
            ...c,
          })),
        )
        .returning();
      return { scan: row!, candidates: inserted };
    });
  }

  async getLatestScan(
    workspaceId: string,
    repoId: string,
  ): Promise<ConventionScanRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.conventionScans)
      .where(
        and(
          eq(t.conventionScans.workspaceId, workspaceId),
          eq(t.conventionScans.repoId, repoId),
        ),
      )
      .orderBy(desc(t.conventionScans.createdAt))
      .limit(1);
    return row;
  }

  async listByScan(
    workspaceId: string,
    repoId: string,
    scanId: string,
  ): Promise<ConventionRow[]> {
    return this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          eq(t.conventions.scanId, scanId),
        ),
      )
      .orderBy(desc(t.conventions.confidence), t.conventions.createdAt);
  }

  async getByIds(
    workspaceId: string,
    repoId: string,
    ids: string[],
  ): Promise<ConventionRow[]> {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(t.conventions)
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          inArray(t.conventions.id, ids),
        ),
      );
  }

  async patch(
    workspaceId: string,
    repoId: string,
    id: string,
    values: { status?: ConventionStatus; rule?: string },
  ): Promise<ConventionRow | undefined> {
    const [row] = await this.db
      .update(t.conventions)
      .set({
        ...(values.status !== undefined ? { status: values.status } : {}),
        ...(values.rule !== undefined ? { rule: values.rule } : {}),
      })
      .where(
        and(
          eq(t.conventions.workspaceId, workspaceId),
          eq(t.conventions.repoId, repoId),
          eq(t.conventions.id, id),
        ),
      )
      .returning();
    return row;
  }
}
