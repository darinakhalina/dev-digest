"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { ConfigTab } from "../ConfigTab";
import { PreviewTab } from "../PreviewTab";
import { VersionsTab } from "../VersionsTab";
import { TABS } from "./constants";
import { s } from "./styles";

export interface SkillEditorProps {
  skill: Skill;
  tab: string;
  onTab: (tab: string) => void;
}

export function SkillEditor({ skill, tab, onTab }: SkillEditorProps) {
  const t = useTranslations("skills");
  const tabs = TABS.map((tb) => ({ key: tb.key, label: t(tb.labelKey), icon: tb.icon }));

  return (
    <div style={s.wrap}>
      <Tabs tabs={tabs} value={tab} onChange={onTab} pad="0 28px" />
      <div style={s.body}>
        {tab === "config" && <ConfigTab key={skill.id} skill={skill} />}
        {tab === "preview" && <PreviewTab key={skill.id} skill={skill} />}
        {tab === "versions" && <VersionsTab key={skill.id} skill={skill} />}
      </div>
    </div>
  );
}
