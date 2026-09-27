"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField } from "@devdigest/ui";
import type { Skill, SkillImportPreview } from "@devdigest/shared";
import { useCreateSkill, useImportSkillPreview } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { ACCEPTED_EXTENSIONS, isAcceptedSkillFile, readFileAsBase64 } from "../../helpers";
import { ImportPreview } from "../ImportPreview";
import { s } from "./styles";

export function FileTab({ onCreated }: { onCreated: (skill: Skill) => void }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const preview = useImportSkillPreview();
  const create = useCreateSkill();

  const [proposal, setProposal] = React.useState<SkillImportPreview | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProposal(null);
    setError(null);

    if (!isAcceptedSkillFile(file.name)) {
      setError(t("file.unsupported"));
      return;
    }

    try {
      const content_base64 = await readFileAsBase64(file);
      setProposal(await preview.mutateAsync({ filename: file.name, content_base64 }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("drawer.importFailed"));
    }
  };

  const confirm = () => {
    if (!proposal) return;
    create.mutate(
      {
        name: proposal.name,
        description: proposal.description,
        type: proposal.type,
        source: proposal.source,
        body: proposal.body,
        enabled: false,
      },
      {
        onSuccess: (skill) => {
          toast.success(t("file.success", { name: skill.name }));
          onCreated(skill);
        },
        onError: (err) => setError(err instanceof Error ? err.message : t("drawer.importFailed")),
      }
    );
  };

  return (
    <div style={s.wrap}>
      <FormField label={t("file.fileLabel")} hint={t("file.fileHint")}>
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={onPick}
          style={s.fileInput}
        />
      </FormField>

      {preview.isPending && <p style={s.muted}>{t("file.reading")}</p>}
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
          {create.isPending ? t("file.importing") : t("file.confirm")}
        </Button>
      </div>
    </div>
  );
}
