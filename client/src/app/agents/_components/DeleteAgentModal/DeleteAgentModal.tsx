"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@devdigest/ui";
import type { Agent } from "@devdigest/shared";
import { useDeleteAgent } from "@/lib/hooks/agents";
import { useToast } from "@/lib/toast";
import { s } from "./styles";

export interface DeleteAgentModalProps {
  agent: Agent;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteAgentModal({ agent, onClose, onDeleted }: DeleteAgentModalProps) {
  const t = useTranslations("agents");
  const toast = useToast();
  const remove = useDeleteAgent();

  const attached = agent.skill_count ?? 0;

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
              remove.mutate(agent.id, {
                onSuccess: () => {
                  toast.success(t("remove.deletedToast", { name: agent.name }));
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
          name: () => <span style={s.name}>{agent.name}</span>,
        })}
        {attached > 0 && <> {t("remove.attached", { count: attached })}</>}
      </div>
    </Modal>
  );
}
