"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon, Markdown } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { s } from "./styles";

export function PreviewTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const untrusted = skill.source !== "manual";

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h2 style={s.h2}>{t("preview.title")}</h2>
        {untrusted && (
          <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
            {t("listItem.needsVetting")}
          </Badge>
        )}
      </div>
      <p style={s.hint}>{t("preview.hint")}</p>

      {!skill.enabled && (
        <div style={s.disabled}>
          <Icon.AlertTriangle size={13} />
          {t("preview.disabledNotice")}
        </div>
      )}

      <div style={s.panel}>
        <Markdown>{skill.body}</Markdown>
      </div>
    </div>
  );
}
