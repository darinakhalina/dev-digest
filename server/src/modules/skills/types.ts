import type { Skill, SkillImportPreview, SkillSource, SkillType } from '@devdigest/shared';

export interface CreateSkillInput {
  name: string;
  description?: string;
  type?: SkillType;
  source?: SkillSource;
  body: string;
  enabled?: boolean;
  evidenceFiles?: string[];
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  type?: SkillType;
  source?: SkillSource;
  body?: string;
  enabled?: boolean;
}

export interface SkillAuthoring {
  list(workspaceId: string): Promise<Skill[]>;
  get(workspaceId: string, id: string): Promise<Skill | undefined>;
  create(workspaceId: string, input: CreateSkillInput): Promise<Skill>;
  update(
    workspaceId: string,
    id: string,
    patch: UpdateSkillInput,
  ): Promise<Skill | undefined>;
  delete(workspaceId: string, id: string): Promise<boolean>;
  importPreview(filename: string, contentBase64: string): SkillImportPreview;
}
