"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, IconBtn, MonoLink, ProgressBar, Textarea } from "@devdigest/ui";
import type { ConventionCandidate, ConventionStatus } from "@devdigest/shared";
import { githubBlobUrl } from "@/lib/github-urls";
import { CONFIDENCE_OK, s } from "./styles";

export interface ConventionCardProps {
  candidate: ConventionCandidate;
  repoFullName: string | null;
  sourceSha: string | null;
  onDecide: (status: ConventionStatus) => void;
  onRule: (rule: string) => void;
  saveError?: boolean;
}

export function ConventionCard({
  candidate,
  repoFullName,
  sourceSha,
  onDecide,
  onRule,
  saveError,
}: ConventionCardProps) {
  const t = useTranslations("conventions.card");
  const [draft, setDraft] = React.useState<string | null>(null);

  const where =
    candidate.evidence_start_line === candidate.evidence_end_line
      ? `${candidate.evidence_path}:${candidate.evidence_start_line}`
      : `${candidate.evidence_path}:${candidate.evidence_start_line}-${candidate.evidence_end_line}`;

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
  const accepted = candidate.status === "accepted";
  const rejected = candidate.status === "rejected";

  return (
    <div style={s.card(candidate.status)}>
      <div style={s.row}>
        <div style={s.main}>
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
            <div style={s.rule}>{candidate.rule}</div>
          )}

          <div style={s.evidence}>
            <div style={s.evidenceHead}>
              {href ? (
                <MonoLink href={href}>{where}</MonoLink>
              ) : (
                <span className="mono" style={s.evidencePlain} title={t("evidenceUnlinkable")}>
                  {where}
                </span>
              )}
              <IconBtn
                icon="Copy"
                label={t("copyPath")}
                size={24}
                onClick={() => void navigator.clipboard?.writeText(where)}
              />
            </div>
            <pre className="mono" style={s.snippet}>
              {candidate.evidence_snippet}
            </pre>
          </div>

          <div style={s.meta}>
            <span style={s.confidenceLabel}>{t("confidence")}</span>
            <div style={s.confidenceBar}>
              <ProgressBar
                value={pct}
                height={5}
                color={candidate.confidence >= CONFIDENCE_OK ? "var(--ok)" : "var(--warn)"}
              />
            </div>
            <span className="mono" style={s.confidencePct}>
              {t("confidencePct", { pct })}
            </span>
          </div>

          {saveError && <div style={s.error}>{t("saveFailed")}</div>}
        </div>

        <div style={s.actions}>
          {accepted ? (
            <Button
              kind="primary"
              size="sm"
              icon="Check"
              full
              onClick={() => onDecide("pending")}
            >
              {t("accepted")}
            </Button>
          ) : (
            <Button
              kind="secondary"
              size="sm"
              icon="Plus"
              full
              onClick={() => onDecide("accepted")}
            >
              {t("accept")}
            </Button>
          )}
          <Button
            kind={rejected ? "danger" : "ghost"}
            size="sm"
            icon="X"
            full
            onClick={() => onDecide(rejected ? "pending" : "rejected")}
          >
            {rejected ? t("rejected") : t("reject")}
          </Button>
          {!editing && (
            <Button
              kind="ghost"
              size="sm"
              icon="Edit"
              full
              onClick={() => setDraft(candidate.rule)}
            >
              {t("edit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
