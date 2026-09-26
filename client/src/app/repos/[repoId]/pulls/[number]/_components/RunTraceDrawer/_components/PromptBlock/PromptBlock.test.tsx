import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import runs from "../../../../../../../../../../messages/en/runs.json";
import { PromptBlock } from "./PromptBlock";

afterEach(cleanup);

function renderWithIntl(ui: React.ReactElement) {
  return render(<NextIntlClientProvider locale="en" messages={{ runs }}>{ui}</NextIntlClientProvider>);
}

describe("PromptBlock keyboard — SPEC-2026-09-25-accessibility", () => {
  it("is reachable and toggleable by keyboard", () => {
    renderWithIntl(<PromptBlock label="System" text="hello" color="#000" />);
    const header = screen.getByRole("button", { name: /System/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("hello")).not.toBeInTheDocument();

    header.focus();
    fireEvent.keyDown(header, { key: "Enter" });

    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("hello")).toBeInTheDocument();
  });

  it("does not toggle when Enter is pressed on a nested action button", () => {
    renderWithIntl(<PromptBlock label="System" text="hello" color="#000" />);
    const header = screen.getByRole("button", { name: /System/ });
    const copyBtn = screen.getByRole("button", { name: /copy/i });

    fireEvent.keyDown(copyBtn, { key: "Enter" });

    expect(header).toHaveAttribute("aria-expanded", "false");
  });
});
