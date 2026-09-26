"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Drawer, FormField } from "@devdigest/ui";
import type { SkillImportPreview } from "@devdigest/shared";
import { useCreateSkill, useImportSkillPreview } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { ACCEPTED_EXTENSIONS, isAcceptedSkillFile, readFileAsBase64 } from "./helpers";
import { s } from "./styles";

export function ImportDrawer({ onClose }: { onClose: () => void }) {
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
      const result = await preview.mutateAsync({ filename: file.name, content_base64 });
      setProposal(result);
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
          onClose();
        },
        onError: (err) => setError(err instanceof Error ? err.message : t("drawer.importFailed")),
      },
    );
  };

  return (
    <Drawer
      width={560}
      title={t("drawer.title")}
      subtitle={t("drawer.subtitle")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <Button kind="secondary" size="sm" onClick={onClose}>
            {t("file.cancel")}
          </Button>
          <Button
            kind="primary"
            size="sm"
            icon="Check"
            onClick={confirm}
            disabled={!proposal || create.isPending}
          >
            {create.isPending ? t("file.importing") : t("file.confirm")}
          </Button>
        </div>
      }
    >
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

        {proposal && (
          <div style={s.proposal}>
            <div>
              <div style={s.proposalTitle}>{t("file.proposalTitle")}</div>
              <p style={s.muted}>{t("file.nothingStored")}</p>
            </div>
            <div>
              <div style={s.label}>{t("file.proposedName")}</div>
              <div style={s.value}>{proposal.name}</div>
            </div>
            <div>
              <div style={s.label}>{t("file.proposedDescription")}</div>
              <div style={s.value}>{proposal.description || t("listItem.noDescription")}</div>
            </div>
            <div>
              <div style={s.label}>{t("file.proposedType")}</div>
              <div style={s.value}>{t(`listItem.type.${proposal.type}`)}</div>
            </div>
            <div>
              <div style={s.label}>{t("file.proposedBody")}</div>
              <pre className="mono" style={s.body}>
                {proposal.body}
              </pre>
            </div>
            {proposal.ignored_files.length > 0 && (
              <div>
                <div style={s.label}>
                  {t("file.ignoredTitle", { count: proposal.ignored_files.length })}
                </div>
                <p style={s.muted}>{t("file.ignoredHint")}</p>
                <ul style={s.ignoredList}>
                  {proposal.ignored_files.map((name) => (
                    <li key={name} className="mono">
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p style={s.notice}>{t("file.disabledNotice")}</p>
          </div>
        )}
      </div>
    </Drawer>
  );
}
