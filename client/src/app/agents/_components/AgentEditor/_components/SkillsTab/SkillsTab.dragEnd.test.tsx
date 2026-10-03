import { describe, it, expect, afterEach, vi } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { DragEndEvent } from "@dnd-kit/core";
import type { AgentSkillLink, Skill } from "@devdigest/shared";
import skillMessages from "../../../../../../../messages/en/skills.json";
import agentMessages from "../../../../../../../messages/en/agents.json";

const SKILLS: Skill[] = [
  { id: "sk1", name: "One", description: "", type: "rubric", source: "manual", body: "a", enabled: true, version: 1, threat_level: "safe", threat_signals: [] },
  { id: "sk2", name: "Two", description: "", type: "rubric", source: "manual", body: "b", enabled: true, version: 1, threat_level: "safe", threat_signals: [] },
  { id: "sk3", name: "Three", description: "", type: "custom", source: "manual", body: "c", enabled: true, version: 1, threat_level: "safe", threat_signals: [] },
];

const LINKS: AgentSkillLink[] = [
  { agent_id: "ag1", skill_id: "sk1", order: 0 },
  { agent_id: "ag1", skill_id: "sk2", order: 1 },
];

const { setAgentSkillsMutate, captured } = vi.hoisted(() => ({
  setAgentSkillsMutate: vi.fn(),
  captured: { onDragEnd: null as ((e: DragEndEvent) => void) | null },
}));

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: SKILLS, isLoading: false }),
  useAgentSkills: () => ({ data: LINKS, isLoading: false }),
  useSetAgentSkills: () => ({ mutate: setAgentSkillsMutate, isPending: false }),
}));

vi.mock("@dnd-kit/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@dnd-kit/core")>();
  return {
    ...actual,
    DndContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (e: DragEndEvent) => void }) => {
      captured.onDragEnd = onDragEnd;
      return <>{children}</>;
    },
  };
});

import { SkillsTab } from "./SkillsTab";
import { ATTACHED_ZONE, AVAILABLE_ZONE } from "./helpers";

afterEach(() => {
  cleanup();
  setAgentSkillsMutate.mockClear();
  captured.onDragEnd = null;
});

function renderTab() {
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: skillMessages, agents: agentMessages }}>
      <SkillsTab agentId="ag1" />
    </NextIntlClientProvider>,
  );
}

function drop(activeId: string, overId: string | null, draggedTop = 0, overTop = 0) {
  act(() => {
    captured.onDragEnd!({
      active: { id: activeId, rect: { current: { translated: { top: draggedTop } } } },
      over: overId === null ? null : { id: overId, rect: { top: overTop } },
    } as unknown as DragEndEvent);
  });
}

describe("SkillsTab — what a finished drag actually sends", () => {
  it("sends the whole new order when an attached row is dropped on another", () => {
    renderTab();
    drop("sk2", "sk1");

    expect(setAgentSkillsMutate).toHaveBeenCalledTimes(1);
    expect(setAgentSkillsMutate.mock.calls[0]![0]).toEqual({
      agentId: "ag1",
      skillIds: ["sk2", "sk1"],
    });
  });

  it("sends the shortened order when an attached row is dropped on the available list", () => {
    renderTab();
    drop("sk1", AVAILABLE_ZONE);

    expect(setAgentSkillsMutate.mock.calls[0]![0].skillIds).toEqual(["sk2"]);
  });

  it("inserts an available skill before the row it was dropped on", () => {
    renderTab();
    drop("sk3", "sk2");

    expect(setAgentSkillsMutate.mock.calls[0]![0].skillIds).toEqual(["sk1", "sk3", "sk2"]);
  });

  it("inserts after the row when the drag came from above it", () => {
    renderTab();
    drop("sk3", "sk2", 200, 100);

    expect(setAgentSkillsMutate.mock.calls[0]![0].skillIds).toEqual(["sk1", "sk2", "sk3"]);
  });

  it("appends when an available skill is dropped on the list rather than a row", () => {
    renderTab();
    drop("sk3", ATTACHED_ZONE);

    expect(setAgentSkillsMutate.mock.calls[0]![0].skillIds).toEqual(["sk1", "sk2", "sk3"]);
  });

  it("sends nothing when the drag ends outside every zone", () => {
    renderTab();
    drop("sk2", null);

    expect(setAgentSkillsMutate).not.toHaveBeenCalled();
  });
});
