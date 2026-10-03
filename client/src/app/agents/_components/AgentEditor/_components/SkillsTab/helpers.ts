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

export const ATTACHED_ZONE = "zone-attached";
export const AVAILABLE_ZONE = "zone-available";

export function resolveDrop(
  attachedIds: string[],
  activeId: string,
  overId: string | null,
): string[] | null {
  if (!overId || activeId === overId) return null;

  const from = attachedIds.indexOf(activeId);
  const overIndex = attachedIds.indexOf(overId);
  const intoAttached = overId === ATTACHED_ZONE || overIndex !== -1;

  if (from !== -1) {
    if (!intoAttached) return attachedIds.filter((id) => id !== activeId);
    if (overIndex === -1 || overIndex === from) return null;
    return moveSkill(attachedIds, from, overIndex);
  }

  if (!intoAttached) return null;
  const at = overIndex === -1 ? attachedIds.length : overIndex;
  const next = [...attachedIds];
  next.splice(at, 0, activeId);
  return next;
}
