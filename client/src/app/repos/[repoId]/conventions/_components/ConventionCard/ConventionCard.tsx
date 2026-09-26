"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Card, Checkbox, Chip, MonoLink, ProgressBar, Textarea } from "@devdigest/ui";
import type { ConventionCandidate, ConventionStatus } from "@devdigest/shared";
import { githubBlobUrl } from "@/lib/github-urls";
import { s } from "./styles";

export interface ConventionCardProps {
  candidate: ConventionCandidate;
  repoFullName: string | null;
  sourceSha: string | null;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onDecide: (status: ConventionStatus) => void;
  onRule: (rule: string) => void;
  saveError?: boolean;
}

export function ConventionCard({
  candidate,
  repoFullName,
  sourceSha,
  selected,
  onSelect,
  onDecide,
  onRule,
  saveError,
}: ConventionCardProps) {
  const t = useTranslations("conventions.card");
  const [draft, setDraft] = React.useState<string | null>(null);

  const where = `${candidate.evidence_path}:${candidate.evidence_start_line}-${candidate.evidence_end_line}`;
  const href =
    repoFullName && sourceSha
      ? githubBlobUrl(
          repoFullName,
          sourceSha,
          candidate.evidence_path,
          candidate.evidence_start_line,
          candidate.evidence_end_line
        )
      : null;

  const pct = Math.round(candidate.confidence * 100);
  const editing = draft !== null;

  return (
    <Card style={s.card(candidate.status)}>
      <div style={s.top}>
        <div style={s.ruleWrap}>
          {editing ? (
            <>
              <Textarea value={draft} onChange={setDraft} rows={3} />
              <div style={s.editRow}>
                <Button kind="ghost" size="sm" onClick={() => setDraft(null)}>
                  {t("cancel")}
                </Button>
                <Button
                  kind="primary"
                  size="sm"
                  onClick={() => {
                    const next = draft.trim();
                    if (next && next !== candidate.rule) onRule(next);
                    setDraft(null);
                  }}
                >
                  {t("save")}
                </Button>
              </div>
            </>
          ) : (
            <p style={s.rule}>{candidate.rule}</p>
          )}

          <div style={s.meta}>
            <Chip>{candidate.category}</Chip>
            {!editing && (
              <Button kind="ghost" size="sm" icon="Edit" onClick={() => setDraft(candidate.rule)}>
                {t("edit")}
              </Button>
            )}
            {candidate.status === "accepted" && (
              <Checkbox checked={selected} onChange={onSelect} label={t("selectForSkill")} />
            )}
          </div>
          {saveError && <span style={s.error}>{t("saveFailed")}</span>}
        </div>

        <div style={s.actions}>
          {candidate.status === "pending" ? (
            <>
              <Button kind="primary" size="sm" icon="Check" onClick={() => onDecide("accepted")}>
                {t("accept")}
              </Button>
              <Button kind="ghost" size="sm" icon="X" onClick={() => onDecide("rejected")}>
                {t("reject")}
              </Button>
            </>
          ) : (
            <>
              <Chip icon={candidate.status === "accepted" ? "Check" : "X"}>
                {candidate.status === "accepted" ? t("accepted") : t("rejected")}
              </Chip>
              <Button kind="ghost" size="sm" onClick={() => onDecide("pending")}>
                {t("undo")}
              </Button>
            </>
          )}
        </div>
      </div>

      <div style={s.evidence}>
        <div style={s.evidenceHead}>
          {href ? (
            <MonoLink href={href}>{where}</MonoLink>
          ) : (
            <span className="mono" title={t("evidenceUnlinkable")} style={s.confidencePct}>
              {where}
            </span>
          )}
        </div>
        <pre className="mono" style={s.snippet}>
          {candidate.evidence_snippet}
        </pre>
      </div>

      <div style={s.confidenceRow}>
        <span style={s.confidenceLabel}>{t("confidence")}</span>
        <div style={s.confidenceBar}>
          <ProgressBar value={pct} />
        </div>
        <span style={s.confidencePct}>{t("confidencePct", { pct })}</span>
      </div>
    </Card>
  );
}
