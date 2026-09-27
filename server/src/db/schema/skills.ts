import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { now } from './_shared';
import { users, workspaces } from './core';
import type { ImportSignal } from '../../vendor/shared/contracts/knowledge';

export const skills = pgTable(
  'skills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description').notNull(),
    type: text('type', { enum: ['rubric', 'convention', 'security', 'custom'] }).notNull(),
    source: text('source', {
      enum: ['manual', 'imported_url', 'extracted', 'community'],
    }).notNull(),
    body: text('body').notNull(),
    enabled: boolean('enabled').notNull().default(true),
    version: integer('version').notNull().default(1),
    evidenceFiles: jsonb('evidence_files').$type<string[]>(),
    threatLevel: text('threat_level', {
      enum: ['unknown', 'safe', 'suspicious', 'dangerous'],
    })
      .notNull()
      .default('unknown'),
    threatSignals: jsonb('threat_signals').$type<ImportSignal[]>(),
    threatReason: text('threat_reason'),
    threatAcceptedAt: timestamp('threat_accepted_at', { withTimezone: true }),
    threatAcceptedBy: uuid('threat_accepted_by').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: now(),
  },
  (t) => ({
    wsIdx: index('skills_ws_idx').on(t.workspaceId),
    threatIdx: index('skills_threat_idx').on(t.workspaceId, t.threatLevel),
  }),
);

export const skillVersions = pgTable(
  'skill_versions',
  {
    skillId: uuid('skill_id')
      .notNull()
      .references(() => skills.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    body: text('body').notNull(),
    createdAt: now(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.skillId, t.version] }) }),
);
