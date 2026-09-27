"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, FormField, Modal, SelectInput, TextInput, Textarea } from "@devdigest/ui";
import { SkillName, SkillType, type Skill } from "@devdigest/shared";
import { useCreateSkill } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { s } from "./styles";

export interface CreateSkillModalProps {
  onClose: () => void;
  onCreated: (skill: Skill) => void;
}

export function CreateSkillModal({ onClose, onCreated }: CreateSkillModalProps) {
  const t = useTranslations("skills");
  const toast = useToast();
  const create = useCreateSkill();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<SkillType>("custom");
  const [body, setBody] = React.useState("");

  const nameValid = SkillName.safeParse(name).success;
  const canSubmit = nameValid && description.trim().length > 0 && body.trim().length > 0;

  const typeOptions = SkillType.options.map((value) => ({
    value,
    label: t(`listItem.type.${value}`),
  }));

  return (
    <Modal
      width={640}
      title={t("create.title")}
      subtitle={t("create.subtitle")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <Button kind="ghost" onClick={onClose}>
            {t("create.cancel")}
          </Button>
          <Button
            kind="primary"
            icon="Plus"
            loading={create.isPending}
            disabled={!canSubmit || create.isPending}
            onClick={() =>
              create.mutate(
                { name, description, type, body, source: "manual", enabled: true },
                {
                  onSuccess: (skill) => {
                    toast.success(t("create.createdToast", { name: skill.name }));
                    onCreated(skill);
                  },
                }
              )
            }
          >
            {create.isPending ? t("create.saving") : t("create.save")}
          </Button>
        </div>
      }
    >
      <div style={s.body}>
        <FormField
          label={t("create.name")}
          required
          hint={name.length === 0 || nameValid ? t("create.nameHint") : t("create.nameInvalid")}
        >
          <TextInput
            value={name}
            onChange={setName}
            placeholder={t("create.namePlaceholder")}
            mono
          />
        </FormField>

        <FormField label={t("create.description")} required hint={t("create.descriptionHint")}>
          <TextInput
            value={description}
            onChange={setDescription}
            placeholder={t("create.descriptionPlaceholder")}
          />
        </FormField>

        <FormField label={t("create.type")}>
          <SelectInput
            value={type}
            onChange={(v) => setType(v as SkillType)}
            options={typeOptions}
          />
        </FormField>

        <FormField label={t("create.body")} required hint={t("create.bodyHint")}>
          <Textarea
            value={body}
            onChange={setBody}
            rows={10}
            mono
            placeholder={t("create.bodyPlaceholder")}
          />
        </FormField>
      </div>
    </Modal>
  );
}
