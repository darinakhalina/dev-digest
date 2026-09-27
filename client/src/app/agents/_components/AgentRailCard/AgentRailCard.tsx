"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@devdigest/ui";
import type { Agent } from "@devdigest/shared";
import { RailCard } from "@/components/rail-card";

export interface AgentRailCardProps {
  agent: Agent;
  active: boolean;
  onSelect: () => void;
  onToggle: (enabled: boolean) => void;
  onDelete: () => void;
}

export function AgentRailCard({
  agent,
  active,
  onSelect,
  onToggle,
  onDelete,
}: AgentRailCardProps) {
  const t = useTranslations("agents");

  return (
    <RailCard
      icon="Cpu"
      name={agent.name}
      description={agent.description || t("card.noDescription")}
      active={active}
      enabled={agent.enabled}
      onSelect={onSelect}
      onToggle={onToggle}
      toggleLabel={t("card.toggleLabel", { name: agent.name })}
      onDelete={onDelete}
      deleteLabel={t("remove.label", { name: agent.name })}
      badges={
        <>
          <Badge color="var(--text-secondary)" mono>
            {agent.model}
          </Badge>
          <Badge color="var(--text-muted)">{agent.provider}</Badge>
        </>
      }
      footer={t("card.skillCount", { count: agent.skill_count ?? 0 })}
    />
  );
}
