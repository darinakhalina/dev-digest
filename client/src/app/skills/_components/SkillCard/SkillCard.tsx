"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, Toggle } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useDeleteSkill } from "@/lib/hooks/skills";
import { s } from "./styles";

export function SkillCard({
  skill,
  active,
  onSelect,
  onToggle,
}: {
  skill: Skill;
  active?: boolean;
  onSelect?: () => void;
  onToggle?: (enabled: boolean) => void;
}) {
  const t = useTranslations("skills");
  const del = useDeleteSkill();
  const untrusted = skill.source !== "manual";

  return (
    <div style={s.card(!!active, skill.enabled)}>
      <div style={s.headerRow}>
        <div style={s.iconBox}>
          <Icon.Sparkles size={15} />
        </div>
        <button type="button" onClick={onSelect} style={s.nameButton}>
          {skill.name}
        </button>
        {onToggle && (
          <Toggle
            on={skill.enabled}
            onChange={onToggle}
            size={14}
            label={t("listItem.toggleLabel", { name: skill.name })}
          />
        )}
        <button
          type="button"
          onClick={() => {
            if (window.confirm(t("listItem.deleteConfirm", { name: skill.name }))) del.mutate(skill.id);
          }}
          disabled={del.isPending}
          title={t("listItem.delete")}
          aria-label={t("listItem.delete")}
          style={s.iconButton}
        >
          <Icon.Trash size={14} />
        </button>
      </div>
      <div style={s.description}>{skill.description || t("listItem.noDescription")}</div>
      <div style={s.metaRow}>
        <Badge color="var(--text-secondary)" mono>
          {t(`listItem.type.${skill.type}`)}
        </Badge>
        <span style={s.source}>{t(`listItem.source.${skill.source}`)}</span>
        {untrusted && (
          <span title={t("listItem.vettingTitle")}>
            <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
              {t("listItem.needsVetting")}
            </Badge>
          </span>
        )}
      </div>
    </div>
  );
}
