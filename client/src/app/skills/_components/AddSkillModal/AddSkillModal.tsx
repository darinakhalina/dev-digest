"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Modal, Tabs } from "@devdigest/ui";
import type { Skill } from "@devdigest/shared";
import { CreateTab } from "./_components/CreateTab";
import { FileTab } from "./_components/FileTab";
import { UrlTab } from "./_components/UrlTab";
import { ADD_TABS, MODAL_WIDTH, type AddTab } from "./constants";
import { s } from "./styles";

export interface AddSkillModalProps {
  initialTab?: AddTab;
  onClose: () => void;
  onCreated: (skill: Skill) => void;
}

export function AddSkillModal({ initialTab = "create", onClose, onCreated }: AddSkillModalProps) {
  const t = useTranslations("skills");
  const [tab, setTab] = React.useState<AddTab>(initialTab);

  const tabs = ADD_TABS.map((tb) => ({ key: tb.key, label: t(tb.labelKey), icon: tb.icon }));

  return (
    <Modal width={MODAL_WIDTH} title={t("add.title")} onClose={onClose}>
      <div style={s.tabsBar}>
        <Tabs tabs={tabs} value={tab} onChange={(next) => setTab(next as AddTab)} pad="0 24px" />
      </div>
      <div style={s.body}>
        {tab === "create" && <CreateTab onCreated={onCreated} />}
        {tab === "file" && <FileTab onCreated={onCreated} />}
        {tab === "url" && <UrlTab onCreated={onCreated} />}
      </div>
    </Modal>
  );
}
