"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { EmptyState, ErrorState, Skeleton } from "@devdigest/ui";
import { AppShell } from "@/components/app-shell";
import { ApiError } from "@/lib/api";
import { useSkill } from "@/lib/hooks/skills";
import { SkillForm } from "./_components/SkillForm";
import { s } from "./styles";

export function SkillEditor({ skillId }: { skillId: string }) {
  const t = useTranslations("skills");
  const router = useRouter();
  const { data: skill, isLoading, isError, error, refetch } = useSkill(skillId);

  const crumb = [
    { label: t("page.crumbLab") },
    { label: t("page.crumbSkills"), href: "/skills" },
    { label: skill?.name ?? t("detail.crumbSkill") },
  ];

  const notFound = isError && error instanceof ApiError && error.status === 404;

  return (
    <AppShell crumb={crumb}>
      <div style={s.page}>
        <button type="button" style={s.back} onClick={() => router.push("/skills")}>
          {t("detail.back")}
        </button>

        {isLoading && (
          <div style={s.loading}>
            <Skeleton height={24} width={240} />
            <Skeleton height={200} />
          </div>
        )}

        {notFound && (
          <EmptyState
            icon="Sparkles"
            title={t("detail.notFound.title")}
            body={t("detail.notFound.body")}
          />
        )}

        {isError && !notFound && (
          <ErrorState
            body={error instanceof ApiError ? error.message : t("detail.loadError")}
            onRetry={() => refetch()}
          />
        )}

        {skill && <SkillForm key={skill.id} skill={skill} />}
      </div>
    </AppShell>
  );
}
