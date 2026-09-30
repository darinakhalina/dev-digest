"use client";

import React from "react";
import { Icon, IconBtn, Toggle, type IconName } from "@devdigest/ui";
import { s } from "./styles";

export interface RailCardProps {
  icon: IconName;
  name: string;
  mono?: boolean;
  description: string;
  active: boolean;
  enabled: boolean;
  onSelect: () => void;
  onToggle?: (enabled: boolean) => void;
  toggleLabel: string;
  onDelete?: () => void;
  deleteLabel: string;
  badges?: React.ReactNode;
  footer?: React.ReactNode;
  accent?: string;
  toggleDisabled?: boolean;
  toggleDisabledReason?: string;
}

export function RailCard({
  icon,
  name,
  mono,
  description,
  active,
  enabled,
  onSelect,
  onToggle,
  toggleLabel,
  onDelete,
  deleteLabel,
  badges,
  footer,
  accent,
  toggleDisabled,
  toggleDisabledReason,
}: RailCardProps) {
  const I = Icon[icon];

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active ? "true" : undefined}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      style={s.card(active, enabled, accent)}
    >
      <div style={s.headerRow}>
        <span style={s.iconBox}>
          <I size={15} />
        </span>
        <span className={mono ? "mono" : undefined} style={s.name}>
          {name}
        </span>
        {onToggle && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={toggleDisabled ? s.toggleOff : undefined}
            {...(toggleDisabled ? { "aria-disabled": true, title: toggleDisabledReason } : {})}
          >
            <Toggle
              on={enabled}
              onChange={(next) => {
                if (toggleDisabled) return;
                onToggle(next);
              }}
              size={16}
              label={toggleLabel}
            />
          </div>
        )}
      </div>

      <div style={s.description}>{description}</div>

      {badges && <div style={s.badgeRow}>{badges}</div>}

      <div style={s.footer}>
        <span style={s.footerText}>{footer}</span>
        {onDelete && (
          <span onClick={(e) => e.stopPropagation()}>
            <IconBtn icon="Trash" label={deleteLabel} size={24} danger onClick={onDelete} />
          </span>
        )}
      </div>
    </div>
  );
}
