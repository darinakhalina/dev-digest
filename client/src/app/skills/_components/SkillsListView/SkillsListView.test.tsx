import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

const SKILLS: Skill[] = [
  {
    id: "sk1",
    name: "Severity Rubric",
    description: "How to grade a finding",
    type: "rubric",
    source: "manual",
    body: "Critical means the change breaks production.",
    enabled: true,
    version: 1,
  },
  {
    id: "sk2",
    name: "Imported Test Rules",
    description: "Branch and boundary coverage",
    type: "custom",
    source: "imported_url",
    body: "Ask for the uncovered branch.",
    enabled: false,
    version: 1,
  },
];

const { updateMutate } = vi.hoisted(() => ({ updateMutate: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  useSkills: () => ({ data: SKILLS, isLoading: false, isError: false, refetch: vi.fn() }),
  useUpdateSkill: () => ({ mutate: updateMutate, isPending: false }),
  useDeleteSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useCreateSkill: () => ({ mutate: vi.fn(), isPending: false }),
  useImportSkillPreview: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock("@/components/app-shell", () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import { SkillsListView } from "./SkillsListView";

afterEach(() => {
  cleanup();
  updateMutate.mockClear();
});

function renderList() {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <SkillsListView />
    </NextIntlClientProvider>,
  );
}

describe("SkillsListView", () => {
  it("lists every skill as a card and opens a preview beside the list when one is picked", () => {
    renderList();

    expect(screen.getByRole("button", { name: "Severity Rubric" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imported Test Rules" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Severity Rubric" })).not.toBeInTheDocument();
    expect(screen.getByText(messages.page.selectPrompt.title)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Severity Rubric" }));

    const preview = screen.getByRole("region", { name: "Severity Rubric" });
    expect(within(preview).getByText("Critical means the change breaks production.")).toBeInTheDocument();
    expect(within(preview).getByText(messages.preview.enabled)).toBeInTheDocument();
    expect(within(preview).queryByText(messages.preview.untrustedNotice)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Imported Test Rules" }));

    const imported = screen.getByRole("region", { name: "Imported Test Rules" });
    expect(within(imported).getByText(messages.preview.untrustedNotice)).toBeInTheDocument();
  });

  it("filters the cards by the search box", () => {
    renderList();

    fireEvent.change(screen.getByRole("textbox", { name: messages.page.searchPlaceholder }), {
      target: { value: "imported" },
    });

    expect(screen.queryByRole("button", { name: "Severity Rubric" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Imported Test Rules" })).toBeInTheDocument();
  });
});
