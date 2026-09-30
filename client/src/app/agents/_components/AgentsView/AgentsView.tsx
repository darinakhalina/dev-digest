"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge, Button, Dropdown, EmptyState, ErrorState } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import {
  DetailPane,
  DetailPlaceholder,
  DetailSkeleton,
  Rail,
  RailLayout,
  RailListSkeleton,
} from "@/components/rail-layout";
import { useAgents, useUpdateAgent } from "@/lib/hooks/agents";
import { AgentRailCard } from "../AgentRailCard";
import { AgentEditor } from "../AgentEditor";
import { TABS } from "../AgentEditor/constants";
import { CreateAgentModal } from "../CreateAgentModal";
import { DeleteAgentModal } from "../DeleteAgentModal";
import { DEFAULT_TAB } from "./constants";
import { filterAgents } from "./helpers";

const VALID_TABS = TABS.map((tb) => tb.key);

export function AgentsView({ selectedId }: { selectedId?: string }) {
  const t = useTranslations("agents");
  const router = useRouter();
  const search = useSearchParams();

  const { data: agents, isLoading, isError, refetch } = useAgents();
  const update = useUpdateAgent();

  const [createOpen, setCreateOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const requested = search.get("tab") ?? "";
  const tab = VALID_TABS.includes(requested) ? requested : DEFAULT_TAB;

  const list = filterAgents(agents ?? [], query);
  const agent = (agents ?? []).find((a) => a.id === selectedId) ?? null;
  const doomed = (agents ?? []).find((a) => a.id === pendingDelete) ?? null;

  const select = (id: string) => router.push(`/agents/${id}?tab=${tab}`);
  const setTab = (next: string) => {
    if (!selectedId) return;
    router.replace(`/agents/${selectedId}?tab=${next}`);
  };

  const crumb = [
    { label: t("list.breadcrumbLab") },
    { label: t("list.breadcrumb"), href: "/agents" },
    ...(agent ? [{ label: agent.name }] : []),
  ];

  return (
    <AppShell crumb={crumb}>
      {createOpen && (
        <CreateAgentModal
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false);
            router.push(`/agents/${created.id}?tab=${DEFAULT_TAB}`);
          }}
        />
      )}

      {doomed && (
        <DeleteAgentModal
          agent={doomed}
          onClose={() => setPendingDelete(null)}
          onDeleted={() => {
            setPendingDelete(null);
            if (doomed.id === selectedId) router.push("/agents");
          }}
        />
      )}

      <RailLayout>
        <Rail
          title={t("list.title")}
          search={query}
          onSearch={setQuery}
          searchPlaceholder={t("list.searchPlaceholder")}
          action={
            <Dropdown
              width={220}
              align="right"
              trigger={
                <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
                  {t("list.addAgent")}
                </Button>
              }
              items={[
                {
                  label: t("list.createFromScratch"),
                  icon: "Edit",
                  onClick: () => setCreateOpen(true),
                },
              ]}
            />
          }
        >
          {isLoading && <RailListSkeleton />}
          {isError && <ErrorState body={t("list.loadError")} onRetry={() => refetch()} />}
          {!isLoading && !isError && list.length === 0 && (
            <EmptyState
              icon="Cpu"
              title={t("list.emptyTitle")}
              body={t("list.emptyBody")}
              cta={t("list.emptyCta")}
              onCta={() => setCreateOpen(true)}
            />
          )}
          {list.map((a) => (
            <AgentRailCard
              key={a.id}
              agent={a}
              active={a.id === selectedId}
              onSelect={() => select(a.id)}
              onToggle={(enabled) => update.mutate({ id: a.id, patch: { enabled } })}
              onDelete={() => setPendingDelete(a.id)}
            />
          ))}
        </Rail>

        {!selectedId ? (
          <DetailPlaceholder>
            <EmptyState
              icon="Cpu"
              title={t("list.selectPrompt.title")}
              body={t("list.selectPrompt.body")}
            />
          </DetailPlaceholder>
        ) : isLoading ? (
          <DetailSkeleton />
        ) : !agent ? (
          <DetailPlaceholder>
            <ErrorState body={t("list.loadError")} onRetry={() => refetch()} />
          </DetailPlaceholder>
        ) : (
          <DetailPane
            icon="Cpu"
            title={agent.name}
            badges={
              <>
                <Badge color="var(--text-secondary)" mono>
                  {agent.provider}/{agent.model}
                </Badge>
                {!agent.enabled && <Badge color="var(--text-muted)">{t("editor.disabled")}</Badge>}
              </>
            }
            action={
              <Button
                kind="secondary"
                size="sm"
                icon="GitPullRequest"
                onClick={() => router.push("/")}
              >
                {t("editor.runOnPr")}
              </Button>
            }
          >
            <AgentEditor agent={agent} tab={tab} onTab={setTab} />
          </DetailPane>
        )}
      </RailLayout>
    </AppShell>
  );
}
