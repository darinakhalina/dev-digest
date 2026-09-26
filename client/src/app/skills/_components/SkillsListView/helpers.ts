import type { Skill } from "@devdigest/shared";

export function filterSkills(skills: Skill[], search: string): Skill[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return skills;
  return skills.filter(
    (skill) =>
      skill.name.toLowerCase().includes(needle) ||
      skill.description.toLowerCase().includes(needle),
  );
}
