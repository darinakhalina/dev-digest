"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon } from "@devdigest/ui";
import type { SkillImportPreview } from "@devdigest/shared";
import { THREAT_COLOR } from "@/lib/skill-threat";
import { s } from "./styles";

export function ImportPreview({ proposal }: { proposal: SkillImportPreview }) {
  const t = useTranslations("skills");
  const dangerous = proposal.threat_level === "dangerous";
  const suspicious = proposal.threat_level === "suspicious";
  const tone = dangerous ? THREAT_COLOR.danger : THREAT_COLOR.warn;
  const signals = proposal.signals ?? [];

  return (
    <div style={s.wrap}>
      {signals.length > 0 && (
        <div style={s.alert(tone.fg, tone.bg)}>
          <div style={s.alertHead}>
            <Icon.AlertTriangle size={14} />
            <strong style={s.alertTitle}>
              {dangerous ? t("threat.bannerTitle") : t("threat.badgeSuspicious")}
            </strong>
            <Badge color={tone.fg} bg={tone.bg}>
              {t("threat.signalsTitle", { count: signals.length })}
            </Badge>
          </div>
          <ul style={s.signalList}>
            {signals.map((signal) => (
              <li key={`${signal.rule}-${signal.line}`} style={s.signal}>
                <span style={s.signalLine}>{signal.line}</span>
                <span style={s.signalRule}>{t(`threat.rule.${signal.rule}`)}</span>
                <code style={s.signalExcerpt}>{signal.excerpt}</code>
              </li>
            ))}
          </ul>
          <p style={s.alertHint}>
            {dangerous ? t("threat.bannerBody") : t("threat.signalsHint")}
          </p>
        </div>
      )}

      <div style={s.row}>
        <span style={s.label}>{t("file.proposedName")}</span>
        <span style={s.value}>{proposal.name}</span>
      </div>
      <div style={s.row}>
        <span style={s.label}>{t("file.proposedType")}</span>
        <span style={s.value}>{t(`listItem.type.${proposal.type}`)}</span>
      </div>

      <div>
        <span style={s.label}>{t("file.proposedBody")}</span>
        <pre className="mono" style={s.body}>
          {proposal.body}
        </pre>
      </div>

      {proposal.ignored_files.length > 0 && (
        <div>
          <span style={s.label}>
            {t("file.ignoredTitle", { count: proposal.ignored_files.length })}
          </span>
          <p style={s.muted}>{t("file.ignoredHint")}</p>
          <ul style={s.ignoredList}>
            {proposal.ignored_files.map((name) => (
              <li key={name} className="mono">
                {name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p style={s.notice}>
        {suspicious || dangerous ? t("threat.signalsHint") : t("file.nothingStored")}{" "}
        {t("file.disabledNotice")}
      </p>
    </div>
  );
}
