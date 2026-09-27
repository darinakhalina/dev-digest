import type { SkillType } from "@devdigest/shared";

export interface SkillTypeColor {
  fg: string;
  bg: string;
}

const SKILL_TYPE_COLOR: Record<SkillType, SkillTypeColor> = {
  rubric: { fg: "var(--sugg)", bg: "var(--sugg-bg)" },
  convention: { fg: "var(--ok)", bg: "var(--ok-bg)" },
  security: { fg: "var(--crit)", bg: "var(--crit-bg)" },
  custom: { fg: "var(--warn)", bg: "var(--warn-bg)" },
};

export function skillTypeColor(type: SkillType): SkillTypeColor {
  return SKILL_TYPE_COLOR[type] ?? { fg: "var(--text-secondary)", bg: "var(--bg-hover)" };
}
