"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Badge, Button, EmptyState } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { s } from "./styles";

export function SkillPreviewPanel({ skill }: { skill: Skill | null }) {
  const t = useTranslations("skills");
  const router = useRouter();

  if (!skill) {
    return (
      <div style={s.panel}>
        <EmptyState
          icon="Sparkles"
          title={t("page.selectPrompt.title")}
          body={t("page.selectPrompt.body")}
        />
      </div>
    );
  }

  const untrusted = skill.source !== "manual";

  return (
    <section style={s.panel} aria-label={skill.name}>
      <div style={s.headerRow}>
        <h2 style={s.title}>{skill.name}</h2>
        <Badge color="var(--text-secondary)" mono>
          {t(`listItem.type.${skill.type}`)}
        </Badge>
        <Badge color={skill.enabled ? "var(--ok)" : "var(--text-muted)"}>
          {skill.enabled ? t("preview.enabled") : t("preview.disabled")}
        </Badge>
        {untrusted && (
          <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
            {t("preview.untrustedBadge")}
          </Badge>
        )}
        <Button kind="secondary" size="sm" icon="Edit" onClick={() => router.push(`/skills/${skill.id}`)}>
          {t("preview.edit")}
        </Button>
      </div>

      {untrusted && <p style={s.notice}>{t("preview.untrustedNotice")}</p>}

      <div>
        <div style={s.label}>{t("preview.descriptionLabel")}</div>
        <p style={s.description}>{skill.description || t("listItem.noDescription")}</p>
      </div>

      <div>
        <div style={s.label}>{t("preview.bodyLabel")}</div>
        <pre className="mono" style={s.body}>
          {skill.body}
        </pre>
      </div>
    </section>
  );
}
