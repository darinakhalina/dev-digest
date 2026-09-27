import { and, asc, count, eq, inArray } from 'drizzle-orm';
import type { SkillSource, SkillThreatLevel, SkillType } from '@devdigest/shared';
import type { Db } from '../../db/client.js';
import * as t from '../../db/schema.js';
import { scanSkillBody, worseThreat } from './domain.js';

export type SkillRow = typeof t.skills.$inferSelect;
export type SkillVersionRow = typeof t.skillVersions.$inferSelect;

export interface InsertSkill {
  workspaceId: string;
  name: string;
  description: string;
  type: SkillType;
  source: SkillSource;
  body: string;
  enabled?: boolean;
  evidenceFiles?: string[];
  modelLevel?: SkillThreatLevel;
  modelReason?: string;
}

export interface UpdateSkill {
  name?: string;
  description?: string;
  type?: SkillType;
  source?: SkillSource;
  body?: string;
  enabled?: boolean;
  modelLevel?: SkillThreatLevel;
  modelReason?: string;
}

export class SkillsRepository {
  constructor(private db: Db) {}

  async list(workspaceId: string): Promise<SkillRow[]> {
    return this.db
      .select()
      .from(t.skills)
      .where(eq(t.skills.workspaceId, workspaceId))
      .orderBy(t.skills.createdAt);
  }

  async agentCounts(workspaceId: string, skillIds: string[]): Promise<Map<string, number>> {
    if (skillIds.length === 0) return new Map();
    const rows = await this.db
      .select({ skillId: t.agentSkills.skillId, n: count() })
      .from(t.agentSkills)
      .innerJoin(t.agents, eq(t.agents.id, t.agentSkills.agentId))
      .where(
        and(eq(t.agents.workspaceId, workspaceId), inArray(t.agentSkills.skillId, skillIds)),
      )
      .groupBy(t.agentSkills.skillId);
    return new Map(rows.map((r) => [r.skillId, Number(r.n)]));
  }

  async versionBody(skillId: string, version: number): Promise<string | undefined> {
    const [row] = await this.db
      .select({ body: t.skillVersions.body })
      .from(t.skillVersions)
      .where(and(eq(t.skillVersions.skillId, skillId), eq(t.skillVersions.version, version)));
    return row?.body;
  }

  async versions(skillId: string): Promise<SkillVersionRow[]> {
    return this.db
      .select()
      .from(t.skillVersions)
      .where(eq(t.skillVersions.skillId, skillId))
      .orderBy(asc(t.skillVersions.version));
  }

  async getById(workspaceId: string, id: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .select()
      .from(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)));
    return row;
  }

  async acceptThreat(workspaceId: string, id: string, userId: string): Promise<SkillRow | undefined> {
    const [row] = await this.db
      .update(t.skills)
      .set({ threatAcceptedAt: new Date(), threatAcceptedBy: userId })
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning();
    return row;
  }

  async deleteById(workspaceId: string, id: string): Promise<boolean> {
    const rows = await this.db
      .delete(t.skills)
      .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
      .returning({ id: t.skills.id });
    return rows.length > 0;
  }

  async insert(values: InsertSkill): Promise<SkillRow> {
    const scan = scanSkillBody(values.body);
    const level = worseThreat(scan.level, values.modelLevel ?? 'unknown');
    return this.db.transaction(async (tx) => {
      const [row] = await tx
        .insert(t.skills)
        .values({
          workspaceId: values.workspaceId,
          name: values.name,
          description: values.description,
          type: values.type,
          source: values.source,
          body: values.body,
          enabled: level === 'dangerous' ? false : (values.enabled ?? true),
          version: 1,
          ...(values.evidenceFiles !== undefined ? { evidenceFiles: values.evidenceFiles } : {}),
          threatLevel: level,
          threatSignals: scan.signals,
          threatReason: values.modelReason ?? null,
        })
        .returning();
      await tx
        .insert(t.skillVersions)
        .values({ skillId: row!.id, version: row!.version, body: row!.body });
      return row!;
    });
  }

  async update(
    workspaceId: string,
    id: string,
    patch: UpdateSkill,
  ): Promise<SkillRow | undefined> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(t.skills)
        .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
        .for('update');
      if (!existing) return undefined;

      const bodyChanged = patch.body !== undefined && patch.body !== existing.body;
      const nextVersion = bodyChanged ? existing.version + 1 : existing.version;
      const rescan = bodyChanged ? scanSkillBody(patch.body!) : null;
      const rescanLevel = rescan
        ? worseThreat(rescan.level, patch.modelLevel ?? 'unknown')
        : null;

      const [row] = await tx
        .update(t.skills)
        .set({
          ...(patch.name !== undefined ? { name: patch.name } : {}),
          ...(patch.description !== undefined ? { description: patch.description } : {}),
          ...(patch.type !== undefined ? { type: patch.type } : {}),
          ...(patch.source !== undefined ? { source: patch.source } : {}),
          ...(patch.body !== undefined ? { body: patch.body } : {}),
          ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
          ...(bodyChanged
            ? {
                version: nextVersion,
                threatLevel: rescanLevel!,
                threatSignals: rescan!.signals,
                threatReason: patch.modelReason ?? null,
                threatAcceptedAt: null,
                threatAcceptedBy: null,
              }
            : {}),
        })
        .where(and(eq(t.skills.workspaceId, workspaceId), eq(t.skills.id, id)))
        .returning();

      if (bodyChanged && row) {
        await tx
          .insert(t.skillVersions)
          .values({ skillId: row.id, version: nextVersion, body: row.body });
      }
      return row;
    });
  }
}
