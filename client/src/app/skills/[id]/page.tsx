"use client";

import { useParams } from "next/navigation";
import { SkillEditor } from "./_components/SkillEditor";

export default function SkillEditorPage() {
  const { id } = useParams<{ id: string }>();
  return <SkillEditor skillId={id} />;
}
