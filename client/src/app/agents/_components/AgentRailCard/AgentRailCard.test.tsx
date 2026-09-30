import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Agent } from "@devdigest/shared";
import messages from "../../../../../messages/en/agents.json";
import { AgentRailCard } from "./AgentRailCard";

afterEach(cleanup);

const AGENT: Agent = {
  id: "ag1",
  name: "Security Reviewer",
  description: "Flags secrets and injection",
  provider: "openai",
  model: "gpt-4.1",
  system_prompt: "You are a security reviewer.",
  output_schema: null,
  strategy: "single-pass",
  ci_fail_on: "critical",
  repo_intel: true,
  enabled: true,
  version: 1,
  skill_count: 3,
};

function renderCard(over: Partial<Agent> = {}, props: Partial<React.ComponentProps<typeof AgentRailCard>> = {}) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
      <AgentRailCard
        agent={{ ...AGENT, ...over }}
        active={false}
        onSelect={props.onSelect ?? vi.fn()}
        onToggle={props.onToggle ?? vi.fn()}
        onDelete={props.onDelete ?? vi.fn()}
      />
    </NextIntlClientProvider>,
  );
}

describe("AgentRailCard", () => {
  it("shows the model and how many skills the agent carries", () => {
    renderCard();
    expect(screen.getByText("gpt-4.1")).toBeInTheDocument();
    expect(screen.getByText("3 skills")).toBeInTheDocument();
  });

  it("says 'no skills' rather than '0 skills' for an agent with none", () => {
    renderCard({ skill_count: 0 });
    expect(screen.getByText("no skills")).toBeInTheDocument();
  });

  it("uses the singular for exactly one skill", () => {
    renderCard({ skill_count: 1 });
    expect(screen.getByText("1 skill")).toBeInTheDocument();
  });

  it("falls back to a translated placeholder when the description is empty", () => {
    renderCard({ description: "" });
    expect(screen.getByText("No description")).toBeInTheDocument();
  });

  it("opens the agent when the card body is clicked, not only its title", () => {
    const onSelect = vi.fn();
    renderCard({}, { onSelect });
    fireEvent.click(screen.getByText("Flags secrets and injection"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("keeps the toggle and the delete control from opening the agent", () => {
    const onSelect = vi.fn();
    const onToggle = vi.fn();
    const onDelete = vi.fn();
    renderCard({}, { onSelect, onToggle, onDelete });

    fireEvent.click(screen.getByRole("switch"));
    fireEvent.click(screen.getByRole("button", { name: "Delete Security Reviewer" }));

    expect(onToggle).toHaveBeenCalledWith(false);
    expect(onDelete).toHaveBeenCalledOnce();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
