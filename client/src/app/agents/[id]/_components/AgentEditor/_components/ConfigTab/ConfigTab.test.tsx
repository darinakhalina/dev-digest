import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Agent } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/agents.json";

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("../../../../../../../lib/hooks/agents", () => ({
  useUpdateAgent: () => ({ mutate, isPending: false, isSuccess: false }),
  useProviderModels: () => ({ data: [] }),
}));
vi.mock("../../../../../../../lib/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

import { ConfigTab } from "./ConfigTab";

afterEach(() => {
  cleanup();
  mutate.mockClear();
});

const AGENT = {
  id: "a1",
  name: "Security",
  description: "d",
  provider: "openai",
  model: "gpt-4.1",
  system_prompt: "sys",
  strategy: "auto",
  ci_fail_on: "critical",
  repo_intel: true,
  enabled: true,
  version: 1,
} as unknown as Agent;

function renderTab(agent: Agent) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
      <ConfigTab agent={agent} />
    </NextIntlClientProvider>,
  );
}

describe("ConfigTab — SPEC-2026-09-25-pr-page-bugs", () => {
  it("shows an enabled flag changed elsewhere, and saving does not send the old value back", () => {
    const { rerender } = renderTab(AGENT);
    rerender(
      <NextIntlClientProvider locale="en" messages={{ agents: messages }}>
        <ConfigTab agent={{ ...AGENT, enabled: false }} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("switch")[0]).toHaveAttribute("aria-checked", "false");

    fireEvent.click(screen.getByRole("button", { name: messages.config.save }));
    const patch = mutate.mock.calls.at(-1)![0].patch;
    expect(patch.enabled).not.toBe(true);
  });
});
