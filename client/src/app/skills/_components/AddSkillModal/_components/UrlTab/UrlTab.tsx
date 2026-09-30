"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, TextInput } from "@devdigest/ui";
import type { Skill, SkillImportPreview } from "@devdigest/shared";
import { useCreateSkill, useImportSkillFromUrl } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { ImportPreview } from "../ImportPreview";
import { s } from "./styles";

export function UrlTab({ onCreated }: { onCreated: (skill: Skill) => void }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const fetchUrl = useImportSkillFromUrl();
  const create = useCreateSkill();

  const [url, setUrl] = React.useState("");
  const [proposal, setProposal] = React.useState<SkillImportPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onFetch = async () => {
    setProposal(null);
    setError(null);
    try {
      setProposal(await fetchUrl.mutateAsync(url.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("url.failed"));
    }
  };

  const confirm = () => {
    if (!proposal) return;
    create.mutate(
      {
        name: proposal.name,
        description: proposal.description,
        type: proposal.type,
        source: "imported_url",
        body: proposal.body,
        enabled: false,
      },
      {
        onSuccess: (skill) => {
          toast.success(t("url.success", { name: skill.name }));
          onCreated(skill);
        },
        onError: (err) => setError(err instanceof Error ? err.message : t("url.failed")),
      }
    );
  };

  return (
    <div style={s.wrap}>
      <FormField label={t("url.label")} required hint={t("url.hint")}>
        <div style={s.urlRow}>
          <TextInput value={url} onChange={setUrl} placeholder={t("url.placeholder")} mono />
          <Button
            kind="secondary"
            icon="Link"
            loading={fetchUrl.isPending}
            disabled={url.trim().length === 0 || fetchUrl.isPending}
            onClick={onFetch}
          >
            {fetchUrl.isPending ? t("url.fetching") : t("url.fetch")}
          </Button>
        </div>
      </FormField>

      {error && (
        <p role="alert" style={s.error}>
          {error}
        </p>
      )}

      {proposal && <ImportPreview proposal={proposal} />}

      <div style={s.actions}>
        <Button
          kind="primary"
          icon="Check"
          loading={create.isPending}
          disabled={!proposal || create.isPending}
          onClick={confirm}
        >
          {create.isPending ? t("url.importing") : t("url.confirm")}
        </Button>
      </div>
    </div>
  );
}
