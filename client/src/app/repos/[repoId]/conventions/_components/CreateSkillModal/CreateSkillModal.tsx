"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  FormField,
  Icon,
  Modal,
  SelectInput,
  Skeleton,
  TextInput,
  Toggle,
} from "@devdigest/ui";
import { SKILL_NAME_RE, type SkillType } from "@devdigest/shared";
import { useCreateSkillFromConventions, useSkillProposal } from "@/lib/hooks/conventions";
import { SkillBodyEditor } from "../SkillBodyEditor";
import { s } from "./styles";
import { useToast } from "@/lib/toast";

const TYPES: SkillType[] = ["convention", "rubric", "security", "custom"];

export interface CreateSkillModalProps {
  repoId: string;
  repoFullName: string;
  conventionIds: string[];
  onClose: () => void;
  onCreated: () => void;
}

export function CreateSkillModal({
  repoId,
  repoFullName,
  conventionIds,
  onClose,
  onCreated,
}: CreateSkillModalProps) {
  const t = useTranslations("conventions.modal");
  const toast = useToast();
  const proposal = useSkillProposal(repoId);
  const create = useCreateSkillFromConventions(repoId);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [body, setBody] = React.useState("");
  const [type, setType] = React.useState<SkillType>("convention");
  const [enabled, setEnabled] = React.useState(true);
  const [ready, setReady] = React.useState(false);

  const load = proposal.mutate;
  React.useEffect(() => {
    load(
      { conventionIds },
      {
        onSuccess: (data) => {
          setName(data.name);
          setDescription(data.description);
          setBody(data.body);
          setReady(true);
        },
      }
    );
  }, [load, conventionIds]);

  const nameValid = SKILL_NAME_RE.test(name);

  if (proposal.isError) {
    return (
      <Modal title={t("title")} onClose={onClose}>
        <p>{t("failed")}</p>
      </Modal>
    );
  }

  return (
    <Modal
      width={760}
      title={t("title")}
      subtitle={<span className="mono">{name}</span>}
      onClose={onClose}
      footer={
        <>
          <span style={s.footerNote}>
            <Icon.GitCommit size={13} />
            {t.rich("footerNote", {
              v: (chunks) => <span className="mono">{chunks}</span>,
            })}
          </span>
          <Button kind="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            kind="primary"
            icon="Sparkles"
            loading={create.isPending}
            disabled={!ready || !nameValid || body.trim().length === 0}
            onClick={() =>
              create.mutate(
                { conventionIds, name, description, type, enabled, body },
                {
                  onSuccess: (skill) => {
                    toast.success(t("createdToast", { name: skill.name }));
                    onCreated();
                  },
                  onError: () => toast.error(t("failed")),
                }
              )
            }
          >
            {create.isPending ? t("saving") : t("save")}
          </Button>
        </>
      }
    >
      {!ready ? (
        <Skeleton height={320} />
      ) : (
        <>
          <div style={s.banner}>
            <Icon.Wrench size={15} style={s.bannerIcon} />
            <span style={s.bannerText}>
              {t.rich("subtitle", {
                count: conventionIds.length,
                repo: repoFullName,
                b: (chunks) => <b style={s.bannerStrong}>{chunks}</b>,
                repoName: (chunks) => <span className="mono" style={s.bannerRepo}>{chunks}</span>,
              })}
            </span>
          </div>

          <FormField label={t("nameLabel")} required hint={nameValid ? t("nameHint") : t("nameInvalid")}>
            <TextInput value={name} onChange={setName} placeholder={t("namePlaceholder")} mono />
          </FormField>

          <FormField label={t("descriptionLabel")}>
            <TextInput value={description} onChange={setDescription} />
          </FormField>

          <div style={{ display: "flex", gap: 14 }}>
            <div style={{ flex: 1 }}>
              <FormField label={t("typeLabel")}>
                <SelectInput
                  value={type}
                  onChange={(v) => setType(v as SkillType)}
                  options={[...TYPES]}
                />
              </FormField>
            </div>
            <div style={{ flex: 1 }}>
              <FormField label={t("enabledLabel")} hint={t("enabledHint")}>
                <div style={{ display: "flex", alignItems: "center", height: 36 }}>
                  <Toggle on={enabled} onChange={setEnabled} size={17} label={t("enabledLabel")} />
                </div>
              </FormField>
            </div>
          </div>

          <FormField label={t("bodyLabel")} required hint={t("bodyHint")}>
            <SkillBodyEditor
              value={body}
              onChange={setBody}
              filename={`${name || "skill"}.md`}
            />
          </FormField>
        </>
      )}
    </Modal>
  );
}
