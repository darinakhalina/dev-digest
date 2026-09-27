"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, IconBtn, Toggle } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { TYPE_COLOR, s } from "./styles";

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
  const agents = skill.agent_count ?? 0;

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={s.card(active, skill.enabled)}
    >
      <div style={s.headerRow}>
        <span style={s.iconBox}>
          <Icon.Sparkles size={15} />
        </span>
        <span className="mono" style={s.name}>
          {skill.name}
        </span>
        <div onClick={(e) => e.stopPropagation()}>
          <Toggle
            on={skill.enabled}
            onChange={onToggle}
            size={16}
            label={t("listItem.toggleLabel", { name: skill.name })}
          />
        </div>
      </div>

      <div style={s.description}>{skill.description || t("listItem.noDescription")}</div>

      <div style={s.badgeRow}>
        <Badge color={TYPE_COLOR[skill.type]} mono>
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
      </div>

      <div style={s.footer}>
        <span style={s.agents}>{t("listItem.agents", { count: agents })}</span>
        <span onClick={(e) => e.stopPropagation()}>
          <IconBtn
            icon="Trash"
            label={t("remove.label", { name: skill.name })}
            size={24}
            danger
            onClick={onDelete}
          />
        </span>
      </div>
    </div>
  );
}
