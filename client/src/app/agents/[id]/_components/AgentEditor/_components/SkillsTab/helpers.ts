import type { AgentSkillLink, Skill } from "@devdigest/shared";

export function toOrderedSkillIds(links: AgentSkillLink[] | undefined): string[] {
  return [...(links ?? [])].sort((a, b) => a.order - b.order).map((link) => link.skill_id);
}

export function moveSkill(ids: string[], from: number, to: number): string[] {
  if (to < 0 || to >= ids.length || from === to) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export function filterByName(skills: Skill[], search: string): Skill[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter((skill) => skill.name.toLowerCase().includes(needle));
}
