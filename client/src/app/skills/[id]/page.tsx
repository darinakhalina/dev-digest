import { SkillsView } from "../_components/SkillsView";

export default async function SkillPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SkillsView selectedId={id} />;
}
