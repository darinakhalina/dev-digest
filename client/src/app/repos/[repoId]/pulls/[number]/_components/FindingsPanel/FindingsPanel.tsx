/* FindingsPanel — hide-low-confidence + j/k navigation + FindingCard list,
   wiring the accept/dismiss action hook (A2). */
"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Toggle, EmptyState, SeverityBadge, SEV } from "@devdigest/ui";
import type { FindingRecord } from "@devdigest/shared";
import { FindingCard } from "../FindingCard";
import { useFindingAction } from "../../../../../../../lib/hooks/reviews";
import { KEY_TO_ACTION } from "./constants";
import { SEVERITIES, countsBySeverity } from "@/lib/severity";
import { visibleFindings } from "./helpers";
import { s } from "./styles";
import { hasModifier, isTextInput } from "@/lib/keyboard";

export function FindingsPanel({
  findings,
  prId,
  repoFullName,
  headSha,
}: {
  findings: FindingRecord[];
  prId: string;
  repoFullName?: string | null;
  headSha?: string | null;
}) {
  const t = useTranslations("prReview");
  const action = useFindingAction();
  const [hideLow, setHideLow] = React.useState(false);
  const [focusIdx, setFocusIdx] = React.useState(0);
  const [severities, setSeverities] = React.useState<ReadonlySet<string>>(new Set());

  // Counted after the confidence control but before the severity one: a counter
  // has to match the list below it, and must not collapse to its own selection.
  const counts = React.useMemo(
    () => countsBySeverity(visibleFindings(findings, hideLow, new Set())),
    [findings, hideLow],
  );

  const shown = React.useMemo(
    () => visibleFindings(findings, hideLow, severities),
    [findings, hideLow, severities],
  );

  const toggleSeverity = React.useCallback((level: string) => {
    setSeverities((prev) => {
      const next = new Set(prev);
      if (next.has(level)) next.delete(level);
      else next.add(level);
      return next;
    });
  }, []);

  React.useEffect(() => {
    setSeverities(new Set());
  }, [prId]);

  const current = Math.min(focusIdx, Math.max(shown.length - 1, 0));

  const onListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (hasModifier(e) || isTextInput(e.target)) return;
    const act = KEY_TO_ACTION[e.key];
    if (e.key === "j") setFocusIdx(Math.min(current + 1, shown.length - 1));
    else if (e.key === "k") setFocusIdx(Math.max(current - 1, 0));
    else if (act && shown[current]) action.mutate({ findingId: shown[current]!.id, action: act, prId });
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div>
      <div style={s.toolbar}>
        <div style={s.counters} data-testid="severity-counters">
          {SEVERITIES.filter((lvl) => counts[lvl]! > 0).map((lvl) => (
            <SeverityBadge key={lvl} severity={lvl} count={counts[lvl]} />
          ))}
        </div>
        <div style={s.toggleGroup}>
          {t("panel.hideLowConfidence")}
          <Toggle on={hideLow} onChange={setHideLow} size={16} label={t("panel.hideLowConfidence")} />
        </div>
      </div>

      <div style={s.filterRow}>
        {SEVERITIES.filter((lvl) => counts[lvl]! > 0 || severities.has(lvl)).map((lvl) => {
          const active = severities.has(lvl);
          return (
            <button
              key={lvl}
              type="button"
              aria-pressed={active}
              onClick={() => toggleSeverity(lvl)}
              style={s.filterButton(active, SEV[lvl].c, false)}
            >
              {SEV[lvl].label}
            </button>
          );
        })}
      </div>


      <div
        style={s.list}
        role="list"
        tabIndex={0}
        aria-label={t("panel.listLabel")}
        onKeyDown={onListKeyDown}
      >
        {shown.length === 0 ? (
          <EmptyState icon="Filter" title={t("panel.noMatchTitle")} body={t("panel.noMatchBody")} />
        ) : (
          shown.map((f, i) => (
            <FindingCard
              key={f.id}
              f={f}
              focused={i === current}
              onSelect={() => setFocusIdx(i)}
              defaultExpanded={i === 0}
              pending={action.isPending}
              repoFullName={repoFullName}
              headSha={headSha}
              onAction={(act) => action.mutate({ findingId: f.id, action: act, prId })}
            />
          ))
        )}
      </div>
    </div>
  );
}
