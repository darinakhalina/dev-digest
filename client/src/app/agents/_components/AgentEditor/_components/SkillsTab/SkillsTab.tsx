"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, IconBtn, Skeleton } from "@devdigest/ui";
import { useAgentSkills, useSetAgentSkills, useSkills } from "@/lib/hooks/skills";
import { skillTypeColor } from "@/lib/skill-type";
import { THREAT_COLOR, resolveSkillThreat } from "@/lib/skill-threat";
import { filterByName, moveSkill, toOrderedSkillIds } from "./helpers";
import { s } from "./styles";

export function SkillsTab({ agentId }: { agentId: string }) {
  const t = useTranslations("skills");
  const tAgents = useTranslations("agents");
  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: links, isLoading: linksLoading } = useAgentSkills(agentId);
  const setAgentSkills = useSetAgentSkills();

  const [draftOrder, setDraftOrder] = React.useState<string[] | null>(null);
  const [search, setSearch] = React.useState("");

  if (skillsLoading || linksLoading) return <Skeleton height={220} />;

  const all = skills ?? [];
  const byId = new Map(all.map((skill) => [skill.id, skill]));
  const attachedIds = (draftOrder ?? toOrderedSkillIds(links)).filter((id) => byId.has(id));
  const attachedSet = new Set(attachedIds);

  const apply = (next: string[]) => {
    setDraftOrder(next);
    setAgentSkills.mutate(
      { agentId, skillIds: next },
      { onError: () => setDraftOrder(null) },
    );
  };

  const available = filterByName(
    all.filter((skill) => !attachedSet.has(skill.id)),
    search,
  );

  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <h2 style={s.h2}>{tAgents("skills.title")}</h2>
        <span style={s.count}>
          {tAgents("skills.enabledCount", { linked: attachedIds.length, total: all.length })}
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={tAgents("skills.filterPlaceholder")}
          aria-label={tAgents("skills.filterPlaceholder")}
          style={s.filter}
        />
      </div>
      <p style={s.hint}>{tAgents("skills.orderHint")}</p>

      <div style={s.sectionLabel}>{t("agentTab.attached")}</div>
      {attachedIds.length === 0 && <p style={s.empty}>{t("agentTab.none")}</p>}
      <ol style={s.list} aria-label={t("agentTab.attached")}>
        {attachedIds.map((id, index) => {
          const skill = byId.get(id)!;
          return (
            <li key={id} style={s.row}>
              <span style={s.position}>{index + 1}</span>
              <span style={s.name}>{skill.name}</span>
              {!skill.enabled && <span style={s.disabledNote}>{t("agentTab.disabledHint")}</span>}
              <Badge
                color={skillTypeColor(skill.type).fg}
                bg={skillTypeColor(skill.type).bg}
                mono
              >
                {t(`listItem.type.${skill.type}`)}
              </Badge>
              {index > 0 && (
                <IconBtn
                  icon="ArrowUp"
                  size={26}
                  label={t("agentTab.moveUp", { name: skill.name })}
                  onClick={() => apply(moveSkill(attachedIds, index, index - 1))}
                />
              )}
              {index < attachedIds.length - 1 && (
                <IconBtn
                  icon="ArrowDown"
                  size={26}
                  label={t("agentTab.moveDown", { name: skill.name })}
                  onClick={() => apply(moveSkill(attachedIds, index, index + 1))}
                />
              )}
              <IconBtn
                icon="X"
                size={26}
                danger
                label={t("agentTab.detach", { name: skill.name })}
                onClick={() => apply(attachedIds.filter((other) => other !== id))}
              />
            </li>
          );
        })}
      </ol>

      <div style={s.sectionLabel}>{t("agentTab.available")}</div>
      {available.length === 0 && <p style={s.empty}>{t("agentTab.noneAvailable")}</p>}
      <ul style={s.list} aria-label={t("agentTab.available")}>
        {available.map((skill) => {
          const threat = resolveSkillThreat(skill);
          return (
          <li key={skill.id} style={threat.isBlocked ? s.blockedRow : s.row}>
            <span style={s.position} />
            <span style={s.name}>{skill.name}</span>
            {threat.isBlocked && (
              <Badge color={THREAT_COLOR.danger.fg} bg={THREAT_COLOR.danger.bg} icon="AlertTriangle">
                {t("threat.badgeDangerous")}
              </Badge>
            )}
            <Badge
              color={skillTypeColor(skill.type).fg}
              bg={skillTypeColor(skill.type).bg}
              mono
            >
              {t(`listItem.type.${skill.type}`)}
            </Badge>
            {threat.isBlocked ? (
              <span title={t("threat.attachBlocked")} style={s.blockedNote}>
                {t("threat.attachBlocked")}
              </span>
            ) : (
              <IconBtn
                icon="Plus"
                size={26}
                label={t("agentTab.attach", { name: skill.name })}
                onClick={() => apply([...attachedIds, skill.id])}
              />
            )}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
