"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Badge,
  Button,
  Dropdown,
  EmptyState,
  ErrorState,
  Icon,
  Skeleton,
} from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { useSkills, useUpdateSkill } from "@/lib/hooks/skills";
import { CreateSkillModal } from "../CreateSkillModal";
import { DeleteSkillModal } from "../DeleteSkillModal";
import { ImportDrawer } from "../ImportDrawer";
import { SkillRailCard } from "../SkillRailCard";
import { SkillEditor } from "../SkillEditor";
import { DEFAULT_TAB, VALID_TABS } from "./constants";
import { filterSkills } from "./helpers";
import { s } from "./styles";

export function SkillsView({ selectedId }: { selectedId?: string }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const search = useSearchParams();

  const { data: skills, isLoading, isError, refetch } = useSkills();
  const update = useUpdateSkill();

  const [importOpen, setImportOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [pendingDelete, setPendingDelete] = React.useState<string | null>(null);
  const [query, setQuery] = React.useState("");

  const requested = search.get("tab") ?? "";
  const tab = (VALID_TABS as readonly string[]).includes(requested) ? requested : DEFAULT_TAB;

  const list = filterSkills(skills ?? [], query);
  const skill = (skills ?? []).find((sk) => sk.id === selectedId) ?? null;
  const doomed = (skills ?? []).find((sk) => sk.id === pendingDelete) ?? null;

  const select = (id: string) => router.push(`/skills/${id}?tab=${tab}`);
  const setTab = (next: string) => {
    if (!selectedId) return;
    router.replace(`/skills/${selectedId}?tab=${next}`);
  };

  const crumb = [
    { label: t("page.crumbLab") },
    { label: t("page.crumbSkills"), href: "/skills" },
    ...(skill ? [{ label: skill.name, mono: true }] : []),
  ];

  return (
    <AppShell crumb={crumb}>
      {importOpen && <ImportDrawer onClose={() => setImportOpen(false)} />}

      {createOpen && (
        <CreateSkillModal
          onClose={() => setCreateOpen(false)}
          onCreated={(created) => {
            setCreateOpen(false);
            router.push(`/skills/${created.id}?tab=config`);
          }}
        />
      )}

      {doomed && (
        <DeleteSkillModal
          skill={doomed}
          onClose={() => setPendingDelete(null)}
          onDeleted={() => {
            setPendingDelete(null);
            if (doomed.id === selectedId) router.push("/skills");
          }}
        />
      )}

      <div style={s.split}>
        <div style={s.rail}>
          <div style={s.railHead}>
            <div style={s.railTitleRow}>
              <h1 style={s.railTitle}>{t("page.heading")}</h1>
              <Dropdown
                width={220}
                align="right"
                trigger={
                  <Button kind="primary" size="sm" icon="Plus" iconRight="ChevronDown">
                    {t("page.addSkill")}
                  </Button>
                }
                items={[
                  {
                    label: t("page.menu.create"),
                    icon: "Edit",
                    onClick: () => setCreateOpen(true),
                  },
                  {
                    label: t("page.menu.fromFile"),
                    icon: "Upload",
                    onClick: () => setImportOpen(true),
                  },
                ]}
              />
            </div>
            <div style={s.search}>
              <Icon.Search size={13} style={s.searchIcon} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("page.searchPlaceholder")}
                aria-label={t("page.searchPlaceholder")}
                style={s.searchInput}
              />
            </div>
          </div>

          <div style={s.railList}>
            {isLoading && (
              <div style={s.railSkeleton}>
                <Skeleton height={104} />
                <Skeleton height={104} />
                <Skeleton height={104} />
              </div>
            )}
            {isError && <ErrorState body={t("page.loadError")} onRetry={() => refetch()} />}
            {!isLoading && !isError && list.length === 0 && (
              <EmptyState icon="Sparkles" title={t("page.empty.title")} body={t("page.empty.body")} />
            )}
            {list.map((sk) => (
              <SkillRailCard
                key={sk.id}
                skill={sk}
                active={sk.id === selectedId}
                onSelect={() => select(sk.id)}
                onToggle={(enabled) => update.mutate({ id: sk.id, patch: { enabled } })}
                onDelete={() => setPendingDelete(sk.id)}
              />
            ))}
          </div>
        </div>

        {!selectedId ? (
          <div style={s.placeholder}>
            <EmptyState
              icon="Sparkles"
              title={t("page.selectPrompt.title")}
              body={t("page.selectPrompt.body")}
            />
          </div>
        ) : isLoading || !skill ? (
          <div style={s.editorSkeleton}>
            <Skeleton height={24} width={240} />
            <Skeleton height={200} />
          </div>
        ) : (
          <div style={s.editorPane}>
            <div style={s.editorHead}>
              <Icon.Sparkles size={18} style={s.editorIcon} />
              <h1 className="mono" style={s.editorTitle}>
                {skill.name}
              </h1>
              <Badge color="var(--text-muted)" mono>
                v{skill.version}
              </Badge>
              <span style={s.headSpacer} />
            </div>
            <SkillEditor skill={skill} tab={tab} onTab={setTab} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
