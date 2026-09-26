"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Button, FormField, SelectInput, TextInput, Textarea, Toggle } from "@devdigest/ui";
import { SkillType, type Skill } from "@devdigest/shared";
import { useUpdateSkill } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { s } from "./styles";

export function SkillForm({ skill }: { skill: Skill }) {
  const t = useTranslations("skills");
  const toast = useToast();
  const update = useUpdateSkill();

  const [name, setName] = React.useState(skill.name);
  const [description, setDescription] = React.useState(skill.description);
  const [type, setType] = React.useState<SkillType>(skill.type);
  const [body, setBody] = React.useState(skill.body);

  const untrusted = skill.source !== "manual";
  const typeOptions = SkillType.options.map((value) => ({
    value,
    label: t(`listItem.type.${value}`),
  }));

  const save = () =>
    update.mutate(
      { id: skill.id, patch: { name, description, type, body } },
      { onSuccess: () => toast.success(t("editor.savedToast")) },
    );

  return (
    <div>
      <div style={s.header}>
        <h2 style={s.h2}>{t("editor.title")}</h2>
        {untrusted && (
          <Badge color="var(--warn)" bg="var(--warn-bg)" icon="AlertTriangle">
            {t("preview.untrustedBadge")}
          </Badge>
        )}
        <label style={s.enabledLabel}>
          {t("editor.enabled")}
          <Toggle
            on={skill.enabled}
            onChange={(enabled) => update.mutate({ id: skill.id, patch: { enabled } })}
            size={16}
            label={t("listItem.toggleLabel", { name: skill.name })}
          />
        </label>
      </div>

      {untrusted && <p style={s.notice}>{t("preview.untrustedNotice")}</p>}

      <FormField label={t("editor.name")} required>
        <TextInput value={name} onChange={setName} />
      </FormField>

      <FormField label={t("editor.description")} hint={t("editor.descriptionCaption")}>
        <TextInput value={description} onChange={setDescription} />
      </FormField>

      <FormField label={t("editor.type")}>
        <SelectInput value={type} onChange={(v) => setType(v as SkillType)} options={typeOptions} />
      </FormField>

      <FormField label={t("editor.body")} hint={t("editor.bodyHint")}>
        <Textarea value={body} onChange={setBody} rows={14} mono />
      </FormField>

      <div style={s.actions}>
        <Button kind="primary" icon="Check" onClick={save} disabled={update.isPending}>
          {update.isPending ? t("editor.saving") : t("editor.save")}
        </Button>
      </div>
    </div>
  );
}
