"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { useDeleteSkill } from "@/lib/hooks/skills";
import { useToast } from "@/lib/toast";
import { s } from "./styles";

export interface DeleteSkillModalProps {
  skill: Skill;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteSkillModal({ skill, onClose, onDeleted }: DeleteSkillModalProps) {
  const t = useTranslations("skills");
  const toast = useToast();
  const remove = useDeleteSkill();

  const attached = skill.agent_count ?? 0;

  return (
    <Modal
      width={440}
      title={t("remove.title")}
      onClose={onClose}
      footer={
        <div style={s.footer}>
          <Button kind="ghost" onClick={onClose}>
            {t("remove.cancel")}
          </Button>
          <Button
            kind="danger"
            icon="Trash"
            loading={remove.isPending}
            onClick={() =>
              remove.mutate(skill.id, {
                onSuccess: () => {
                  toast.success(t("remove.deletedToast", { name: skill.name }));
                  onDeleted();
                },
              })
            }
          >
            {remove.isPending ? t("remove.deleting") : t("remove.confirm")}
          </Button>
        </div>
      }
    >
      <div style={s.body}>
        {t.rich("remove.body", {
          name: () => <span className="mono" style={s.name}>{skill.name}</span>,
        })}
        {attached > 0 && <> {t("remove.attached", { count: attached })}</>}
      </div>
    </Modal>
  );
}
