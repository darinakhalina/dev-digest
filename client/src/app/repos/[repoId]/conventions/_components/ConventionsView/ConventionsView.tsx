"use client";

import React from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, EmptyState, ErrorState, Icon, Skeleton } from "@devdigest/ui";
import type { ConventionStatus } from "@devdigest/shared";
import { AppShell } from "@/components/app-shell";
import { useActiveRepo } from "@/lib/repo-context";
import { useConventions, useExtractConventions, useUpdateConvention } from "@/lib/hooks/conventions";
import { ConventionCard } from "../ConventionCard";
import { CreateSkillModal } from "../CreateSkillModal";
import { s } from "./styles";

export function ConventionsView() {
  const t = useTranslations("conventions.page");
  const format = useFormatter();
  const { repoId, activeRepo } = useActiveRepo();

  const { data, isLoading, isError, refetch } = useConventions(repoId);
  const extract = useExtractConventions(repoId ?? "");
  const update = useUpdateConvention(repoId ?? "");

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [failedId, setFailedId] = React.useState<string | null>(null);

  const scan = data?.scan ?? null;
  const candidates = data?.candidates ?? [];
  const accepted = candidates.filter((c) => c.status === "accepted");
  const selectedIds = accepted.filter((c) => selected.has(c.id)).map((c) => c.id);

  const repoName = activeRepo?.full_name ?? t("repoFallback");

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const decide = (id: string, status: ConventionStatus) => {
    setFailedId(null);
    if (status !== "accepted") toggle(id, false);
    update.mutate({ id, status }, { onError: () => setFailedId(id) });
  };

  const reword = (id: string, rule: string) => {
    setFailedId(null);
    update.mutate({ id, rule }, { onError: () => setFailedId(id) });
  };

  const runExtraction = (confirmFirst: boolean) => {
    if (confirmFirst && !window.confirm(t("rescanWarning"))) return;
    setSelected(new Set());
    extract.mutate();
  };

  return (
    <AppShell crumb={[{ label: t("crumbLab") }, { label: t("crumbConventions") }]}>
      {modalOpen && repoId && (
        <CreateSkillModal
          repoId={repoId}
          repoFullName={repoName}
          conventionIds={selectedIds}
          onClose={() => setModalOpen(false)}
          onCreated={() => {
            setModalOpen(false);
            setSelected(new Set());
          }}
        />
      )}

      <div style={s.page}>
        <div style={s.header}>
          <div style={s.headerText}>
            <h1 style={s.h1}>
              {t("headingPrefix")}
              <span className="mono" style={s.repo}>
                {repoName}
              </span>
            </h1>
            <p style={s.subtitle}>
              {scan
                ? t("subtitleScanned", {
                    sampleCount: scan.sample_file_count,
                    when: format.relativeTime(new Date(scan.created_at)),
                  })
                : t("subtitleNone")}
            </p>
            {scan && (scan.discarded_count > 0 || !scan.indexed) && (
              <div style={s.notices}>
                {scan.discarded_count > 0 && (
                  <span style={s.notice}>
                    <Icon.Info size={13} />
                    {t("discarded", { count: scan.discarded_count })}
                  </span>
                )}
                {!scan.indexed && (
                  <span style={s.notice}>
                    <Icon.AlertTriangle size={13} />
                    {t("notIndexed")}
                  </span>
                )}
              </div>
            )}
          </div>

          {scan && (
            <div style={s.headerActions}>
              <Button
                kind="secondary"
                icon="RefreshCw"
                loading={extract.isPending}
                onClick={() => runExtraction(candidates.length > 0)}
              >
                {extract.isPending ? t("scanning") : t("rescan")}
              </Button>
            </div>
          )}
        </div>

        {extract.isError && <ErrorState body={t("extractionFailed")} onRetry={() => extract.mutate()} />}

        {isLoading && (
          <div style={s.list}>
            <Skeleton height={180} />
            <Skeleton height={180} />
          </div>
        )}

        {isError && <ErrorState body={t("loadError")} onRetry={() => refetch()} />}

        {!isLoading && !isError && !scan && (
          <EmptyState
            icon="ListChecks"
            title={t("empty.title")}
            body={t("empty.body")}
            cta={extract.isPending ? t("scanning") : t("empty.cta")}
            ctaLoading={extract.isPending}
            onCta={() => runExtraction(false)}
          />
        )}

        {!isLoading && !isError && scan && candidates.length === 0 && (
          <EmptyState
            icon="ListChecks"
            title={t("noneSurvived.title")}
            body={t("noneSurvived.body")}
          />
        )}

        {candidates.length > 0 && (
          <>
            <div style={s.toolbar}>
              <span style={s.count}>
                {t("selectedCount", { selected: selectedIds.length, total: accepted.length })}
              </span>
              {accepted.length > 0 && (
                <Button
                  kind="ghost"
                  size="sm"
                  onClick={() =>
                    setSelected(
                      selectedIds.length === accepted.length
                        ? new Set()
                        : new Set(accepted.map((c) => c.id))
                    )
                  }
                >
                  {selectedIds.length === accepted.length ? t("deselectAll") : t("selectAll")}
                </Button>
              )}
              <span style={s.spacer} />
              <Button
                kind="primary"
                icon="Sparkles"
                disabled={selectedIds.length === 0}
                onClick={() => setModalOpen(true)}
              >
                {t("createSkill")}
              </Button>
            </div>

            <div style={s.list}>
              {candidates.map((candidate) => (
                <ConventionCard
                  key={candidate.id}
                  candidate={candidate}
                  repoFullName={activeRepo?.full_name ?? null}
                  sourceSha={scan?.source_sha ?? null}
                  selected={selected.has(candidate.id)}
                  saveError={failedId === candidate.id}
                  onSelect={(on) => toggle(candidate.id, on)}
                  onDecide={(status) => decide(candidate.id, status)}
                  onRule={(rule) => reword(candidate.id, rule)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
