"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@devdigest/ui";
import { s } from "./styles";

export interface SortableRowProps {
  id: string;
  handleLabel: string;
  dimmed?: boolean;
  blocked?: boolean;
  draggable?: boolean;
  children: React.ReactNode;
}

export function SortableRow({
  id,
  handleLabel,
  dimmed = false,
  blocked = false,
  draggable = true,
  children,
}: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: !draggable,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        ...s.attachedRow(isDragging, dimmed),
        ...(blocked ? s.blockedRow : null),
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      {draggable ? (
        <span style={s.handle(isDragging)} aria-label={handleLabel} {...attributes} {...listeners}>
          <Icon.Menu size={14} />
        </span>
      ) : (
        <span style={s.position} />
      )}
      {children}
    </li>
  );
}
