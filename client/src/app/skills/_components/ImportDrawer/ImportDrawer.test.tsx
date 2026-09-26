import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { SkillImportPreview } from "@devdigest/shared";
import messages from "../../../../../messages/en/skills.json";

const PROPOSAL: SkillImportPreview = {
  name: "Test Quality Rubric",
  description: "Use when a diff changes tests",
  type: "rubric",
  source: "imported_url",
  body: "Name the uncovered branch.",
  ignored_files: ["install.sh", "assets/logo.png"],
};

const { previewMutateAsync, createMutate } = vi.hoisted(() => ({
  previewMutateAsync: vi.fn(),
  createMutate: vi.fn(),
}));

vi.mock("@/lib/hooks/skills", () => ({
  useImportSkillPreview: () => ({ mutateAsync: previewMutateAsync, isPending: false }),
  useCreateSkill: () => ({ mutate: createMutate, isPending: false }),
}));

vi.mock("@/lib/toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn(), toast: vi.fn() }),
}));

import { ImportDrawer } from "./ImportDrawer";

afterEach(() => {
  cleanup();
  previewMutateAsync.mockReset();
  createMutate.mockReset();
});

function renderDrawer(onClose = vi.fn()) {
  render(
    <NextIntlClientProvider locale="en" messages={{ skills: messages }}>
      <ImportDrawer onClose={onClose} />
    </NextIntlClientProvider>,
  );
  return onClose;
}

function pick(name: string, contents = "# Rule\nBody") {
  const input = screen.getByLabelText(/^File/);
  fireEvent.change(input, { target: { files: [new File([contents], name)] } });
}

describe("ImportDrawer", () => {
  it("shows what the file proposes, names the ignored entries, and stores nothing until confirmed (AC-16, AC-17, AC-20)", async () => {
    previewMutateAsync.mockResolvedValue(PROPOSAL);
    const onClose = renderDrawer();

    pick("test-quality.zip");

    expect(await screen.findByText(PROPOSAL.name)).toBeInTheDocument();
    expect(screen.getByText(PROPOSAL.body)).toBeInTheDocument();
    expect(screen.getByText(messages.file.nothingStored)).toBeInTheDocument();
    expect(screen.getByText("install.sh")).toBeInTheDocument();
    expect(screen.getByText("assets/logo.png")).toBeInTheDocument();
    expect(screen.getByText(messages.file.ignoredHint)).toBeInTheDocument();
    expect(screen.getByText(messages.file.disabledNotice)).toBeInTheDocument();

    expect(createMutate).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: messages.file.confirm }));

    expect(createMutate).toHaveBeenCalledTimes(1);
    expect(createMutate.mock.calls[0]![0]).toEqual({
      name: PROPOSAL.name,
      description: PROPOSAL.description,
      type: PROPOSAL.type,
      source: PROPOSAL.source,
      body: PROPOSAL.body,
      enabled: false,
    });
  });

  it("refuses a file that is neither a markdown document nor an archive, naming what it accepts (AC-21)", async () => {
    renderDrawer();

    pick("payload.sh");

    expect(await screen.findByRole("alert")).toHaveTextContent(messages.file.unsupported);
    expect(previewMutateAsync).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: messages.file.confirm })).toBeDisabled();
  });

  it("surfaces a rejected import instead of proposing anything", async () => {
    previewMutateAsync.mockRejectedValue(new Error("Archive expands to 90 MB"));
    renderDrawer();

    pick("huge.zip");

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Archive expands to 90 MB"),
    );
    expect(screen.queryByText(messages.file.proposalTitle)).not.toBeInTheDocument();
  });
});
