import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { AgentSkillLink, Skill } from "@devdigest/shared";
import skillMessages from "../../../../../../../messages/en/skills.json";
import agentMessages from "../../../../../../../messages/en/agents.json";

const SKILLS: Skill[] = [
  { id: "sk1", name: "Severity Rubric", description: "", type: "rubric", source: "manual", body: "a", enabled: true, version: 1, threat_level: "safe", threat_signals: [] },
  { id: "sk2", name: "House Conventions", description: "", type: "convention", source: "manual", body: "b", enabled: true, version: 1, threat_level: "safe", threat_signals: [] },
  { id: "sk3", name: "Imported Test Rules", description: "", type: "custom", source: "imported_url", body: "c", enabled: false, version: 1, threat_level: "safe", threat_signals: [] },
  { id: "sk4", name: "Hijacked Rules", description: "", type: "custom", source: "imported_url", body: "d", enabled: false, version: 1, threat_level: "dangerous", threat_signals: [], threat_accepted_at: null },
];

const LINKS: AgentSkillLink[] = [
  { agent_id: "ag1", skill_id: "sk2", order: 1 },
  { agent_id: "ag1", skill_id: "sk1", order: 0 },
];

const { setAgentSkillsMutate } = vi.hoisted(() => ({ setAgentSkillsMutate: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: SKILLS, isLoading: false }),
  useAgentSkills: () => ({ data: LINKS, isLoading: false }),
  useSetAgentSkills: () => ({ mutate: setAgentSkillsMutate, isPending: false }),
}));

import { SkillsTab } from "./SkillsTab";

afterEach(() => {
  cleanup();
  setAgentSkillsMutate.mockClear();
});

function renderTab() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: skillMessages, agents: agentMessages }}>
      <SkillsTab agentId="ag1" />
    </NextIntlClientProvider>,
  );
}

function attachedNames(): string[] {
  const list = screen.getByRole("list", { name: skillMessages.agentTab.attached });
  return within(list)
    .getAllByRole("listitem")
    .map((row) => row.children[2]!.textContent ?? "");
}

function rows(label: string) {
  return within(screen.getByRole("list", { name: label })).getAllByRole("listitem");
}


describe("SkillsTab", () => {
  it("lists the attached skills in their stored order and says the order drives the prompt", () => {
    renderTab();

    expect(attachedNames()).toEqual(["Severity Rubric", "House Conventions"]);
    expect(screen.getByText(agentMessages.skills.orderHint)).toBeInTheDocument();
    expect(screen.getByText("2 of 4 enabled")).toBeInTheDocument();
  });

  it("reorders an attached skill and sends the whole new order (AC-6)", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Move House Conventions earlier in the prompt" }));

    expect(setAgentSkillsMutate).toHaveBeenCalledTimes(1);
    expect(setAgentSkillsMutate.mock.calls[0]![0]).toEqual({
      agentId: "ag1",
      skillIds: ["sk2", "sk1"],
    });
    expect(attachedNames()).toEqual(["House Conventions", "Severity Rubric"]);
  });

  it("attaches an available skill at the end and detaches without touching the others (AC-8)", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Attach Imported Test Rules" }));
    expect(setAgentSkillsMutate.mock.calls[0]![0].skillIds).toEqual(["sk1", "sk2", "sk3"]);

    fireEvent.click(screen.getByRole("button", { name: "Detach Severity Rubric" }));
    expect(setAgentSkillsMutate.mock.calls[1]![0].skillIds).toEqual(["sk2", "sk3"]);
    expect(attachedNames()).toEqual(["House Conventions", "Imported Test Rules"]);
  });

  it("marks an attached skill that is disabled workspace-wide", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Attach Imported Test Rules" }));

    const disabled = screen.getByText(skillMessages.agentTab.disabledHint);
    expect(within(disabled.parentElement!).getByText("Imported Test Rules")).toBeInTheDocument();
  });

  it("gives every movable row a drag handle, and a flagged skill none", () => {
    renderTab();

    const attached = rows(skillMessages.agentTab.attached);
    for (const row of attached) {
      expect(within(row).queryByLabelText(/^Drag /)).not.toBeNull();
    }

    const available = rows(skillMessages.agentTab.available);
    const blocked = available.find((row) => row.textContent?.includes("Hijacked Rules"))!;
    const movable = available.find((row) => row.textContent?.includes("Imported Test Rules"))!;
    expect(within(blocked).queryByLabelText(/^Drag /)).toBeNull();
    expect(within(blocked).queryByRole("button", { name: /^Attach / })).toBeNull();
    expect(within(movable).queryByLabelText(/^Drag /)).not.toBeNull();
  });

  it("dims an attached skill that is disabled workspace-wide but keeps it movable", () => {
    renderTab();

    fireEvent.click(screen.getByRole("button", { name: "Attach Imported Test Rules" }));

    const attached = rows(skillMessages.agentTab.attached);
    const disabled = attached[2]!;
    expect(within(disabled).getByText(skillMessages.agentTab.disabledHint)).toBeInTheDocument();
    expect(within(disabled).queryByLabelText(/^Drag /)).not.toBeNull();
  });
});
