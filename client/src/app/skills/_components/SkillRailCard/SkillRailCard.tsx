"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { RailCard } from "@/components/rail-card";
import { skillTypeColor } from "@/lib/skill-type";

export interface SkillRailCardProps {
  skill: Skill;
  active: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

export function SkillRailCard({
  skill,
  active,
  onSelect,
  onToggle,
  onDelete,
}: SkillRailCardProps) {
  const t = useTranslations("skills");
  const untrusted = skill.source !== "manual";
  const type = skillTypeColor(skill.type);

  return (
    <RailCard
      icon="Sparkles"
      name={skill.name}
      mono
      description={skill.description || t("listItem.noDescription")}
      active={active}
      enabled={skill.enabled}
      onSelect={onSelect}
      onToggle={onToggle}
      toggleLabel={t("listItem.toggleLabel", { name: skill.name })}
      onDelete={onDelete}
      deleteLabel={t("remove.label", { name: skill.name })}
      badges={
        <>
          <Badge color={type.fg} bg={type.bg} mono>
            {t(`listItem.type.${skill.type}`)}
          </Badge>
          <Badge color="var(--text-muted)">{t(`listItem.source.${skill.source}`)}</Badge>
          {untrusted && (
            <span title={t("listItem.vettingTitle")}>
              <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
                {t("listItem.needsVetting")}
              </Badge>
            </span>
          )}
        </>
      }
      footer={t("listItem.agents", { count: skill.agent_count ?? 0 })}
    />
  );
}
