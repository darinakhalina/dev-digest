import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { Skill } from "@devdigest/shared";
import messages from "../../../../../../../../messages/en/skills.json";

const { updateMutate } = vi.hoisted(() => ({ updateMutate: vi.fn() }));

vi.mock("@/lib/hooks/skills", () => ({
  useUpdateSkill: () => ({ mutate: updateMutate, isPending: false }),
}));

vi.mock("@/lib/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

import { SkillForm } from "./SkillForm";

const SKILL: Skill = {
  id: "sk1",
  name: "Severity Rubric",
  description: "How to grade a finding",
  type: "rubric",
  source: "manual",
  body: "Critical means the change breaks production.",
  enabled: true,
  version: 1,
};

afterEach(() => {
  cleanup();
  updateMutate.mockClear();
});

function renderForm(skill: Skill = SKILL) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <SkillForm skill={skill} />
    </NextIntlClientProvider>,
  );
}

describe("SkillForm", () => {
  it("states that the description is the skill's interface, next to the field (AC-5)", () => {
    renderForm();
    expect(screen.getByText(messages.editor.descriptionCaption)).toBeInTheDocument();
  });

  it("sends the edited name, description, type and body when saved (AC-3)", () => {
    renderForm();

    fireEvent.change(screen.getByLabelText(/^Name/), {
      target: { value: "Severity Rubric v2" },
    });
    fireEvent.change(screen.getByLabelText(/^Description$/), {
      target: { value: "Use when grading a finding" },
    });
    fireEvent.change(screen.getByLabelText(/^Skill body/), {
      target: { value: "Critical means data loss." },
    });
    fireEvent.change(screen.getByLabelText(/^Type$/), {
      target: { value: "security" },
    });

    fireEvent.click(screen.getByRole("button", { name: messages.editor.save }));

    expect(updateMutate).toHaveBeenCalledTimes(1);
    expect(updateMutate.mock.calls[0]![0]).toEqual({
      id: "sk1",
      patch: {
        name: "Severity Rubric v2",
        description: "Use when grading a finding",
        type: "security",
        body: "Critical means data loss.",
      },
    });
  });

  it("flags an imported skill as untrusted", () => {
    renderForm({ ...SKILL, source: "imported_url" });
    expect(screen.getByText(messages.preview.untrustedNotice)).toBeInTheDocument();
  });
});
