import { AgentsView } from "../_components/AgentsView";

export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentsView selectedId={id} />;
}
