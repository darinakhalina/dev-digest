"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Badge, Icon } from "@devdigest/ui";
import { CHARS_PER_TOKEN, s } from "./styles";

export interface SkillBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  filename: string;
  id?: string;
}

export function SkillBodyEditor({
  value,
  onChange,
  filename,
  id,
}: SkillBodyEditorProps) {
  const t = useTranslations("conventions.modal");
  const gutterRef = React.useRef<HTMLDivElement>(null);
  const lineCount = value.split("\n").length;
  const tokens = Math.round(value.length / CHARS_PER_TOKEN);

  return (
    <div style={s.frame}>
      <div style={s.head}>
        <Icon.FileText size={14} style={s.headIcon} />
        <span className="mono" style={s.filename}>
          {filename}
        </span>
        <Badge color="var(--text-muted)">{t("unsaved")}</Badge>
        <span className="mono" style={s.tokens}>
          {t("tokens", { count: tokens.toLocaleString() })}
        </span>
      </div>

      <div style={s.body}>
        <div ref={gutterRef} style={s.gutter} aria-hidden>
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i} className="mono" style={s.lineNo}>
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          id={id}
          className="mono"
          value={value}
          spellCheck={false}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            if (gutterRef.current) {
              gutterRef.current.scrollTop = e.currentTarget.scrollTop;
            }
          }}
          style={s.textarea}
        />
      </div>
    </div>
  );
}
