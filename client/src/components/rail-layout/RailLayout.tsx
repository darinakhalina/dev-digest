"use client";

import React from "react";
import { Icon, Skeleton, type IconName } from "@devdigest/ui";
import { s } from "./styles";

export function RailLayout({ children }: { children: React.ReactNode }) {
  return <div style={s.split}>{children}</div>;
}

export interface RailProps {
  title: string;
  action?: React.ReactNode;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  children: React.ReactNode;
}

export function Rail({ title, action, search, onSearch, searchPlaceholder, children }: RailProps) {
  return (
    <div style={s.rail}>
      <div style={s.railHead}>
        <div style={s.railTitleRow}>
          <h1 style={s.railTitle}>{title}</h1>
          {action}
        </div>
        <div style={s.search}>
          <Icon.Search size={13} style={s.searchIcon} />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            style={s.searchInput}
          />
        </div>
      </div>
      <div style={s.railList}>{children}</div>
    </div>
  );
}

export function RailListSkeleton({ rows = 3, height = 104 }: { rows?: number; height?: number }) {
  return (
    <div style={s.railSkeleton}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}

export interface DetailPaneProps {
  icon: IconName;
  title: string;
  mono?: boolean;
  badges?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function DetailPane({ icon, title, mono, badges, action, children }: DetailPaneProps) {
  const I = Icon[icon];
  return (
    <div style={s.detailPane}>
      <div style={s.detailHead}>
        <I size={18} style={s.detailIcon} />
        <h1 className={mono ? "mono" : undefined} style={s.detailTitle}>
          {title}
        </h1>
        {badges}
        <span style={s.headSpacer} />
        {action}
      </div>
      {children}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div style={s.detailSkeleton}>
      <Skeleton height={24} width={240} />
      <Skeleton height={200} />
    </div>
  );
}

export function DetailPlaceholder({ children }: { children: React.ReactNode }) {
  return <div style={s.placeholder}>{children}</div>;
}
