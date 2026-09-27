import type { Skill, SkillThreatLevel } from "@devdigest/shared";

export type ThreatTone = "danger" | "warn" | "muted";

export interface SkillThreatState {
  level: SkillThreatLevel;
  accepted: boolean;
  isDangerous: boolean;
  isSuspicious: boolean;
  isBlocked: boolean;
  isAcceptedDanger: boolean;
  tone: ThreatTone | null;
}

export const THREAT_COLOR: Record<ThreatTone, { fg: string; bg: string; border: string }> = {
  danger: { fg: "var(--crit)", bg: "var(--crit-bg)", border: "var(--crit)" },
  warn: { fg: "var(--warn)", bg: "var(--warn-bg)", border: "var(--warn)" },
  muted: { fg: "var(--text-muted)", bg: "var(--bg-hover)", border: "var(--border)" },
};

export function resolveSkillThreat(
  skill: Pick<Skill, "threat_level" | "threat_accepted_at">,
): SkillThreatState {
  const level = skill.threat_level ?? "unknown";
  const accepted = skill.threat_accepted_at != null;
  const isDangerous = level === "dangerous";
  const isSuspicious = level === "suspicious";

  return {
    level,
    accepted,
    isDangerous,
    isSuspicious,
    isBlocked: isDangerous && !accepted,
    isAcceptedDanger: isDangerous && accepted,
    tone: isDangerous ? "danger" : isSuspicious ? "warn" : null,
  };
}
