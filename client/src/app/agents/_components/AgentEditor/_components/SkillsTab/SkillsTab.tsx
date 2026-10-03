"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Badge, Icon, IconBtn, Skeleton } from "@devdigest/ui";
import { useAgentSkills, useSetAgentSkills, useSkills } from "@/lib/hooks/skills";
import { skillTypeColor } from "@/lib/skill-type";
import { THREAT_COLOR, resolveSkillThreat } from "@/lib/skill-threat";
import {
  ATTACHED_ZONE,
  AVAILABLE_ZONE,
  filterByName,
  moveSkill,
  resolveDrop,
  toOrderedSkillIds,
} from "./helpers";
import { SortableRow } from "./SortableRow";
import { s } from "./styles";

const HOLD_TO_LIFT_MS = 180;

const DROP_ANIMATION = {
  duration: 180,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

export function SkillsTab({ agentId }: { agentId: string }) {
  const t = useTranslations("skills");
  const tAgents = useTranslations("agents");
  const { data: skills, isLoading: skillsLoading } = useSkills();
  const { data: links, isLoading: linksLoading } = useAgentSkills(agentId);
  const setAgentSkills = useSetAgentSkills();

  const [draftOrder, setDraftOrder] = React.useState<string[] | null>(null);
  const [search, setSearch] = React.useState("");
  const [activeId, setActiveId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: HOLD_TO_LIFT_MS, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (skillsLoading || linksLoading) return <Skeleton height={220} />;

  const all = skills ?? [];
  const byId = new Map(all.map((skill) => [skill.id, skill]));
  const attachedIds = (draftOrder ?? toOrderedSkillIds(links)).filter((id) => byId.has(id));
  const attachedSet = new Set(attachedIds);

  const apply = (next: string[]) => {
    setDraftOrder(next);
    setAgentSkills.mutate({ agentId, skillIds: next }, { onError: () => setDraftOrder(null) });
  };

  const available = filterByName(
    all.filter((skill) => !attachedSet.has(skill.id)),
    search,
  );
  const availableIds = available
    .filter((skill) => !resolveSkillThreat(skill).isBlocked)
    .map((skill) => skill.id);

  const onDragStart = ({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
    document.body.style.cursor = "grabbing";
  };

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    document.body.style.cursor = "";
    const next = resolveDrop(attachedIds, String(active.id), over ? String(over.id) : null);
    if (next) apply(next);
  };

  const onDragCancel = () => {
    setActiveId(null);
    document.body.style.cursor = "";
  };

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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        modifiers={[restrictToVerticalAxis]}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
      >
        <div style={s.sectionLabel}>{t("agentTab.attached")}</div>
        {attachedIds.length === 0 && <p style={s.empty}>{t("agentTab.none")}</p>}
        <DropZone id={ATTACHED_ZONE} label={t("agentTab.attached")} ordered>
          <SortableContext items={attachedIds} strategy={verticalListSortingStrategy}>
            {attachedIds.map((id, index) => {
              const skill = byId.get(id)!;
              return (
                <SortableRow
                  key={id}
                  id={id}
                  dimmed={!skill.enabled}
                  handleLabel={tAgents("skills.dragHandle", { name: skill.name })}
                >
                  <span style={s.position}>{index + 1}</span>
                  <span style={s.name}>{skill.name}</span>
                  {!skill.enabled && (
                    <span style={s.disabledNote}>{t("agentTab.disabledHint")}</span>
                  )}
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
                </SortableRow>
              );
            })}
          </SortableContext>
        </DropZone>

        <div style={s.sectionLabel}>{t("agentTab.available")}</div>
        {available.length === 0 && <p style={s.empty}>{t("agentTab.noneAvailable")}</p>}
        <DropZone id={AVAILABLE_ZONE} label={t("agentTab.available")}>
          <SortableContext items={availableIds} strategy={verticalListSortingStrategy}>
            {available.map((skill) => {
              const threat = resolveSkillThreat(skill);
              return (
                <SortableRow
                  key={skill.id}
                  id={skill.id}
                  draggable={!threat.isBlocked}
                  handleLabel={tAgents("skills.dragHandle", { name: skill.name })}
                >
                  <span style={s.name}>{skill.name}</span>
                  {threat.isBlocked && (
                    <Badge
                      color={THREAT_COLOR.danger.fg}
                      bg={THREAT_COLOR.danger.bg}
                      icon="AlertTriangle"
                    >
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
                </SortableRow>
              );
            })}
          </SortableContext>
        </DropZone>
        <DragOverlay dropAnimation={DROP_ANIMATION}>
          {activeId ? (
            <div style={s.overlayRow}>
              <span style={s.handle(true)}>
                <Icon.Menu size={14} />
              </span>
              <span style={s.name}>{byId.get(activeId)?.name}</span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function DropZone({
  id,
  label,
  ordered = false,
  children,
}: {
  id: string;
  label: string;
  ordered?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const style = { ...s.list, ...(isOver ? s.listOver : null) };
  return ordered ? (
    <ol ref={setNodeRef} style={style} aria-label={label}>
      {children}
    </ol>
  ) : (
    <ul ref={setNodeRef} style={style} aria-label={label}>
      {children}
    </ul>
  );
}
