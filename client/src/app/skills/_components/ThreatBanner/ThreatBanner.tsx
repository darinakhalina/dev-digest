"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Icon } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useAcceptSkillRisk } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { THREAT_COLOR, resolveSkillThreat } from "@/lib/skill-threat";
import { s } from "./styles";

export function ThreatBanner({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const accept = useAcceptSkillRisk();
  const [agreed, setAgreed] = React.useState(false);

  const threat = resolveSkillThreat(skill);
  if (!threat.isDangerous && !threat.isSuspicious) return null;

  const tone = threat.isAcceptedDanger ? THREAT_COLOR.warn : THREAT_COLOR[threat.tone ?? "warn"];
  const signals = skill.threat_signals ?? [];

  return (
    <div role="alert" style={s.banner(tone.fg, tone.bg)}>
      <div style={s.head}>
        <Icon.AlertTriangle size={15} style={{ color: tone.fg }} />
        <strong style={s.title(tone.fg)}>
          {threat.isAcceptedDanger
            ? t("threat.bannerAcceptedTitle")
            : threat.isDangerous
              ? t("threat.bannerTitle")
              : t("threat.badgeSuspicious")}
        </strong>
        <span style={s.body}>
          {threat.isAcceptedDanger
            ? t("threat.bannerAcceptedBody")
            : threat.isDangerous
              ? t("threat.bannerBody")
              : t("threat.signalsHint")}
        </span>
      </div>

      {signals.length > 0 && (
        <ul style={s.signalList}>
          {signals.map((signal) => (
            <li key={`${signal.rule}-${signal.line}`} style={s.signal}>
              <span style={s.signalLine}>{signal.line}</span>
              <span style={s.signalRule}>{t(`threat.rule.${signal.rule}`)}</span>
              <code style={s.signalExcerpt}>{signal.excerpt}</code>
            </li>
          ))}
        </ul>
      )}

      {threat.isBlocked && (
        <div style={s.acceptRow}>
          <label style={s.acceptLabel}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              style={s.checkbox}
            />
            <span>{t("threat.acceptLabel")}</span>
          </label>
          <Button
            kind="danger"
            size="sm"
            icon="AlertTriangle"
            disabled={!agreed || accept.isPending}
            loading={accept.isPending}
            onClick={() =>
              accept.mutate(skill.id, {
                onSuccess: () => toast.success(t("threat.acceptedToast", { name: skill.name })),
              })
            }
          >
            {accept.isPending ? t("threat.accepting") : t("threat.acceptButton")}
          </Button>
        </div>
      )}

      {threat.isAcceptedDanger && skill.threat_accepted_at && (
        <p style={s.acceptedOn}>
          {t("threat.acceptedOn", {
            date: new Date(skill.threat_accepted_at).toLocaleString(),
          })}
        </p>
      )}
    </div>
  );
}
