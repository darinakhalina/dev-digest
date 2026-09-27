"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useRestoreSkillVersion, useSkillVersions } from "@/lib/hooks/skills";
import { collapseUnchanged, countChanges, diffLines } from "@/lib/diff";
import { useToast } from "@/lib/toast";
import { s } from "./styles";

export function VersionsTab({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const { data, isLoading, isError, refetch } = useSkillVersions(skill.id);
  const restore = useRestoreSkillVersion();
  const [selected, setSelected] = React.useState<number | null>(null);

  if (isLoading) return <Skeleton height={240} />;
  if (isError) return <ErrorState body={t("versions.loadError")} onRetry={() => refetch()} />;

  const versions = [...(data ?? [])].sort((a, b) => b.version - a.version);
  if (versions.length === 0) {
    return <EmptyState icon="History" title={t("versions.empty")} />;
  }

  const active = selected ?? versions[0]!.version;
  const chosenIndex = versions.findIndex((v) => v.version === active);
  const chosen = versions[chosenIndex]!;
  const previous = versions[chosenIndex + 1] ?? null;

  const rows = previous ? diffLines(previous.body, chosen.body) : [];
  const counts = countChanges(rows);
  const hunks = collapseUnchanged(rows);

  return (
    <div style={s.wrap}>
      <div style={s.head}>
        <h2 style={s.h2}>{t("versions.title")}</h2>
        <Badge color="var(--text-muted)">
          {t("versions.count", { count: versions.length })}
        </Badge>
      </div>
      <p style={s.hint}>{t("versions.hint")}</p>

      <div style={s.split}>
        <div style={s.list}>
          {versions.map((v) => (
            <button
              key={v.version}
              type="button"
              onClick={() => setSelected(v.version)}
              style={s.row(v.version === active)}
            >
              <div style={s.rowTop}>
                <span className="mono" style={s.rowVersion}>
                  v{v.version}
                </span>
                {v.version === skill.version && (
                  <Badge color="var(--ok)">{t("versions.current")}</Badge>
                )}
              </div>
              <div style={s.rowDate}>{new Date(v.created_at).toLocaleString()}</div>
            </button>
          ))}
        </div>

        <div style={s.diffPane}>
          <div style={s.diffHead}>
            <span className="mono" style={s.diffTitle}>
              {previous
                ? t("versions.comparing", { from: previous.version, to: chosen.version })
                : t("versions.firstVersion", { version: chosen.version })}
            </span>
            {previous && (
              <span style={s.counts}>
                <span style={s.added}>+{counts.added}</span>
                <span style={s.removed}>−{counts.removed}</span>
              </span>
            )}
            {chosen.version !== skill.version && (
              <Button
                kind="secondary"
                size="sm"
                icon="History"
                loading={restore.isPending}
                onClick={() => {
                  if (!window.confirm(t("versions.restoreConfirm", { version: chosen.version })))
                    return;
                  restore.mutate(
                    { id: skill.id, version: chosen.version },
                    {
                      onSuccess: (updated) => {
                        setSelected(null);
                        toast.success(
                          t("versions.restoredToast", {
                            version: chosen.version,
                            created: updated.version,
                          })
                        );
                      },
                    }
                  );
                }}
              >
                {t("versions.restore")}
              </Button>
            )}
          </div>

          <div style={s.diffBody}>
            {!previous ? (
              <pre className="mono" style={s.plain}>
                {chosen.body}
              </pre>
            ) : hunks.length === 0 ? (
              <div style={s.noChange}>{t("versions.noChange")}</div>
            ) : (
              hunks.map((hunk, hi) => (
                <div key={hi} style={s.hunk}>
                  {hunk.map((r, ri) => (
                    <div key={ri} style={s.line(r.kind)}>
                      <span className="mono" style={s.gutter}>
                        {r.oldLine ?? ""}
                      </span>
                      <span className="mono" style={s.gutter}>
                        {r.newLine ?? ""}
                      </span>
                      <span className="mono" style={s.sign}>
                        {r.kind === "added" ? "+" : r.kind === "removed" ? "−" : " "}
                      </span>
                      <span className="mono" style={s.text}>
                        {r.text || " "}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
