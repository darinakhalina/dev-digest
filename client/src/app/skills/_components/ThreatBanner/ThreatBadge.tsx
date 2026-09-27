"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { THREAT_COLOR, resolveSkillThreat } from "@/lib/skill-threat";

export function ThreatBadge({ skill }: { skill: Pick<Skill, "threat_level" | "threat_accepted_at"> }) {
  const t = useTranslations("skills");
  const threat = resolveSkillThreat(skill);
  if (!threat.tone) return null;

  const tone = threat.isAcceptedDanger ? THREAT_COLOR.warn : THREAT_COLOR[threat.tone];
  const label = threat.isAcceptedDanger
    ? t("threat.badgeAccepted")
    : threat.isDangerous
      ? t("threat.badgeDangerous")
      : t("threat.badgeSuspicious");

  return (
    <Badge color={tone.fg} bg={tone.bg} icon="AlertTriangle">
      {label}
    </Badge>
  );
}
